'use strict';

/*
 * Node side wiring smoke test for the PlainPage studio.
 * Loads the real index.html into a minimal DOM stub, runs the three shipped
 * scripts in order the way a browser would, and proves the main init path and
 * every panel flow execute without throwing. This is not part of npm test; run
 * it with `node scripts/dom-smoke.js`. It is a wiring check, not a browser.
 */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

/* ---------- minimal DOM stub ---------- */

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function parseAttrs(s) {
  const attrs = {};
  const re = /([a-zA-Z_:@][\w:.-]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s"'>]+))?/g;
  let a;
  while ((a = re.exec(s)) !== null) {
    attrs[a[1]] = a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '';
  }
  return attrs;
}

function makeEl(tag, attrs) {
  attrs = attrs || {};
  const el = {
    tagName: String(tag).toUpperCase(),
    children: [],
    parent: null,
    listeners: {},
    attrs: {},
    dataset: {},
    value: '',
    name: '',
    type: '',
    hidden: false,
    tabIndex: 0,
    disabled: false,
    checked: false,
    focused: false,
    offsetWidth: 100,
    style: {},
    title: '',
    _text: ''
  };
  el.id = attrs.id || '';
  const classSet = new Set((attrs.class || '').split(/\s+/).filter(Boolean));
  Object.defineProperty(el, 'className', {
    get: function () { return Array.from(classSet).join(' '); },
    set: function (v) {
      classSet.clear();
      String(v).split(/\s+/).filter(Boolean).forEach(function (c) { classSet.add(c); });
    }
  });
  el.classList = {
    add: function (c) { classSet.add(c); },
    remove: function (c) { classSet.delete(c); },
    toggle: function (c, force) {
      const want = force === undefined ? !classSet.has(c) : !!force;
      if (want) classSet.add(c); else classSet.delete(c);
    },
    contains: function (c) { return classSet.has(c); }
  };
  for (const k of Object.keys(attrs)) {
    el.attrs[k] = attrs[k];
    if (tag === 'input' && k === 'value') el.value = attrs[k];
    if (k === 'name') el.name = attrs[k];
    if (k === 'type') el.type = attrs[k];
    if (k === 'checked') el.checked = true;
    if (k === 'disabled') el.disabled = true;
    if (k === 'hidden') el.hidden = true;
  }

  el.getAttribute = function (k) { return k in el.attrs ? el.attrs[k] : null; };
  el.setAttribute = function (k, v) {
    el.attrs[k] = String(v);
    if (k === 'id') el.id = String(v);
    if (k === 'class') el.className = String(v);
  };
  el.removeAttribute = function (k) { delete el.attrs[k]; };

  el.appendChild = function (child) {
    if (child.parent) child.parent.removeChild(child);
    child.parent = el;
    el.children.push(child);
    return child;
  };
  el.removeChild = function (child) {
    const i = el.children.indexOf(child);
    if (i !== -1) el.children.splice(i, 1);
    child.parent = null;
    return child;
  };
  Object.defineProperty(el, 'firstChild', { get: function () { return el.children[0] || null; } });
  Object.defineProperty(el, 'textContent', {
    get: function () {
      if (el.children.length) return el.children.map(function (c) { return c.textContent; }).join('');
      return el._text;
    },
    set: function (v) { el._text = String(v); el.children = []; }
  });
  Object.defineProperty(el, 'innerText', {
    get: function () {
      if (el.children.length) return el.children.map(function (c) { return c.innerText; }).join('\n');
      return el._text;
    }
  });

  el.addEventListener = function (t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); };
  el.removeEventListener = function () {};
  el.dispatch = function (t, ev) { (el.listeners[t] || []).slice().forEach(function (fn) { fn(ev || {}); }); };
  el.focus = function () { el.focused = true; };
  el.scrollIntoView = function () {};

  function matches(node, sel) {
    // supports: #id, .class, tag, compound forms, [name="x"], and a trailing :checked
    let checked = false;
    if (sel.endsWith(':checked')) { checked = true; sel = sel.slice(0, -':checked'.length); }
    const m = sel.match(/^([a-zA-Z][a-zA-Z0-9-]*)?((?:[.#][\w-]+)*)(?:\[name="([^"]+)"\])?$/);
    if (!m) return false;
    if (m[1] && node.tagName !== m[1].toUpperCase()) return false;
    const rest = m[2] || '';
    for (const idWant of (rest.match(/#([\w-]+)/g) || []).map(function (s) { return s.slice(1); })) {
      if (node.id !== idWant) return false;
    }
    for (const cWant of (rest.match(/\.([\w-]+)/g) || []).map(function (s) { return s.slice(1); })) {
      if (!node.classList.contains(cWant)) return false;
    }
    if (m[3] !== undefined && node.name !== m[3]) return false;
    if (checked && !node.checked) return false;
    return true;
  }
  function walk(node, out) {
    node.children.forEach(function (c) { out.push(c); walk(c, out); });
    return out;
  }
  el.matches = function (sel) { return matches(el, sel); };
  el.querySelectorAll = function (sel) { return walk(el, []).filter(function (c) { return matches(c, sel); }); };
  el.querySelector = function (sel) { return el.querySelectorAll(sel)[0] || null; };
  return el;
}

/* parse the shipped markup so the harness runs against the real ids and classes */
const registry = {};
const all = [];
{
  const body = makeEl('body');
  const stack = [body];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const selfClosed = m[4] === '/' || VOID_TAGS.has(tag);
    if (closing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName === tag.toUpperCase()) { stack.length = i; break; }
      }
      continue;
    }
    const el = makeEl(tag, parseAttrs(m[3] || ''));
    stack[stack.length - 1].appendChild(el);
    all.push(el);
    if (el.id) {
      assert.ok(!registry[el.id], 'no duplicate id in index.html: ' + el.id);
      registry[el.id] = el;
    }
    if (tag === 'textarea') {
      const rest = html.slice(tagRe.lastIndex);
      const end = rest.search(/<\/textarea\s*>/i);
      if (end !== -1) { el.value = rest.slice(0, end); tagRe.lastIndex += end; }
    }
    if (!selfClosed) stack.push(el);
  }
  assert.ok(Object.keys(registry).length > 20, 'the harness parsed the real markup: ' + Object.keys(registry).length + ' id bearing elements');
}

const documentStub = {
  readyState: 'complete',
  getElementById: function (id) { return registry[id] || null; },
  createElement: function (tag) { return makeEl(tag); },
  createTextNode: function (t) { const n = makeEl('#text'); n._text = String(t); n.textContent = String(t); return n; },
  querySelector: function (sel) {
    for (const el of all) if (el.matches(sel)) return el;
    return null;
  },
  querySelectorAll: function (sel) { return all.filter(function (el) { return el.matches(sel); }); },
  addEventListener: function () {},
  execCommand: function () { return true; }
};

/* static wiring proof: every id app.js asks for must exist in the shipped HTML */
const appSource = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const wanted = new Set();
for (const m of appSource.matchAll(/\$\('([^']+)'\)/g)) wanted.add(m[1]);
const missing = Array.from(wanted).filter(function (id) { return !registry[id]; });
assert.deepStrictEqual(missing, [], 'every id referenced by app.js exists in the HTML');

/* run the shipped scripts in order, like the browser would */
global.window = globalThis;
global.document = documentStub;
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: function () { return Promise.resolve(); } } },
  configurable: true
});
const store = {};
global.window.localStorage = {
  getItem: function (k) { return k in store ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); }
};
require('../js/data.js');
require('../js/engine.js');
new Function('window', 'document', 'navigator', appSource + '\n//# sourceURL=plainpage.app.js')(global.window, global.document, global.navigator);

