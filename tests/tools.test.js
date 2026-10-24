/*
 * Tests for the Jargon Radar, the Rewrite Bench transforms, the word diff,
 * and the Audience Dial. Every expected string is hand derived from the
 * documented transform rules, so a regression shows up as a plain mismatch.
 */
const test = require('node:test');
const assert = require('node:assert');
const PP = require('../js/engine.js');

/* ---------- Jargon Radar ---------- */

test('the term list parses term and plain wording pairs', () => {
  const terms = PP.parseTermList('utilize = use\ndue diligence\n\n');
  assert.equal(terms.length, 2);
  assert.equal(terms[0].term, 'utilize');
  assert.equal(terms[0].plain, 'use');
  assert.equal(terms[1].plain, '');
});

test('jargon hits carry counts and a first example sentence', () => {
  const hits = PP.findJargon('Please utilize the portal. You must utilize it today.', [{ term: 'utilize', plain: 'use' }]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].count, 2);
  assert.equal(hits[0].example, 'Please utilize the portal.');
});

test('jargon matching is case insensitive', () => {
  const hits = PP.findJargon('Utilize the form.', [{ term: 'utilize', plain: 'use' }]);
  assert.equal(hits[0].count, 1);
});

test('word boundaries stop partial matches', () => {
  const hits = PP.findJargon('The category is clear.', [{ term: 'cat', plain: '' }]);
  assert.equal(hits.length, 0);
});

test('multiword phrases are matched across their words', () => {
  const hits = PP.findJargon('Due to the fact that it rained, we stayed.', [{ term: 'due to the fact that', plain: 'because' }]);
  assert.equal(hits[0].count, 1);
  assert.equal(hits[0].plain, 'because');
});

test('hits sort by count before alphabet', () => {
  const hits = PP.findJargon(
    'Please utilize the portal and utilize the form to commence work.',
    [{ term: 'commence', plain: 'start' }, { term: 'utilize', plain: 'use' }]
  );
  assert.equal(hits[0].term, 'utilize');
  assert.equal(hits[1].term, 'commence');
});

test('clean text raises no hits', () => {
  assert.equal(PP.findJargon('', [{ term: 'utilize', plain: 'use' }]).length, 0);
});

/* ---------- Rewrite Bench, word swaps ---------- */

test('complex words swap with capitalization preserved', () => {
  const out = PP.replaceComplexWords('Utilize the form to commence enrollment.', ['utilize = use', 'commence = start']);
  assert.equal(out.text, 'Use the form to start enrollment.');
});

test('phrases swap before the words inside them could fire', () => {
  const out = PP.replaceComplexWords('In order to enroll, please utilize the portal.', ['in order to = to', 'utilize = use']);
  assert.equal(out.text, 'To enroll, please use the portal.');
  assert.equal(out.changes.length, 2);
});

test('empty plain wording deletes the phrase and tidies the sentence', () => {
  const out = PP.replaceComplexWords('Please be advised that the office opens at nine.', ['please be advised that =']);
  assert.equal(out.text, 'The office opens at nine.');
});

test('plain text passes through the dictionary untouched', () => {
  const out = PP.replaceComplexWords('The cat sat on the bed.', ['utilize = use']);
  assert.equal(out.text, 'The cat sat on the bed.');
  assert.equal(out.changes.length, 0);
});

/* ---------- Rewrite Bench, sentence splitting ---------- */

test('a long sentence splits at its comma before but', () => {
  const long = 'The district mailed every family a long letter about the new bus schedule, but it forgot to say when the routes start next fall.';
  const out = PP.splitLongSentences(long);
  assert.equal(out.splits, 1);
  assert.ok(out.text.includes('. But it forgot'), out.text);
  assert.equal(PP.splitSentences(out.text).length, 2);
});

test('splitting picks the conjunction closest to the middle', () => {
  const long = 'The team gathered all of the survey results from every classroom, and the helpers organized them into one binder, and the summary went to the board on Monday.';
  const out = PP.splitLongSentences(long);
  assert.equal(out.text, 'The team gathered all of the survey results from every classroom. The helpers organized them into one binder, and the summary went to the board on Monday.');
});

test('short sentences are left alone', () => {
  const out = PP.splitLongSentences('The cat sat on the bed. The dog ran to the boy.');
  assert.equal(out.splits, 0);
  assert.equal(out.text, 'The cat sat on the bed. The dog ran to the boy.');
});

test('a long sentence with no fair split point is left intact', () => {
  const long = 'Administration notified every household regarding the transportation modifications approximately fourteen days preceding the commencement of the revised attendance protocol without further delay yesterday.';
  const out = PP.splitLongSentences(long);
  assert.equal(out.splits, 0);
  assert.equal(out.text, long);
});

