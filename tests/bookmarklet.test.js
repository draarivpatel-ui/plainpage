const test = require("node:test");
const assert = require("node:assert/strict");
const { countSyllables, analyzeSelection } = require("../bookmarklet.js");

test("PlainPage bookmarklet counts syllables and flags jargon terms accurately", () => {
  assert.equal(countSyllables("cat"), 1);
  assert.equal(countSyllables("utilize"), 3);

  const sample =
    "We must utilize this methodology to facilitate subsequent modifications. Prior endeavors demonstrate that simple words help readers.";
  const report = analyzeSelection(sample);

  assert.equal(report.sentences, 2);
  assert.ok(report.words >= 16);
  assert.ok(report.kincaidGrade > 8);
  assert.ok(report.jargonHits.length >= 5);

  const terms = report.jargonHits.map((h) => h.term);
  assert.ok(terms.includes("utilize"));
  assert.ok(terms.includes("methodology"));
  assert.ok(terms.includes("facilitate"));
});
