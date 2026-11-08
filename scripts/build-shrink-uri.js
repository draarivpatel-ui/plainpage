/*
 * Builds shrink-data-uri.txt from the single-line shrink.html source and
 * verifies the result. Run with: node scripts/build-shrink-uri.js
 *
 * The output is one valid data:text/html;charset=utf-8,... URI. Two candidate
 * encodings are measured and the shortest is written:
 *   - "minimal": percent-encode only the bytes a URL parser must treat as
 *     special (percent, hash, quotes, backslash, non-ascii, control chars,
 *     and raw ampersand / plus / space which can confuse copy-paste into an
 *     href or address bar). Everything else stays literal ASCII.
 *   - "base64": the classic compact fallback.
 * The chosen URI must be strictly under 3000 bytes.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'shrink.html'), 'utf8');
const PREFIX = 'data:text/html;charset=utf-8,';
const LIMIT = 3000;

// The source must be a genuine single line (no embedded newlines).
if (/[\r\n]/.test(html.replace(/\n$/, ''))) {
  throw new Error('shrink.html must be a single line');
}

function pct(charCode) {
  return '%' + charCode.toString(16).toUpperCase().padStart(2, '0');
}

// Encode the UTF-8 byte stream, leaving only unambiguously safe ASCII literal.
function minimalEncode(str) {
  const bytes = Buffer.from(str, 'utf8');
  let out = '';
  for (const b of bytes) {
    const c = String.fromCharCode(b);
    const safe = /[A-Za-z0-9._~!$'()*,;=:@\/\-]/.test(c);
    // Keep alphanumerics and a conservative set of URL-safe punctuation.
    // Explicitly encoded: % # " \ + & < > [ ] { } | ^ ` space and controls.
    if (b < 0x21 || b > 0x7e || !safe) {
      out += pct(b);
    } else {
      out += c;
    }
  }
  return out;
}

const candidates = {
  minimal: PREFIX + minimalEncode(html),
  base64: PREFIX + ';base64,' + Buffer.from(html, 'utf8').toString('base64'),
};

for (const [name, uri] of Object.entries(candidates)) {
  process.stdout.write(`candidate ${name}: ${Buffer.byteLength(uri, 'utf8')} bytes\n`);
}

// Prefer the shortest valid candidate.
const chosen = Object.entries(candidates).sort(
  (a, b) => Buffer.byteLength(a[1], 'utf8') - Buffer.byteLength(b[1], 'utf8')
)[0];
const [encoding, uri] = chosen;
const size = Buffer.byteLength(uri, 'utf8');

if (size >= LIMIT) {
  throw new Error(`data URI is ${size} bytes, must be < ${LIMIT}`);
}

fs.writeFileSync(path.join(root, 'shrink-data-uri.txt'), uri, 'utf8');
process.stdout.write(`wrote shrink-data-uri.txt (${encoding}, ${size} bytes, no trailing newline)\n`);
