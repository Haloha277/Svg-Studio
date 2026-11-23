import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSvgMarkup, processSvgForPreview } from './svgProcessor';

test('valid SVG passes validation and preserves standard features', () => {
  const input = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g1"><stop offset="0%" stop-color="#000"/></linearGradient>
      <clipPath id="c1"><rect x="0" y="0" width="50" height="50"/></clipPath>
    </defs>
    <g clip-path="url(#c1)">
      <circle cx="50" cy="50" r="40" fill="url(#g1)" />
      <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="2s" repeatCount="indefinite" />
    </g>
  </svg>`;

  const res = processSvgForPreview(input);
  assert.equal(res.valid, true);
  assert.equal(res.empty, false);
  assert.equal(res.diagnostics.length, 0);
  assert.equal(res.strippedCount, 0);
  assert.ok(res.sanitizedSvg?.includes('<linearGradient id="g1">'));
  assert.ok(res.sanitizedSvg?.includes('url(#c1)'));
  assert.ok(res.sanitizedSvg?.includes('<animateTransform'));
  assert.equal(res.viewBox, '0 0 100 100');
});

test('empty input returns empty state without crashing', () => {
  const res = processSvgForPreview('   \n  ');
  assert.equal(res.valid, false);
  assert.equal(res.empty, true);
  assert.equal(res.sanitizedSvg, null);
});

test('malformed XML and mismatched tags return line/column error diagnostics', () => {
  const missingClose = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="20">\n</svg>`;
  const res = processSvgForPreview(missingClose);
  assert.equal(res.valid, false);
  assert.equal(res.diagnostics[0].severity, 'error');
  assert.ok(res.diagnostics[0].message.includes('Mismatched closing tag'));
  assert.equal(res.diagnostics[0].line, 3);
});

test('non-svg root element is rejected', () => {
  const res = processSvgForPreview('<div class="box"><svg></svg></div>');
  assert.equal(res.valid, false);
  assert.ok(res.diagnostics[0].message.includes('Invalid root element <div>'));
});

test('invalid namespace and malformed viewBox are caught', () => {
  const badNs = '<svg xmlns="http://www.w3.org/1999/xhtml" viewBox="0 0 -10 100"></svg>';
  const res = processSvgForPreview(badNs);
  assert.equal(res.valid, false);
  assert.equal(res.diagnostics.length, 2);
});

test('security sanitizer strips scripts, inline handlers, javascript URLs, foreignObject, and external URLs', () => {
  const malicious = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 200 200" onload="alert(1)">
    <script>alert("xss")</script>
    <foreignObject width="100" height="100"><body xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(2)"/></body></foreignObject>
    <a href="javascript:alert(3)"><circle cx="50" cy="50" r="20" onclick="evil()" /></a>
    <image xlink:href="https://evil.example.com/tracker.png" width="50" height="50" />
    <style>@import url("https://evil.example.com/x.css"); rect { fill: red; }</style>
    <rect x="10" y="10" width="50" height="50" />
  </svg>`;

  const res = processSvgForPreview(malicious);
  assert.equal(res.valid, true);
  assert.ok(res.strippedCount >= 5);
  assert.ok(!res.sanitizedSvg?.includes('<script'));
  assert.ok(!res.sanitizedSvg?.includes('foreignObject'));
  assert.ok(!res.sanitizedSvg?.includes('onload'));
  assert.ok(!res.sanitizedSvg?.includes('onclick'));
  assert.ok(!res.sanitizedSvg?.includes('javascript:'));
  assert.ok(!res.sanitizedSvg?.includes('https://evil.example.com'));
  assert.ok(res.sanitizedSvg?.includes('<rect x="10" y="10" width="50" height="50" />'));
});

test('formatSvgMarkup formats nested XML cleanly and rejects malformed XML', () => {
  const unformatted = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><circle cx="50" cy="50" r="30"/><text x="10" y="20">Hello</text></g></svg>';
  const okRes = formatSvgMarkup(unformatted, 2);
  assert.equal(okRes.ok, true);
  assert.ok(okRes.formatted.includes('  <g>\n    <circle cx="50" cy="50" r="30" />\n    <text x="10" y="20">Hello</text>\n  </g>'));

  const badRes = formatSvgMarkup('<svg><circle></svg>', 2);
  assert.equal(badRes.ok, false);
  assert.equal(badRes.formatted, '<svg><circle></svg>');
  assert.ok(badRes.error?.message.includes('Cannot format malformed XML'));
});
