/*
 * PlainPage engine. Pure, deterministic, offline functions for the studio.
 * Every formula here is the published one, cited in NOTES.md and in the page
 * footer. Loaded after data.js. Sets root.PlainPage functions and exports for
 * Node tests.
 */
(function (root) {
  'use strict';

  let data;
  if (typeof module !== 'undefined' && module.exports) {
    data = require('./data.js');
  } else {
    data = (root.PlainPage && root.PlainPage.data) || {};
  }

  /* ---------- number helpers ---------- */

  function fmt(x) {
    if (x === null || x === undefined || !isFinite(x)) return '0.0';
    return (Math.round(x * 10) / 10).toFixed(1);
  }

  function round1(x) {
    return Math.round(x * 10) / 10;
  }

  function capitalizeFirst(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function lowerFirstUnlessI(s) {
    if (!s) return s;
    const first = s.split(/\s+/, 1)[0];
    if (first === 'I' || first === "I'm") return s;
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  /* ---------- sentence and word tokenization ---------- */

  // Periods inside decimals and after common abbreviations do not end a
  // sentence. We swap them for a private placeholder before splitting.
  function splitSentences(text) {
    if (!text) return [];
    let t = String(text);
    t = t.replace(/(\d)\.(\d)/g, '$1\u0001$2');
    t = t.replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|approx|Inc|Dept|Ave)\.\s/g, '$1\u0001 ');
    const parts = t.split(/(?<=[.!?])\s+|\n+/);
    const out = [];
    for (let i = 0; i < parts.length; i++) {
      const restored = parts[i].replace(/\u0001/g, '.').trim();
      if (restored) out.push(restored);
    }
    return out;
  }

  // Hyphenated compounds count as their parts, which is how the published
  // formulas treat them in practice.
  function words(text) {
    if (!text) return [];
    const t = String(text).replace(/[-]/g, ' ');
    const matches = t.match(/[A-Za-z0-9'\u2019]+/g);
    return matches ? matches : [];
  }

  /* ---------- syllable counter ---------- */

  // The classic vowel group counter with two documented repairs: a hiatus
  // bonus for the pairs ia and ua when they really hold two beats, and a
  // small exception lexicon for words English spells dishonestly.
  const SYLLABLE_EXCEPTIONS = {
    australian: 4,
    business: 2,
    chocolate: 2,
    evening: 2,
    every: 2,
    money: 2,
    honey: 2,
    monkey: 2,
    poem: 2,
    quiet: 2,
    science: 2,
    being: 2,
    create: 2,
    idea: 3,
    area: 3,
    real: 2,
    recipe: 3
  };

  function syllables(rawWord) {
    const word = String(rawWord || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return 0;
    if (Object.prototype.hasOwnProperty.call(SYLLABLE_EXCEPTIONS, word)) {
      return SYLLABLE_EXCEPTIONS[word];
    }
    if (word.length <= 2) return 1;
    const groups = word.match(/[aeiouy]+/g);
    if (!groups) return 1;
    let count = groups.length;
    // ia and ua inside one group often carry two beats (piano, graduation),
    // unless a sibilant or the -tion family absorbed them (special, Asia,
    // initial, actual, usual).
    const hiatus = word.match(/(?<![cst])ia|(?<![cs])ua/g);
    if (hiatus) count += hiatus.length;
    if (/e$/.test(word) && !/le$/.test(word) && count > 1) count -= 1;
    return Math.max(count, 1);
  }

  /* ---------- Dale-Chall familiar word set ---------- */

  let daleSetCache = null;
  function daleSet() {
    if (daleSetCache) return daleSetCache;
    const set = new Set();
    const list = String(data.daleChallList || '').split(/\s+/);
    for (let i = 0; i < list.length; i++) {
      if (list[i]) set.add(list[i].toLowerCase());
    }
    daleSetCache = set;
    return set;
  }

  // Accept plain inflections of familiar words: plurals, ed, ing, ly.
  function isFamiliar(word) {
    const set = daleSet();
    const w = String(word || '').toLowerCase().replace(/[^a-z']/g, '');
    if (!w) return true;
    if (set.has(w)) return true;
    if (/ies$/.test(w) && set.has(w.slice(0, -3) + 'y')) return true;
    if (/es$/.test(w) && (set.has(w.slice(0, -2)) || set.has(w.slice(0, -1)))) return true;
    if (/[^s]s$/.test(w) && set.has(w.slice(0, -1))) return true;
    if (/ing$/.test(w)) {
      const base = w.slice(0, -3);
      if (set.has(base) || set.has(base + 'e')) return true;
      if (base.length > 2 && base.charAt(base.length - 1) === base.charAt(base.length - 2) && set.has(base.slice(0, -1))) return true;
    }
    if (/ed$/.test(w)) {
      const base2 = w.slice(0, -2);
      const base1 = w.slice(0, -1);
      if (set.has(base2) || set.has(base1)) return true;
      if (base2.length > 2 && base2.charAt(base2.length - 1) === base2.charAt(base2.length - 2) && set.has(base2.slice(0, -1))) return true;
    }
    if (/ly$/.test(w) && set.has(w.slice(0, -2))) return true;
    return false;
  }

  /* ---------- core statistics ---------- */

  function analyze(text) {
    const sents = splitSentences(text);
    const ws = words(text);
    const syl = ws.map(function (w) { return syllables(w); });
    let syllableTotal = 0;
    let big = 0;
    let difficult = 0;
    for (let i = 0; i < ws.length; i++) {
      syllableTotal += syl[i];
      if (syl[i] >= 3) big += 1;
      if (!isFamiliar(ws[i])) difficult += 1;
    }
    const wordCount = ws.length;
    const sentenceCount = sents.length;
    const asl = sentenceCount ? wordCount / sentenceCount : 0;
    const asw = wordCount ? syllableTotal / wordCount : 0;
    return {
      sentences: sents,
      words: ws,
      wordCount: wordCount,
      sentenceCount: sentenceCount,
      syllables: syllableTotal,
      asl: asl,
      asw: asw,
      bigWords: big,
      difficultWords: difficult,
      difficultPct: wordCount ? (100 * difficult) / wordCount : 0,
      readingMinutes: wordCount / 200
    };
  }

  /* ---------- the five published formulas ---------- */

  // Flesch Reading Ease, Flesch 1948.
  // 206.835 - 1.015 x words per sentence - 84.6 x syllables per word.
  function flesch(st) {
    if (!st.wordCount || !st.sentenceCount) return null;
    return 206.835 - 1.015 * st.asl - 84.6 * st.asw;
  }

  // Flesch-Kincaid Grade Level, Kincaid, Fishburne, Rogers and Chissom 1975.
  // 0.39 x words per sentence + 11.8 x syllables per word - 15.59.
  function kincaid(st) {
    if (!st.wordCount || !st.sentenceCount) return null;
    return 0.39 * st.asl + 11.8 * st.asw - 15.59;
  }

  // Gunning Fog, Gunning 1952. A complex word carries three or more
  // syllables. 0.4 x (words per sentence + 100 x complex share).
  function fog(st) {
    if (!st.wordCount || !st.sentenceCount) return null;
    return 0.4 * (st.asl + (100 * st.bigWords) / st.wordCount);
  }

  // SMOG, McLaughlin 1969. Short texts use the published complete formula
  // 1.0430 x square root of (30 x polysyllables / sentences) + 3.1291.
  // Thirty or more sentences use the classic grading, three plus the square
  // root of polysyllables in thirty sampled sentences.
  function polysInSentence(sentence) {
    const ws = words(sentence);
    let n = 0;
    for (let i = 0; i < ws.length; i++) {
      if (syllables(ws[i]) >= 3) n += 1;
    }
    return n;
  }

  function smog(st) {
    if (!st.wordCount || !st.sentenceCount) return null;
    if (st.sentenceCount >= 30) {
      const s = st.sentences;
      const n = s.length;
      const mid = Math.floor((n - 10) / 2);
      let poly = 0;
      for (let i = 0; i < 10; i++) poly += polysInSentence(s[i]);
      for (let i = mid; i < mid + 10; i++) poly += polysInSentence(s[i]);
      for (let i = n - 10; i < n; i++) poly += polysInSentence(s[i]);
      return 3 + Math.sqrt(poly);
    }
    return 1.0430 * Math.sqrt((30 * st.bigWords) / st.sentenceCount) + 3.1291;
  }

  // Dale-Chall, Dale and Chall 1948.
  // 0.1579 x percent of unfamiliar words + 0.0496 x words per sentence,
  // plus 3.6365 when unfamiliar words top five percent.
  function daleChall(st) {
    if (!st.wordCount || !st.sentenceCount) return null;
    let score = 0.1579 * st.difficultPct + 0.0496 * st.asl;
    if (st.difficultPct > 5) score += 3.6365;
    return score;
  }

  /* ---------- converting scores to grades and labels ---------- */

  function fleschBandLabel(re) {
    if (re === null || re === undefined) return '';
    const bands = data.fleschBands || [];
    for (let i = 0; i < bands.length; i++) {
      if (re >= bands[i].min) return bands[i].label;
    }
    return bands.length ? bands[bands.length - 1].label : '';
  }

  function fleschGrade(re) {
    if (re === null || re === undefined) return null;
    const table = data.fleschGradeTable || [];
    for (let i = 0; i < table.length; i++) {
      if (re >= table[i].min) return table[i].grade;
    }
    return table.length ? table[table.length - 1].grade : null;
  }

  function daleChallGrade(raw) {
    if (raw === null || raw === undefined) return null;
    if (raw <= 4.9) return 4;
    if (raw <= 5.9) return 6;
    if (raw <= 6.9) return 8;
    if (raw <= 7.9) return 10;
    if (raw <= 8.9) return 12;
    return 14;
  }

  function daleChallLabel(raw) {
    if (raw === null || raw === undefined) return '';
    if (raw <= 4.9) return 'Grade 4 and below';
    if (raw <= 5.9) return 'Grades 5 and 6';
    if (raw <= 6.9) return 'Grades 7 and 8';
    if (raw <= 7.9) return 'Grades 9 and 10';
    if (raw <= 8.9) return 'Grades 11 and 12';
    return 'College';
  }

  /* ---------- full report with the arithmetic shown ---------- */

  function report(text) {
    const st = analyze(text);
    const re = flesch(st);
    const fk = kincaid(st);
    const fg = fog(st);
    const sg = smog(st);
    const dc = daleChall(st);
    const pctComplex = st.wordCount ? (100 * st.bigWords) / st.wordCount : 0;
    let smogWorked;
    if (sg === null) {
      smogWorked = '';
    } else if (st.sentenceCount >= 30) {
      smogWorked = '3 + square root of the polysyllables in 30 sampled sentences = ' + fmt(sg);
    } else {
      smogWorked = '1.0430 x \u221A(30 x ' + st.bigWords + ' / ' + st.sentenceCount + ') + 3.1291 = ' + fmt(sg);
    }
    return {
      stats: st,
      flesch: re,
      fleschWorked: re === null ? '' : '206.835 - (1.015 \u00D7 ' + fmt(st.asl) + ') - (84.6 \u00D7 ' + fmt(st.asw) + ') = ' + fmt(re),
      fleschBand: fleschBandLabel(re),
      kincaid: fk,
      kincaidWorked: fk === null ? '' : '(0.39 \u00D7 ' + fmt(st.asl) + ') + (11.8 \u00D7 ' + fmt(st.asw) + ') - 15.59 = ' + fmt(fk),
      fog: fg,
      fogWorked: fg === null ? '' : '0.4 \u00D7 (' + fmt(st.asl) + ' + (100 \u00D7 ' + st.bigWords + ') / ' + st.wordCount + ') = ' + fmt(fg),
      smog: sg,
      smogWorked: smogWorked,
      daleChall: dc,
      daleChallLabel: daleChallLabel(dc),
      daleChallWorked: dc === null ? '' : '(0.1579 \u00D7 ' + fmt(st.difficultPct) + ') + (0.0496 \u00D7 ' + fmt(st.asl) + ')' + (st.difficultPct > 5 ? ' + 3.6365' : '') + ' = ' + fmt(dc),
      percentComplex: pctComplex
    };
  }

  /* ---------- longest sentences with rewrite candidates ---------- */

  const CANDIDATE_RE = /(?:,\s*|\s+)(and|but|so|which|who|while)\s+|;\s*/gi;

  function splitCandidates(sentence) {
    const candidates = [];
    CANDIDATE_RE.lastIndex = 0;
    let m;
    while ((m = CANDIDATE_RE.exec(sentence)) !== null) {
      candidates.push({ index: m.index, length: m[0].length, word: (m[1] || ';').toLowerCase() });
    }
    return candidates;
  }

  function bestCandidate(sentence) {
    const candidates = splitCandidates(sentence);
    if (!candidates.length) return null;
    const middle = sentence.length / 2;
    let best = null;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const distance = Math.abs(c.index + c.length / 2 - middle);
      if (!best || distance < best.distance) best = { word: c.word, distance: distance, index: c.index, length: c.length };
    }
    return best;
  }

  function longestSentences(text, n) {
    const sents = splitSentences(text);
    const rows = sents.map(function (s) {
      const wc = words(s).length;
      const cand = bestCandidate(s);
      let hint;
      if (wc <= 22) {
        hint = 'Within the long sentence range.';
      } else if (cand) {
        hint = 'Try splitting near the word "' + cand.word + '".';
      } else {
        hint = 'No obvious split point. Try writing it as two thoughts.';
      }
      return { text: s, words: wc, hint: hint };
    });
    rows.sort(function (a, b) { return b.words - a.words || (a.text < b.text ? -1 : 1); });
    return rows.slice(0, n || 3);
  }

  /* ---------- Jargon Radar ---------- */

  function parseTermList(text) {
    const terms = [];
    const lines = String(text || '').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const eq = line.indexOf('=');
      let term, plain;
      if (eq === -1) {
        term = line.trim();
        plain = '';
      } else {
        term = line.slice(0, eq).trim();
        plain = line.slice(eq + 1).trim();
      }
      if (term) terms.push({ term: term, plain: plain });
    }
    return terms;
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function findJargon(text, terms) {
    const sents = splitSentences(text);
    const lower = String(text || '').toLowerCase();
    const results = [];
    for (let i = 0; i < terms.length; i++) {
      const entry = terms[i];
      if (!entry.term || entry.term.length < 2) continue;
      const pattern = new RegExp('\\b' + escapeRe(entry.term).replace(/\s+/g, '\\s+') + '\\b', 'gi');
      const matches = lower.match(pattern);
      if (!matches) continue;
      let example = '';
      pattern.lastIndex = 0;
      for (let j = 0; j < sents.length; j++) {
        pattern.lastIndex = 0;
        if (pattern.test(sents[j])) {
          example = sents[j];
          break;
        }
      }
      results.push({
        term: entry.term,
        plain: entry.plain,
        count: matches.length,
        example: example
      });
    }
    results.sort(function (a, b) {
      return b.count - a.count || (a.term < b.term ? -1 : a.term > b.term ? 1 : 0);
    });
    return results;
  }

  /* ---------- Rewrite Bench transforms ---------- */

  function tidy(text) {
    let t = String(text || '');
    t = t.replace(/[ \t]{2,}/g, ' ');
    t = t.replace(/ +([,.;:!?])/g, '$1');
    t = t.trim();
    t = t.replace(/(^|[.!?]\s+)([a-z])/g, function (m, p1, p2) { return p1 + p2.toUpperCase(); });
    return t;
  }

  // Word and phrase swaps from the fixture dictionary. Phrases go first so
  // single words inside them never fire early. Capitalization is preserved
  // on the first letter.
  function replaceComplexWords(text, dictionaryLines) {
    const entries = parseTermList(Array.isArray(dictionaryLines) ? dictionaryLines.join('\n') : String(dictionaryLines || ''));
    entries.sort(function (a, b) { return b.term.length - a.term.length; });
    let t = String(text || '');
    const changes = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const pattern = new RegExp('\\b' + escapeRe(entry.term).replace(/\s+/g, '\\s+') + '\\b', 'gi');
      let count = 0;
      t = t.replace(pattern, function (matched) {
        count += 1;
        if (!entry.plain) return '';
        const out = /^[A-Z]/.test(matched) ? capitalizeFirst(entry.plain) : entry.plain;
        return out;
      });
      if (count > 0) changes.push({ from: entry.term, to: entry.plain || '(removed)', count: count });
    }
    return { text: tidy(t), changes: changes };
  }

  // Split sentences longer than the threshold at the conjunction closest to
  // the middle. Only and, but, so and semicolons are split, because those
  // keep both halves grammatical. Which, who and while only appear as hints.
  function splitLongSentences(text, opts) {
    const threshold = opts && opts.threshold ? opts.threshold : 22;
    const minPart = opts && opts.minPart ? opts.minPart : 5;
    let t = String(text || '');
    let totalSplits = 0;
    for (let round = 0; round < 3; round++) {
      const sents = splitSentences(t);
      const rebuilt = [];
      let changed = false;
      for (let i = 0; i < sents.length; i++) {
        const sentence = sents[i];
        if (words(sentence).length <= threshold) {
          rebuilt.push(sentence);
          continue;
        }
        const candidates = splitCandidates(sentence).filter(function (c) {
          if (c.word !== 'and' && c.word !== 'but' && c.word !== 'so' && c.word !== ';') return false;
          const leftWords = words(sentence.slice(0, c.index)).length;
          const rightWords = words(sentence.slice(c.index + c.length)).length;
          return leftWords >= minPart && rightWords >= minPart;
        });
        if (!candidates.length) {
          rebuilt.push(sentence);
          continue;
        }
        const middle = sentence.length / 2;
        let best = null;
        for (let k = 0; k < candidates.length; k++) {
          const c = candidates[k];
          const distance = Math.abs(c.index + c.length / 2 - middle);
          if (!best || distance < best.distance) best = { word: c.word, distance: distance, index: c.index, length: c.length };
        }
        let left = sentence.slice(0, best.index).replace(/[\s,]+$/, '');
        let right = sentence.slice(best.index + best.length).replace(/^[\s]+/, '');
        const prefix = best.word === 'but' ? 'But ' : best.word === 'so' ? 'So ' : '';
        right = prefix ? prefix + right : capitalizeFirst(right);
        rebuilt.push(left + '. ' + right);
        totalSplits += 1;
        changed = true;
      }
      t = rebuilt.join(' ');
      if (!changed) break;
    }
    return { text: tidy(t), splits: totalSplits };
  }

  /* ---------- passive voice ---------- */

  const IRREGULAR_PARTICIPLES = 'made written sung done given taken seen held kept told sent built found brought thought caught taught left felt known grown shown drawn driven eaten fallen forgotten hidden spoken stolen worn'.split(' ');

  const PASSIVE_RE = /\b(am|is|are|was|were)((?:\s+\w+ly)?\s+)(\w+)(\s+by\s+[^,.;!?]+)?/gi;

  // Words that end in ed or en without being participles. Without this
  // blacklist, "was only seven" reads as a passive.
  const NON_PARTICIPLES = 'even often seven eleven children men women ten then when green open happen listen garden certain iron oven token linen siren'.split(' ');

  function isParticiple(word) {
    const w = word.toLowerCase();
    if (NON_PARTICIPLES.indexOf(w) !== -1) return false;
    if (/(?:ed|en)$/.test(w)) return true;
    return IRREGULAR_PARTICIPLES.indexOf(w) !== -1;
  }

  // Passive voice is flagged, never silently rewritten. When the agent sits
  // right there after "by" and the participle is regular, a mechanical
  // active version is offered for the writer to judge.
  function passiveFindings(text) {
    const findings = [];
    const sents = splitSentences(text);
    for (let i = 0; i < sents.length; i++) {
      const sentence = sents[i];
      PASSIVE_RE.lastIndex = 0;
      let m;
      while ((m = PASSIVE_RE.exec(sentence)) !== null) {
        const participle = m[3];
        if (!isParticiple(participle)) continue;
        const agent = m[4] ? m[4].replace(/^\s+by\s+/i, '').trim() : null;
        const beVerb = m[1];
        const verbStart = m.index;
        const verbEnd = m.index + m[1].length + m[2].length + m[3].length;
        let active = null;
        if (agent && /ed$/.test(participle.toLowerCase())) {
          const subject = sentence.slice(0, verbStart).trim();
          if (subject && words(subject).length >= 1) {
            const tail = sentence.slice(verbStart + m[1].length + m[2].length + m[3].length + (m[4] ? m[4].length : 0)).trim();
            const joiner = /^[,.;!?]/.test(tail) ? '' : ' ';
            active = capitalizeFirst(agent) + ' ' + participle + ' ' + lowerFirstUnlessI(subject) + (tail ? joiner + tail : '');
          }
        }
        findings.push({
          sentence: sentence,
          beVerb: beVerb,
          participle: participle,
          verb: beVerb + ' ' + participle,
          start: verbStart,
          verbEnd: verbEnd,
          agent: agent,
          active: active
        });
        if (m[4]) break;
      }
    }
    return findings;
  }

  /* ---------- word diff ---------- */

  // Diff tokens keep their punctuation attached, so the before and after
  // view reads like the document instead of like a word list.
  function diffTokens(text) {
    const matches = String(text || '').match(/\S+/g);
    return matches ? matches : [];
  }

  function normToken(token) {
    return token.toLowerCase().replace(/[^a-z0-9']/g, '');
  }

  function wordDiff(aText, bText) {
    const a = diffTokens(aText);
    const b = diffTokens(bText);
    const cap = 1200;
    if (a.length > cap || b.length > cap || (a.length + 1) * (b.length + 1) > 1200000) {
      return [{ type: 'del', text: aText }, { type: 'ins', text: bText }];
    }
    const n = a.length;
    const mLen = b.length;
    const lowerA = a.map(normToken);
    const lowerB = b.map(normToken);
    // LCS table as flat array
    const width = mLen + 1;
    const table = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = mLen - 1; j >= 0; j--) {
        if (lowerA[i] === lowerB[j]) {
          table[i * width + j] = table[(i + 1) * width + (j + 1)] + 1;
        } else {
          const down = table[(i + 1) * width + j];
          const right = table[i * width + (j + 1)];
          table[i * width + j] = down >= right ? down : right;
        }
      }
    }
    const ops = [];
    let i = 0, j = 0;
    while (i < n && j < mLen) {
      if (lowerA[i] === lowerB[j]) {
        ops.push({ type: 'eq', text: a[i] });
        i += 1; j += 1;
      } else if (table[(i + 1) * width + j] >= table[i * width + (j + 1)]) {
        ops.push({ type: 'del', text: a[i] });
        i += 1;
      } else {
        ops.push({ type: 'ins', text: b[j] });
        j += 1;
      }
    }
    while (i < n) { ops.push({ type: 'del', text: a[i] }); i += 1; }
    while (j < mLen) { ops.push({ type: 'ins', text: b[j] }); j += 1; }
    // merge runs of the same type
    const merged = [];
    for (let k = 0; k < ops.length; k++) {
      const last = merged.length ? merged[merged.length - 1] : null;
      if (last && last.type === ops[k].type) last.text += ' ' + ops[k].text;
      else merged.push({ type: ops[k].type, text: ops[k].text });
    }
    return merged;
  }

  /* ---------- Audience Dial ---------- */

  const GRADE_BANDS = [
    { id: '4-5', label: 'Grades 4 and 5', min: 4, max: 5 },
    { id: '6-7', label: 'Grades 6 and 7', min: 6, max: 7 },
    { id: '8-9', label: 'Grades 8 and 9', min: 8, max: 9 },
    { id: '10-12', label: 'Grades 10 to 12', min: 10, max: 12 },
    { id: 'college', label: 'College', min: 13, max: 18 }
  ];

  // One row per formula. Reading Ease and Dale-Chall convert to a school
  // grade through the standard band tables, the other three already are
  // grades. Pass means at or below the top of the chosen band.
  function dialVerdicts(rep, band) {
    const rows = [
      { name: 'Flesch Reading Ease', grade: fleschGrade(rep.flesch), note: rep.flesch === null ? '' : 'Reading ease ' + fmt(rep.flesch) },
      { name: 'Flesch-Kincaid Grade Level', grade: rep.kincaid === null ? null : round1(rep.kincaid), note: '' },
      { name: 'Gunning Fog Index', grade: rep.fog === null ? null : round1(rep.fog), note: '' },
      { name: 'SMOG Grade', grade: rep.smog === null ? null : round1(rep.smog), note: '' },
      { name: 'Dale-Chall', grade: daleChallGrade(rep.daleChall), note: rep.daleChall === null ? '' : daleChallLabel(rep.daleChall) }
    ];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.grade === null) {
        row.verdict = 'Needs text';
        row.over = null;
      } else if (row.grade <= band.max) {
        row.verdict = 'Pass';
        row.over = 0;
      } else {
        row.verdict = 'Needs work';
        row.over = round1(row.grade - band.max);
      }
    }
    return rows;
  }

  /* ---------- exports ---------- */

  const engine = {
    fmt: fmt,
    round1: round1,
    capitalizeFirst: capitalizeFirst,
    splitSentences: splitSentences,
    words: words,
    syllables: syllables,
    isFamiliar: isFamiliar,
    analyze: analyze,
    flesch: flesch,
    kincaid: kincaid,
    fog: fog,
    smog: smog,
    daleChall: daleChall,
    fleschBandLabel: fleschBandLabel,
    fleschGrade: fleschGrade,
    daleChallGrade: daleChallGrade,
    daleChallLabel: daleChallLabel,
    report: report,
    longestSentences: longestSentences,
    parseTermList: parseTermList,
    findJargon: findJargon,
    replaceComplexWords: replaceComplexWords,
    splitLongSentences: splitLongSentences,
    passiveFindings: passiveFindings,
    wordDiff: wordDiff,
    tidy: tidy,
    gradeBands: GRADE_BANDS,
    dialVerdicts: dialVerdicts
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  }
  root.PlainPage = root.PlainPage || {};
  const target = root.PlainPage;
  for (const key in engine) {
    if (Object.prototype.hasOwnProperty.call(engine, key)) target[key] = engine[key];
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
