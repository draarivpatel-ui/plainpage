/*
 * PlainPage studio wiring. All rendering uses textContent, so pasted text is
 * never treated as markup. Every recompute is event driven; nothing loops.
 */
(function () {
  'use strict';

  const PP = window.PlainPage;
  const data = PP.data;

  const $ = function (id) { return document.getElementById(id); };

  const els = {
    input: $('input-text'),
    count: $('input-count'),
    tabs: Array.prototype.slice.call(document.querySelectorAll('.tab')),
    panels: {
      'tab-report': $('panel-report'),
      'tab-jargon': $('panel-jargon'),
      'tab-bench': $('panel-bench'),
      'tab-dial': $('panel-dial')
    },
    re: $('report-re'),
    reBand: $('report-re-band'),
    reMath: $('report-re-math'),
    fkgl: $('report-fkgl'),
    fkglMath: $('report-fkgl-math'),
    fog: $('report-fog'),
    fogMath: $('report-fog-math'),
    smog: $('report-smog'),
    smogMath: $('report-smog-math'),
    dc: $('report-dc'),
    dcLabel: $('report-dc-label'),
    dcMath: $('report-dc-math'),
    statWords: $('stat-words'),
    statSentences: $('stat-sentences'),
    statSyllables: $('stat-syllables'),
    statAsl: $('stat-asl'),
    statAsw: $('stat-asw'),
    statBig: $('stat-big'),
    statHard: $('stat-hard'),
    statTime: $('stat-time'),
    longest: $('report-longest'),
    jargonHits: $('jargon-hits'),
    jargonEmpty: $('jargon-empty'),
    jargonList: $('jargon-list'),
    jargonStatus: $('jargon-status'),
    optSplit: $('opt-split'),
    optWords: $('opt-words'),
    runBench: $('run-bench'),
    benchStatus: $('bench-status'),
    benchScores: $('bench-scores'),
    benchDelta: $('bench-delta'),
    passives: $('bench-passives'),
    changes: $('bench-changes'),
    benchOutput: $('bench-output'),
    copyBench: $('copy-bench'),
    copyStatus: $('copy-status'),
    benchDiff: $('bench-diff'),
    dialRows: $('dial-rows'),
    dialOverall: $('dial-overall'),
    sampleNotice: $('sample-notice'),
    sampleLetter: $('sample-letter'),
    clearText: $('clear-text')
  };

  const TERMS_KEY = 'plainpage.terms.v1';
  let currentTerms = [];

  /* ---------- small render helpers ---------- */

  function settle(el) {
    el.classList.remove('settled');
    void el.offsetWidth;
    el.classList.add('settled');
  }

  function setText(el, text, animate) {
    el.textContent = text;
    if (animate) settle(el);
  }

  function fmt2(x) {
    return (Math.round(x * 100) / 100).toFixed(2);
  }

  function gradeDisplay(v) {
    if (v === null || v === undefined) return '--';
    if (v < 1) return 'K';
    return PP.fmt(v);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /* ---------- tabs ---------- */

  let activeTab = 0;

  function selectTab(index) {
    activeTab = index;
    els.tabs.forEach(function (tab, i) {
      const selected = i === index;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
      els.panels[tab.id].hidden = !selected;
    });
  }

  els.tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(i); });
  });

  document.querySelector('.tabs').addEventListener('keydown', function (event) {
    const last = els.tabs.length - 1;
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = activeTab === last ? 0 : activeTab + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = activeTab === 0 ? last : activeTab - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next !== null) {
      event.preventDefault();
      selectTab(next);
      els.tabs[next].focus();
    }
  });

  /* ---------- stage ---------- */

  function updateCount(st) {
    if (!st.wordCount) {
      els.count.textContent = 'Nothing pasted yet.';
    } else {
      const sentenceWord = st.sentenceCount === 1 ? 'sentence' : 'sentences';
      els.count.textContent = st.wordCount + (st.wordCount === 1 ? ' word, ' : ' words, ') + st.sentenceCount + ' ' + sentenceWord + '.';
    }
  }

  /* ---------- report panel ---------- */

  function renderReport(rep) {
    const st = rep.stats;
    setText(els.re, rep.flesch === null ? '--' : PP.fmt(rep.flesch), true);
    setText(els.reBand, rep.flesch === null ? 'Paste text to begin' : rep.fleschBand);
    if (rep.fleschWorked) setText(els.reMath, rep.fleschWorked);

    setText(els.fkgl, gradeDisplay(rep.kincaid), true);
    if (rep.kincaidWorked) setText(els.fkglMath, rep.kincaidWorked);
    setText(els.fog, gradeDisplay(rep.fog), true);
    if (rep.fogWorked) setText(els.fogMath, rep.fogWorked);
    setText(els.smog, gradeDisplay(rep.smog), true);
    if (rep.smogWorked) setText(els.smogMath, rep.smogWorked);
    setText(els.dc, rep.daleChall === null ? '--' : PP.fmt(rep.daleChall), true);
    setText(els.dcLabel, rep.daleChall === null ? 'raw score' : rep.daleChallLabel);
    if (rep.daleChallWorked) setText(els.dcMath, rep.daleChallWorked);

    els.statWords.textContent = String(st.wordCount);
    els.statSentences.textContent = String(st.sentenceCount);
    els.statSyllables.textContent = String(st.syllables);
    els.statAsl.textContent = PP.fmt(st.asl);
    els.statAsw.textContent = fmt2(st.asw);
    els.statBig.textContent = String(st.bigWords);
    els.statHard.textContent = String(st.difficultWords);
    els.statTime.textContent = PP.fmt(st.readingMinutes) + ' min';

    clearChildren(els.longest);
    if (!st.sentenceCount) {
      els.longest.appendChild(el('li', 'longest-empty', 'The three longest sentences will line up here.'));
    } else {
      const rows = PP.longestSentences(els.input.value, 3);
      rows.forEach(function (row) {
        const li = el('li');
        li.appendChild(el('p', 'longest-text', row.text));
        li.appendChild(el('p', 'longest-meta', row.words + ' words. ' + row.hint));
        els.longest.appendChild(li);
      });
    }
  }

  /* ---------- jargon panel ---------- */

  function loadTerms() {
    let stored = null;
    try {
      stored = window.localStorage.getItem(TERMS_KEY);
    } catch (err) {
      stored = null;
    }
    els.jargonList.value = stored || data.jargonStarter;
  }

  function saveTerms() {
    try {
      window.localStorage.setItem(TERMS_KEY, els.jargonList.value);
    } catch (err) {
      /* private browsing, session only */
    }
  }

  function renderJargon(text) {
    currentTerms = PP.parseTermList(els.jargonList.value);
    const hits = PP.findJargon(text, currentTerms);
    clearChildren(els.jargonHits);
    if (!hits.length) {
      els.jargonHits.appendChild(el('li', 'jargon-empty', 'No terms from your list appear in the text.'));
      return;
    }
    hits.forEach(function (hit) {
      const li = el('li', 'jargon-hit');
      const hitWord = hit.count === 1 ? 'hit' : 'hits';
      li.appendChild(el('p', 'jargon-term', hit.term + ' (' + hit.count + ' ' + hitWord + ')'));
      if (hit.plain) {
        const swap = el('p', 'jargon-swap');
        swap.appendChild(el('span', 'swap-arrow', '\u2192 '));
        swap.appendChild(document.createTextNode(hit.plain));
        li.appendChild(swap);
      } else {
        li.appendChild(el('p', 'jargon-swap', 'No plain alternative in the list yet.'));
      }
      if (hit.example) {
        let exampleText = hit.example;
        if (exampleText.length > 220) exampleText = exampleText.slice(0, 217) + '...';
        li.appendChild(el('p', 'jargon-example', exampleText));
      }
      els.jargonHits.appendChild(li);
    });
  }

  /* ---------- bench panel ---------- */

  function renderPassives(findings) {
    clearChildren(els.passives);
    if (!findings.length) {
      els.passives.appendChild(el('li', 'empty-row', 'No passive constructions were found.'));
      return;
    }
    findings.forEach(function (f) {
      const li = el('li');
      const p = el('p', 'passive-sentence');
      p.appendChild(document.createTextNode(f.sentence.slice(0, f.start)));
      p.appendChild(el('span', 'passive-verb', f.verb));
      p.appendChild(document.createTextNode(f.sentence.slice(f.verbEnd)));
      li.appendChild(p);
      if (f.active) {
        li.appendChild(el('p', 'passive-active', 'Try, ' + f.active));
      } else {
        li.appendChild(el('p', 'passive-hint', 'Hint, name who does the action and make them the subject.'));
      }
      els.passives.appendChild(li);
    });
  }

  function renderChanges(changes) {
    clearChildren(els.changes);
    if (!changes.length) {
      els.changes.appendChild(el('li', 'empty-row', 'No dictionary swaps were made.'));
      return;
    }
    changes.forEach(function (c) {
      const li = el('li');
      li.appendChild(el('span', 'swap-word', c.from));
      li.appendChild(document.createTextNode(' became '));
      li.appendChild(el('span', 'swap-word', c.to));
      li.appendChild(document.createTextNode(' (' + c.count + (c.count === 1 ? ' time)' : ' times)')));
      els.changes.appendChild(li);
    });
  }

  function renderDelta(before, after) {
    els.benchScores.hidden = false;
    clearChildren(els.benchDelta);
    if (before.flesch === null || after.flesch === null) return;
    const reVerb = after.flesch > before.flesch ? 'rose' : after.flesch < before.flesch ? 'slipped' : 'held at';
    const fkVerb = after.kincaid < before.kincaid ? 'dropped' : after.kincaid > before.kincaid ? 'climbed' : 'held at';
    els.benchDelta.appendChild(document.createTextNode('Reading ease ' + reVerb + ' from '));
    els.benchDelta.appendChild(el('strong', null, PP.fmt(before.flesch) + ' to ' + PP.fmt(after.flesch)));
    els.benchDelta.appendChild(document.createTextNode('. Grade level ' + fkVerb + ' from '));
    els.benchDelta.appendChild(el('strong', null, PP.fmt(before.kincaid) + ' to ' + PP.fmt(after.kincaid)));
    els.benchDelta.appendChild(document.createTextNode('.'));
  }

  function renderDiff(beforeText, afterText) {
    els.benchDiff.hidden = false;
    clearChildren(els.benchDiff);
    const ops = PP.wordDiff(beforeText, afterText);
    ops.forEach(function (op) {
      if (op.type === 'eq') {
        els.benchDiff.appendChild(document.createTextNode(op.text + ' '));
      } else {
        els.benchDiff.appendChild(el(op.type, null, op.text));
        els.benchDiff.appendChild(document.createTextNode(' '));
      }
    });
  }

  function renderOutput(text) {
    els.benchOutput.hidden = false;
    els.copyBench.hidden = false;
    clearChildren(els.benchOutput);
    const lines = String(text).split(/\n+/);
    let shown = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      els.benchOutput.appendChild(el('p', null, line));
      shown = true;
    }
    if (!shown) els.benchOutput.appendChild(el('p', null, text));
  }

  function runBench() {
    const original = els.input.value;
    if (!PP.words(original).length) {
      els.benchStatus.textContent = 'Paste some text first, then run the bench.';
      return;
    }
    let working = original;
    const changes = [];
    let splitCount = 0;
    if (els.optWords.checked) {
      const swapped = PP.replaceComplexWords(working, data.rewriteDictionary);
      working = swapped.text;
      Array.prototype.push.apply(changes, swapped.changes);
    }
    if (els.optSplit.checked) {
      const split = PP.splitLongSentences(working);
      working = split.text;
      splitCount = split.splits;
    }
    const before = PP.report(original);
    const after = PP.report(working);
    const findings = PP.passiveFindings(original);

    renderOutput(working);
    renderDiff(original, working);
    renderChanges(changes);
    renderPassives(findings);
    renderDelta(before, after);

    const parts = [];
    if (els.optSplit.checked) parts.push(splitCount + (splitCount === 1 ? ' sentence split' : ' sentences split'));
    if (els.optWords.checked) parts.push(changes.length + (changes.length === 1 ? ' word swap' : ' word swaps'));
    if (!els.optSplit.checked && !els.optWords.checked) {
      els.benchStatus.textContent = 'Both transforms are off, nothing to run.';
    } else if (!splitCount && !changes.length) {
      els.benchStatus.textContent = 'Bench run, nothing needed changing.';
    } else {
      els.benchStatus.textContent = 'Bench run, ' + parts.join(' and ') + '.';
    }
  }

  /* ---------- dial panel ---------- */

  function renderDial(rep) {
    const checked = document.querySelector('input[name="dial-band"]:checked');
    const bandId = checked ? checked.value : '6-7';
    const band = PP.gradeBands.filter(function (b) { return b.id === bandId; })[0] || PP.gradeBands[1];
    clearChildren(els.dialRows);
    if (rep.flesch === null) {
      els.dialRows.appendChild(el('li', 'dial-empty', 'Pick a band, paste text, and the verdicts will line up here.'));
      els.dialOverall.textContent = '';
      return;
    }
    const rows = PP.dialVerdicts(rep, band);
    let passCount = 0;
    rows.forEach(function (row) {
      if (row.verdict === 'Pass') passCount += 1;
      const li = el('li', 'dial-row');
      li.appendChild(el('span', 'dial-name', row.name));
      li.appendChild(el('span', 'dial-grade', row.grade === null ? '--' : String(row.grade)));
      const chipClass = row.verdict === 'Pass' ? 'chip chip-pass' : row.verdict === 'Needs work' ? 'chip chip-work' : 'chip chip-idle';
      li.appendChild(el('span', chipClass, row.verdict));
      const notes = [];
      if (row.note) notes.push(row.note);
      if (row.over !== null && row.over > 0) notes.push(PP.fmt(row.over) + ' grades over the target');
      else if (row.over === 0 && band.min !== null && row.grade !== null && row.grade < band.min) notes.push('easier than the target');
      if (notes.length) li.appendChild(el('p', 'dial-note', notes.join('. ')));
      els.dialRows.appendChild(li);
    });
    const all = rows.length;
    els.dialOverall.textContent = passCount + ' of ' + all + ' formulas pass for ' + band.label + '.';
  }

  /* ---------- recompute ---------- */

  let pending = null;

  function recompute() {
    const text = els.input.value;
    const rep = PP.report(text);
    updateCount(rep.stats);
    renderReport(rep);
    renderJargon(text);
    renderDial(rep);
  }

  function scheduleRecompute() {
    if (pending) window.clearTimeout(pending);
    pending = window.setTimeout(function () {
      pending = null;
      recompute();
    }, 160);
  }

  /* ---------- wiring ---------- */

  els.input.addEventListener('input', scheduleRecompute);

  els.sampleNotice.addEventListener('click', function () {
    els.input.value = data.samples.notice;
    recompute();
  });

  els.sampleLetter.addEventListener('click', function () {
    els.input.value = data.samples.letter;
    recompute();
  });

  els.clearText.addEventListener('click', function () {
    els.input.value = '';
    recompute();
    els.input.focus();
  });

  $('jargon-apply').addEventListener('click', function () {
    saveTerms();
    const terms = PP.parseTermList(els.jargonList.value).length;
    renderJargon(els.input.value);
    els.jargonStatus.textContent = 'List applied, ' + terms + ' terms scanned.';
  });

  $('jargon-reset').addEventListener('click', function () {
    els.jargonList.value = data.jargonStarter;
    saveTerms();
    renderJargon(els.input.value);
    els.jargonStatus.textContent = 'Starter list restored.';
  });

  els.runBench.addEventListener('click', runBench);

  els.copyBench.addEventListener('click', function () {
    const text = els.benchOutput.innerText;
    const done = function () { els.copyStatus.textContent = 'Copied to the clipboard.'; };
    const fail = function () {
      try {
        els.benchOutput.focus();
        document.execCommand('copy');
        els.copyStatus.textContent = 'Copied to the clipboard.';
      } catch (err) {
        els.copyStatus.textContent = 'Copy failed, select the text manually.';
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fail);
    } else {
      fail();
    }
  });

  document.querySelectorAll('input[name="dial-band"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      renderDial(PP.report(els.input.value));
    });
  });

  loadTerms();
  selectTab(0);
  recompute();
})();