test('while clauses are hinted, never split, so both halves stay grammatical', () => {
  const long = 'The teachers waited patiently while the families settled into their seats near the back of the room before the assembly finally started early this morning.';
  const out = PP.splitLongSentences(long);
  assert.equal(out.splits, 0);
});

/* ---------- Rewrite Bench, passive voice ---------- */

test('a passive with a by agent gets a mechanical active suggestion', () => {
  const findings = PP.passiveFindings('The form was signed by the principal.');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].participle, 'signed');
  assert.equal(findings[0].agent, 'the principal');
  assert.equal(findings[0].active, 'The principal signed the form.');
});

test('a passive without an agent stays a hint', () => {
  const findings = PP.passiveFindings('The decision was finalized.');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].agent, null);
  assert.equal(findings[0].active, null);
});

test('irregular participles are flagged but never mechanically rewritten', () => {
  const findings = PP.passiveFindings('The song was sung.');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].participle, 'sung');
  assert.equal(findings[0].active, null);
});

test('the mechanical active version survives a longer sentence', () => {
  const findings = PP.passiveFindings('The children were excited by the news.');
  assert.equal(findings[0].active, 'The news excited the children.');
});

test('common be verb lookalikes do not trigger findings', () => {
  assert.equal(PP.passiveFindings('He was only seven.').length, 0);
  assert.equal(PP.passiveFindings('The cat sat.').length, 0);
});

/* ---------- word diff ---------- */

test('the diff marks one swapped word', () => {
  const ops = PP.wordDiff('the quick fox', 'the slow fox');
  assert.deepEqual(ops.map(function (o) { return o.type; }), ['eq', 'del', 'ins', 'eq']);
  assert.equal(ops[1].text, 'quick');
  assert.equal(ops[2].text, 'slow');
});

test('pure insertions and deletions come out clean', () => {
  const ins = PP.wordDiff('a b', 'a x b');
  assert.deepEqual(ins.map(function (o) { return o.type; }), ['eq', 'ins', 'eq']);
  const del = PP.wordDiff('a b c', 'a b');
  assert.deepEqual(del.map(function (o) { return o.type; }), ['eq', 'del']);
  assert.equal(del[0].text, 'a b');
});

test('identical text produces no changes', () => {
  const ops = PP.wordDiff('same words here', 'same words here');
  assert.ok(ops.every(function (o) { return o.type === 'eq'; }));
});

test('diff tokens keep their punctuation', () => {
  const ops = PP.wordDiff('Use the portal.', 'Use the form.');
  const del = ops.filter(function (o) { return o.type === 'del'; })[0];
  const ins = ops.filter(function (o) { return o.type === 'ins'; })[0];
  assert.equal(del.text, 'portal.');
  assert.equal(ins.text, 'form.');
});

test('the diff is case tolerant', () => {
  const ops = PP.wordDiff('Read the book', 'read the book');
  assert.ok(ops.every(function (o) { return o.type === 'eq'; }));
});

/* ---------- tidying ---------- */

test('tidy repairs spacing and sentence capitals after deletions', () => {
  assert.equal(PP.tidy('the  dog , however , ran . it was fast'), 'The dog, however, ran. It was fast');
});

/* ---------- Audience Dial ---------- */

const PLATYPUS = 'The Australian platypus is seemingly a hybrid mammal.';

test('five formulas are judged against the chosen band', () => {
  assert.equal(PP.gradeBands.length, 5);
  const rows = PP.dialVerdicts(PP.report(PLATYPUS), PP.gradeBands[4]);
  assert.equal(rows.length, 5);
  assert.equal(rows.filter(function (r) { return r.verdict === 'Pass'; }).length, 4);
});

test('the fog row is the one that misses the college band', () => {
  const rows = PP.dialVerdicts(PP.report(PLATYPUS), PP.gradeBands[4]);
  assert.equal(rows[2].verdict, 'Needs work');
  assert.equal(rows[2].over, 0.2);
});

test('a hard text lands well over a middle school band', () => {
  const rows = PP.dialVerdicts(PP.report(PLATYPUS), PP.gradeBands[1]);
  assert.equal(rows[1].verdict, 'Needs work');
  assert.equal(rows[1].over, 5.6);
});

test('an easy text passes a band above it', () => {
  const easy = PP.report('The cat sat on the bed. The dog ran to the boy.');
  const rows = PP.dialVerdicts(easy, PP.gradeBands[1]);
  assert.equal(rows[1].verdict, 'Pass');
});
