import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFitZoom,
  clampZoom,
  formatZoomPercentage,
  sanitizeSvgFilename,
  stepZoom,
} from './previewUtils';

test('clampZoom bounds zoom between 0.1 and 8', () => {
  assert.equal(clampZoom(0.01), 0.1);
  assert.equal(clampZoom(15), 8);
  assert.equal(clampZoom(1.234), 1.23);
  assert.equal(clampZoom(Number.NaN), 1);
});

test('stepZoom scales up and down cleanly', () => {
  assert.equal(stepZoom(1, 'in'), 1.25);
  assert.equal(stepZoom(1, 'out'), 0.8);
});

test('calculateFitZoom computes exact fit within container padding', () => {
  const fit = calculateFitZoom(500, 500, 200, 200, 50);
  assert.equal(fit, 2);

  const fitTall = calculateFitZoom(400, 300, 400, 400, 50);
  assert.equal(fitTall, 0.5);
});

test('sanitizeSvgFilename produces safe .svg filenames', () => {
  assert.equal(sanitizeSvgFilename('Orbital Emblem'), 'orbital-emblem.svg');
  assert.equal(sanitizeSvgFilename('My Icon!! v2.svg'), 'my-icon-v2.svg');
  assert.equal(sanitizeSvgFilename('   '), 'untitled-artwork.svg');
});

test('formatZoomPercentage formats clean integer percentages', () => {
  assert.equal(formatZoomPercentage(1.5), '150%');
  assert.equal(formatZoomPercentage(0.05), '10%');
});
