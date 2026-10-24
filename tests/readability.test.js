/*
 * Tests for tokenization, the syllable counter, and the five published
 * readability formulas. The Flesch and Flesch-Kincaid anchors use the widely
 * reproduced worked example "The Australian platypus is seemingly a hybrid
 * mammal." (Klare 1974, DuBay 2004), which evaluates to a Reading Ease of
 * 18.9 and a Kincaid grade of 12.6. SMOG, Fog and Dale-Chall are checked
 * against their published formulas on constructed inputs with hand counted
 * words, so every expected number below is independent arithmetic.
 */
const test = require('node:test');
const assert = require('node:assert');
const PP = require('../js/engine.js');

const PLATYPUS = 'The Australian platypus is seemingly a hybrid mammal.';

test('sentences split on punctuation, newlines, and protected abbreviations', () => {
  assert.equal(PP.splitSentences('One. Two. Three.').length, 3);
  const decimals = PP.splitSentences('It costs 3.50 dollars. Then we left.');
  assert.equal(decimals.length, 2);
  assert.equal(decimals[0], 'It costs 3.50 dollars.');
  const titles = PP.splitSentences('Dr. Smith met Mrs. Lee.');
  assert.equal(titles.length, 1);
  assert.equal(titles[0], 'Dr. Smith met Mrs. Lee.');
});

test('hyphenated compounds count as their parts', () => {
  assert.equal(PP.words('a state-of-the-art lab').length, 6);
});

test('syllable counter agrees with dictionary hyphenation on fixed words', () => {
  const cases = {
    cat: 1,
    the: 1,
    apple: 2,
    table: 2,
    beautiful: 3,
    readability: 5,
    syllable: 3,
    elephant: 3,
    education: 4,
    study: 2,
    policy: 3,
    unbelievable: 5,
    queue: 1,
    australian: 4,
    quiet: 2,
    poem: 2,
    money: 2,
    every: 2,
    idea: 3
  };
  for (const word of Object.keys(cases)) {
    assert.equal(PP.syllables(word), cases[word], word);
  }
});

test('familiar word fixture accepts plain inflections and rejects outside words', () => {
  assert.equal(PP.isFamiliar('cats'), true);
  assert.equal(PP.isFamiliar('running'), true);
  assert.equal(PP.isFamiliar('loved'), true);
  assert.equal(PP.isFamiliar('quickly'), true);
  assert.equal(PP.isFamiliar('utilize'), false);
  assert.equal(PP.isFamiliar('harbor'), false);
});

test('platypus statistics land on the published counts', () => {
  const st = PP.analyze(PLATYPUS);
  assert.equal(st.wordCount, 8);
  assert.equal(st.sentenceCount, 1);
  assert.equal(st.syllables, 17);
  assert.equal(st.bigWords, 3);
});

test('Flesch Reading Ease matches the published worked example', () => {
  const rep = PP.report(PLATYPUS);
  assert.ok(Math.abs(rep.flesch - 18.94) < 0.02, 'got ' + rep.flesch);
  assert.equal(PP.fmt(rep.flesch), '18.9');
});

test('Flesch Reading Ease follows its own arithmetic on a simple sentence', () => {
  // 206.835 - 1.015 x 5 - 84.6 x 1 = 117.16
  const rep = PP.report('I like to read books.');
  assert.ok(Math.abs(rep.flesch - 117.16) < 0.02, 'got ' + rep.flesch);
});

test('Flesch-Kincaid Grade Level matches the published worked example', () => {
  // 0.39 x 8 + 11.8 x 2.125 - 15.59 = 12.605
  const rep = PP.report(PLATYPUS);
  assert.ok(Math.abs(rep.kincaid - 12.605) < 0.02, 'got ' + rep.kincaid);
  assert.equal(PP.fmt(rep.kincaid), '12.6');
});

test('Flesch-Kincaid can dip below grade 1 on very easy text', () => {
  // 0.39 x 3 + 11.8 x 1 - 15.59 = -2.62
  const rep = PP.report('The dog ran.');
  assert.ok(Math.abs(rep.kincaid - (-2.62)) < 0.02, 'got ' + rep.kincaid);
});

test('Gunning Fog matches its published arithmetic', () => {
  // 0.4 x (8 + 100 x 3 / 8) = 18.2
  const rep = PP.report(PLATYPUS);
  assert.ok(Math.abs(rep.fog - 18.2) < 0.02, 'got ' + rep.fog);
});

test('Gunning Fog with no complex words is just sentence length scaled', () => {
  // 0.4 x (3 + 0) = 1.2
  const rep = PP.report('The cat sat. The dog ran.');
  assert.ok(Math.abs(rep.fog - 1.2) < 0.02, 'got ' + rep.fog);
});

