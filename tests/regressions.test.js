'use strict';
// Regression coverage for the findings fixed during the adversarial audit:
// sentence splitting around abbreviations, Unicode tokens, apostrophe
// normalization, term boundaries, the passive detector in both directions,
// verbatim no-op transforms, diff visibility, and bookmarklet parity.

const test = require('node:test');
const assert = require('node:assert');
const engine = require('../js/engine.js');
const bookmarklet = require('../bookmarklet.js');

test('sentences survive abbreviations, initials and acronyms', () => {
  assert.equal(engine.splitSentences('Use e.g. the form. It works.').length, 2);
  assert.equal(engine.splitSentences('J. R. R. Tolkien wrote it. He did.').length, 2);
  assert.equal(engine.splitSentences('The U.S. mail arrived. It came.').length, 2);
  assert.equal(engine.splitSentences('Dr. J. Smith met Mrs. J. Lee.').length, 1);
  assert.equal(engine.splitSentences('i.e. this means that. Yes it does.').length, 2);
});

test('a run of punctuation is not a sentence', () => {
  assert.equal(engine.splitSentences('Hello world. !!! Bye now.').length, 2);
  assert.equal(engine.splitSentences('Really???').length, 1);
});

test('decimal points still do not split', () => {
  assert.equal(engine.splitSentences('It costs 3.50 dollars. Done.').length, 2);
});

test('words keeps accented and non ASCII letters whole', () => {
  assert.deepEqual(engine.words('The café served résumé paper'), ['The', 'café', 'served', 'résumé', 'paper']);
  assert.equal(engine.words('naïve').length, 1);
  assert.equal(engine.words('state-of-the-art').length, 4);
});

test('curly apostrophes score the same as straight ones', () => {
  assert.equal(engine.isFamiliar('don’t'), engine.isFamiliar("don't"));
  const straight = engine.report("It is difficult. Don't do it.");
  const curly = engine.report('It is difficult. Don’t do it.');
  assert.equal(curly.daleChall, straight.daleChall);
  assert.equal(curly.stats.difficultWords, straight.stats.difficultWords);
});

test('jargon terms ending in non word characters still match', () => {
  const hits = engine.findJargon('We use c++ daily.', [{ term: 'c++', plain: 'cpp' }]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].count, 1);
  // An accented term matches its accented occurrence.
  assert.equal(engine.findJargon('The café is open.', [{ term: 'café', plain: 'cafe' }]).length, 1);
  // Boundaries still hold: "cat" must not fire inside "category".
  assert.equal(engine.findJargon('The category is fine.', [{ term: 'cat', plain: 'pet' }]).length, 0);
});

test('bench swaps honor terms with non word edges', () => {
  const out = engine.replaceComplexWords('We use c++ daily.', ['c++ = a language']);
  assert.equal(out.text, 'We use a language daily.');
  assert.equal(out.changes.length, 1);
});

test('stative be plus adjective is not a passive finding', () => {
  for (const s of [
    'I am tired.',
    'The door is red.',
    'The bridge is wooden.',
    'The students were confused.',
    'The stop was sudden.',
    'The medals were golden.',
    'The work is done.',
    'He was only seven.'
  ]) {
    assert.equal(engine.passiveFindings(s).length, 0, s);
  }
});

test('canonical passives are found: being, just, thrown, got', () => {
  const being = engine.passiveFindings('The letter is being written by Ana.');
  assert.equal(being.length, 1);
  assert.equal(being[0].agent, 'Ana');
  assert.equal(engine.passiveFindings('The form was just signed.').length, 1);
  assert.equal(engine.passiveFindings('The ball was thrown.').length, 1);
  assert.equal(engine.passiveFindings('It got signed.').length, 1);
  assert.equal(engine.passiveFindings('The cake was baked.').length, 1);
});

test('an agent plus adjective still reads as passive', () => {
  const f = engine.passiveFindings('The children were excited by the news.');
  assert.equal(f.length, 1);
  assert.equal(f[0].agent, 'the news');
});

test('the agent stops at a clause boundary and the second passive is found', () => {
  const f = engine.passiveFindings('The form was signed by the principal and the report was filed by the clerk.');
  assert.equal(f.length, 2);
  assert.equal(f[0].agent, 'the principal');
  assert.equal(f[0].active, 'The principal signed the form and the report was filed by the clerk.');
  assert.equal(f[1].agent, 'the clerk');
});

test('a trailing prepositional phrase is not part of the agent', () => {
  const f = engine.passiveFindings('The ball was kicked by John into the yard.');
  assert.equal(f.length, 1);
  assert.equal(f[0].agent, 'John');
  assert.equal(f[0].active, 'John kicked the ball into the yard.');
});

test('the quoted verb keeps its adverbs', () => {
  const f = engine.passiveFindings('The kids were really excited by the news.');
  assert.equal(f[0].verb, 'were really excited');
});

test('tidy does not capitalize after abbreviations', () => {
  assert.equal(engine.tidy('use e.g. the form. it works.'), 'Use e.g. the form. It works.');
  const out = engine.replaceComplexWords('we must utilize, e.g. now.', ['utilize = use']);
  assert.equal(out.text, 'We must use, e.g. now.');
});

test('the diff surfaces punctuation-only changes', () => {
  const ops = engine.wordDiff('Hello ...', 'Hello !!!').filter(function (o) { return o.type !== 'eq'; });
  assert.equal(ops.length, 2);
  assert.equal(ops[0].type, 'del');
  assert.equal(ops[1].type, 'ins');
});

test('transforms with nothing to change return the input verbatim', () => {
  const weird = 'a  b   c.';
  assert.equal(engine.replaceComplexWords(weird, ['zzz = q']).text, weird);
  assert.equal(engine.splitLongSentences('short one.  short two.').text, 'short one.  short two.');
});

test('a short sentence gets a plain hint, not a misleading range note', () => {
  const rows = engine.longestSentences('Go fast now.');
  assert.equal(rows[0].hint, 'Within the 22 word limit, no split needed.');
});

test('bookmarklet tokenizer parity with the engine', () => {
  assert.equal(bookmarklet.countSyllables('queue'), 1);
  assert.equal(bookmarklet.countSyllables('chocolate'), 2);
  // Initials and honorifics stay inside one sentence.
  assert.equal(bookmarklet.analyzeSelection('Dr. J. Smith met Mrs. J. Lee. He left.').sentences, 2);
  // Digits count as words, same as the engine.
  assert.equal(bookmarklet.analyzeSelection('Call 555 0142 at 3.50 pm.').words, 7);
  // Accented words stay whole.
  assert.equal(bookmarklet.analyzeSelection('The café was wooden.').words, 4);
});
