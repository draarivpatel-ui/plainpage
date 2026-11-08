/*
 * Verification for the SHRINK <3 KB data-URI app.
 *
 * Checks the committed shrink-data-uri.txt is:
 *   - a single valid data:text/html;charset=utf-8,... URI under 3000 bytes,
 *   - a byte-exact encoding of shrink.html via decodeURIComponent,
 *   - a single-line ASCII source with no em or en dashes,
 * and then executes the page script inside a minimal DOM stub to prove the
 * readability, Flesch-Kincaid and jargon-density analyzer is interactive and
 * numerically correct, including its live oninput recompute.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const uri = fs.readFileSync(path.join(root, 'shrink-data-uri.txt'), 'utf8');
const html = fs.readFileSync(path.join(root, 'shrink.html'), 'utf8');
const PREFIX = 'data:text/html;charset=utf-8,';

test('the data URI is one line, valid, and strictly under 3000 bytes', () => {
  assert.ok(uri.startsWith(PREFIX));
  assert.ok(!/[\r\n]/.test(uri), 'the URI itself must be a single line');
  assert.ok(Buffer.byteLength(uri, 'utf8') < 3000);
  assert.ok(Buffer.byteLength(uri, 'utf8') > 0);
});

test('the URI decodes to a byte-exact copy of shrink.html', () => {
  const decoded = decodeURIComponent(uri.slice(PREFIX.length));
  assert.equal(decoded, html);
  assert.equal(Buffer.byteLength(decoded, 'utf8'), Buffer.byteLength(html, 'utf8'));
});

test('shrink.html is single-line ASCII with no em or en dashes', () => {
  assert.ok(!/[\r\n]/.test(html));
  assert.ok(!/[^\x00-\x7f]/.test(html));
  for (let i = 0; i < html.length; i++) {
    const code = html.charCodeAt(i);
    assert.ok(code >= 0x20 || code === 0x09, 'no control characters besides tab');
  }
  assert.ok(!html.includes(String.fromCharCode(0x2014)), 'no em dash');
  assert.ok(!html.includes(String.fromCharCode(0x2013)), 'no en dash');
  assert.ok(html.includes('<script>'));
  assert.ok(html.includes('oninput=go()'));
});

// Pull the page script out of the decoded markup.
function pageScript() {
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(m, 'a script block is present');
  return m[1];
}

// Run the page script with a tiny DOM stub and return the rendered report for
// a given text, plus a hook to fire the live input event again.
function run(text) {
  const elements = {
    t: { value: text, innerHTML: '' },
    o: { innerHTML: '', value: text },
  };
  const document = {
    getElementById(id) {
      return elements[id];
    },
  };
  const context = { document, Math, String, Number, Object };
  vm.createContext(context);
  vm.runInContext(pageScript(), context);
  return {
    report: elements.o.innerHTML,
    change(next) {
      elements.t.value = next;
      // The page wires recompute through oninput=go(); trigger it the same way.
      vm.runInContext('go()', context);
      return elements.o.innerHTML;
    },
    context,
  };
}

function grade(report) {
  const m = report.match(/Flesch-Kincaid Grade: (-?[0-9.]+)/);
  return m ? Number(m[1]) : NaN;
}
function ease(report) {
  const m = report.match(/Reading Ease \(Flesch\): ([0-9.-]+)/);
  return m ? Number(m[1]) : NaN;
}
function density(report) {
  const m = report.match(/Jargon density: ([0-9.]+)%/);
  return m ? Number(m[1]) : NaN;
}

test('the app renders a report on load and recomputes on input', () => {
  const r = run('The cat sat on the mat. It was a warm and quiet day.');
  assert.ok(r.report.includes('Words:'));
  assert.ok(r.report.includes('Reading Ease'));
  assert.ok(r.report.includes('Flesch-Kincaid Grade'));
  assert.ok(r.report.includes('Jargon density'));

  // Live interaction: changing the textarea and firing go() updates the
  // numbers, proving the analyzer is interactive rather than static.
  const before = r.report;
  const after = r.change('We must utilize this methodology to facilitate subsequent modifications and implement a robust paradigm shift across every granular objective.');
  assert.notEqual(after, before);
  assert.ok(density(after) > density(before), 'jargon density rises on jargon-heavy text');
});

test('counts and formulas match independent hand arithmetic', () => {
  // "The cat sat." -> 3 words, 1 sentence, 3 syllables, 0 jargon.
  const r = run('The cat sat.');
  assert.ok(r.report.startsWith('Words: 3 | Sentences: 1 | Syllables: 3 | Jargon words: 0'));

  // wps = 3/1 = 3, spw = 3/3 = 1.
  // Flesch ease = 206.835 - 1.015*3 - 84.6*1 = 119.19 -> 119.2
  // FK grade    = 0.39*3 + 11.8*1 - 15.59            = -2.62  -> -2.6
  assert.equal(ease(r.report), 119.2);
  assert.equal(grade(r.report), -2.6);
  assert.equal(density(r.report), 0);
});

test('jargon density is measured against the built-in term list', () => {
  // 4 words, exactly 1 flagged term ("utilize") -> 25.0%.
  const r = run('Please utilize this now.');
  assert.ok(/Jargon words: 1/.test(r.report));
  assert.equal(density(r.report), 25);

  // An all-clean sentence reports zero jargon.
  const clean = run('The happy dog ran home today.');
  assert.ok(/Jargon words: 0/.test(clean.report));
  assert.equal(density(clean.report), 0);
});