test('SMOG short text uses the complete published formula', () => {
  // 8 polysyllables in 4 sentences: 1.0430 x sqrt(30 x 8 / 4) + 3.1291 = 11.21
  const text = 'Elephants remember. Umbrellas protect bananas. Tomatoes ripen tomorrow. Potatoes develop quietly.';
  const rep = PP.report(text);
  assert.ok(Math.abs(rep.smog - 11.21) < 0.02, 'got ' + rep.smog);
  assert.equal(PP.fmt(rep.smog), '11.2');
});

test('SMOG long text uses classic grading, 3 plus the square root over 30 sentences', () => {
  const parts = [];
  for (let i = 0; i < 12; i++) parts.push('Education matters.');
  for (let i = 0; i < 18; i++) parts.push('The cat sat.');
  const rep = PP.report(parts.join(' '));
  // 3 + sqrt(12) = 6.46
  assert.ok(Math.abs(rep.smog - 6.46) < 0.02, 'got ' + rep.smog);
  assert.equal(PP.fmt(rep.smog), '6.5');
});

test('SMOG reports nothing without text', () => {
  assert.equal(PP.report('').smog, null);
});

test('Dale-Chall on all familiar words is the bare sentence length term', () => {
  // 0 unfamiliar of 12, ASL 6: 0.0496 x 6 = 0.3
  const text = 'The cat sat on the bed. The dog ran to the boy.';
  const rep = PP.report(text);
  assert.ok(Math.abs(rep.daleChall - 0.2976) < 0.02, 'got ' + rep.daleChall);
});

test('Dale-Chall adds 3.6365 when unfamiliar words top five percent', () => {
  // 2 unfamiliar of 8, PDW 25, ASL 8: 0.1579 x 25 + 0.0496 x 8 + 3.6365 = 7.98
  const text = 'The boy saw a spectacle near the harbor.';
  const rep = PP.report(text);
  assert.ok(Math.abs(rep.daleChall - 7.9808) < 0.02, 'got ' + rep.daleChall);
  assert.equal(rep.daleChallLabel, 'Grades 11 and 12');
});

test('Dale-Chall skips the adjustment at exactly five percent', () => {
  // 1 unfamiliar of 20, PDW 5, ASL 20: 0.1579 x 5 + 0.0496 x 20 = 1.78, no adder
  const text = 'The old man and the dog sat near the fire while the boy and the girl played a serenade today.';
  const rep = PP.report(text);
  assert.ok(rep.daleChall < 3, 'got ' + rep.daleChall);
  assert.ok(Math.abs(rep.daleChall - 1.7815) < 0.02, 'got ' + rep.daleChall);
});

test('Dale-Chall raw scores map onto the published grade table', () => {
  assert.equal(PP.daleChallGrade(3.2), 4);
  assert.equal(PP.daleChallGrade(5.5), 6);
  assert.equal(PP.daleChallGrade(6.4), 8);
  assert.equal(PP.daleChallGrade(7.3), 10);
  assert.equal(PP.daleChallGrade(8.2), 12);
  assert.equal(PP.daleChallGrade(9.4), 14);
});

test('Reading Ease bands carry their standard labels', () => {
  assert.equal(PP.fleschBandLabel(95), 'Very easy');
  assert.equal(PP.fleschBandLabel(85), 'Easy');
  assert.equal(PP.fleschBandLabel(65), 'Plain English');
  assert.equal(PP.fleschBandLabel(25), 'Very confusing');
});

test('Reading Ease converts to grades through the standard table', () => {
  assert.equal(PP.fleschGrade(92), 5);
  assert.equal(PP.fleschGrade(85), 6);
  assert.equal(PP.fleschGrade(65), 8);
  assert.equal(PP.fleschGrade(25), 16);
});

test('empty input yields a null report instead of NaN', () => {
  const rep = PP.report('');
  assert.equal(rep.stats.wordCount, 0);
  assert.equal(rep.flesch, null);
  assert.equal(rep.kincaid, null);
  assert.equal(rep.fog, null);
  assert.equal(rep.daleChall, null);
});

test('the engine is deterministic, same text in, identical report out', () => {
  const a = JSON.stringify(PP.report(PLATYPUS));
  const b = JSON.stringify(PP.report(PLATYPUS));
  assert.equal(a, b);
});

test('reading time is words over a quiet 200 per minute', () => {
  const st = PP.analyze(Array.from({ length: 401 }, () => 'cat').join(' '));
  assert.ok(Math.abs(st.readingMinutes - 2.005) < 1e-9);
});

test('the three longest sentences lead with word counts and a split hint', () => {
  const short = 'The cat sat.';
  const mid = 'The school sent home a letter about the new schedule on Friday afternoon without any warning at all.';
  const long = 'The school sent home a long letter about the new schedule, and it asked every family to reply before Friday ends this month.';
  const rows = PP.longestSentences([short, mid, long].join(' '), 3);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].words, 23);
  assert.ok(rows[0].hint.includes('"and"'), rows[0].hint);
});