async function main() {
  let checks = 0;
  function ok(cond, msg) { checks += 1; assert.ok(cond, msg); }

  /* the studio opened in its rest state */
  ok(registry['input-count'].textContent === 'Nothing pasted yet.', 'the counter opens with its rest copy');
  ok(registry['report-re-band'].textContent === 'Paste text to begin', 'the hero band opens with its rest copy');
  ok(registry['panel-jargon'].hidden === true, 'the jargon panel opens hidden');
  ok(registry['panel-report'].hidden === false, 'the report panel opens visible');
  ok(registry['tab-report'].getAttribute('aria-selected') === 'true', 'the first tab is selected');
  ok(typeof registry['jargon-list'].value === 'string' && registry['jargon-list'].value.length > 40, 'the starter term list loaded into the textarea');

  /* the District Notice drives the whole report */
  registry['sample-notice'].dispatch('click', {});
  ok(registry['report-re'].textContent === '12.8', 'the District Notice scores Reading Ease 12.8, got ' + registry['report-re'].textContent);
  ok(registry['stat-words'].textContent !== '0', 'the word count updated');
  ok(registry['report-longest'].children.length === 3, 'three longest sentences rendered');
  ok(registry['input-count'].textContent.indexOf('words') !== -1, 'the live counter reads the sample');

  /* tabs switch */
  registry['tab-jargon'].dispatch('click', {});
  ok(registry['panel-jargon'].hidden === false && registry['panel-report'].hidden === true, 'clicking the jargon tab swaps panels');
  ok(registry['tab-jargon'].getAttribute('aria-selected') === 'true', 'the jargon tab is selected after the click');

  /* jargon list apply and reset */
  registry['jargon-list'].value = 'utilize = use\nlearning modality\n';
  registry['jargon-apply'].dispatch('click', {});
  ok(registry['jargon-status'].textContent.indexOf('2 terms scanned') !== -1, 'applying the list announces the scan count, got ' + registry['jargon-status'].textContent);
  registry['jargon-reset'].dispatch('click', {});
  ok(registry['jargon-status'].textContent === 'Starter list restored.', 'resetting restores the starter list');

  /* the bench runs end to end */
  registry['tab-bench'].dispatch('click', {});
  registry['run-bench'].dispatch('click', {});
  ok(registry['bench-status'].textContent.indexOf('Bench run') !== -1, 'the bench status reports a run, got ' + registry['bench-status'].textContent);
  ok(registry['bench-output'].children.length > 0, 'the bench output rendered paragraphs');
  ok(registry['bench-diff'].children.length > 0, 'the diff rendered');
  ok(registry['bench-scores'].hidden === false, 'the delta box is visible after a run');
  registry['copy-bench'].dispatch('click', {});
  await new Promise(function (r) { setTimeout(r, 10); });
  ok(registry['copy-status'].textContent === 'Copied to the clipboard.', 'the clipboard path reports success');

  /* the dial rejudges */
  registry['tab-dial'].dispatch('click', {});
  const radios = all.filter(function (e) { return e.tagName === 'INPUT' && e.name === 'dial-band'; });
  ok(radios.length === 5, 'five band radios exist');
  radios.forEach(function (r) { r.checked = r.value === '4-5'; });
  radios.filter(function (r) { return r.value === '4-5'; })[0].dispatch('change', {});
  ok(registry['dial-overall'].textContent.indexOf('Grades 4 and 5') !== -1, 'the dial overall names the chosen band, got ' + registry['dial-overall'].textContent);
  ok(registry['dial-rows'].children.length === 5, 'five dial verdict rows rendered');

  /* the Plain Letter path too */
  registry['sample-letter'].dispatch('click', {});
  ok(registry['report-re'].textContent === '97.8', 'the Plain Letter scores Reading Ease 97.8, got ' + registry['report-re'].textContent);

  /* clearing returns to rest */
  registry['clear-text'].dispatch('click', {});
  ok(registry['input-count'].textContent === 'Nothing pasted yet.', 'clearing returns the counter to rest copy');
  ok(registry['input-text'].focused === true, 'clearing focuses the textarea');

  console.log('dom smoke: ' + checks + ' checks passed across init, tabs, samples, jargon, bench, copy, dial, and clear');
}

main().catch(function (err) { console.error(err); process.exit(1); });
