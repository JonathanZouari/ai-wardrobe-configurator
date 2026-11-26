import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampScale, parseSettings, defaultSettings, SCALE_MIN, SCALE_MAX } from '../js/a11y.js';

test('clampScale keeps the scale inside the range and on a step', () => {
  assert.equal(clampScale(130), 130);
  assert.equal(clampScale(134), 130);
  assert.equal(clampScale(10), SCALE_MIN);
  assert.equal(clampScale(999), SCALE_MAX);
  assert.equal(clampScale('abc'), SCALE_MIN);
  assert.equal(clampScale(Infinity), SCALE_MIN);
});

test('parseSettings returns defaults for missing or broken storage', () => {
  assert.deepEqual(parseSettings(null), defaultSettings());
  assert.deepEqual(parseSettings('not json'), defaultSettings());
  assert.deepEqual(parseSettings('42'), defaultSettings());
});

test('parseSettings keeps only known keys with strict types', () => {
  const s = parseSettings(JSON.stringify({ scale: 140, contrast: true, links: 'yes', evil: '<script>' }));
  assert.equal(s.scale, 140);
  assert.equal(s.contrast, true);
  assert.equal(s.links, false);
  assert.equal('evil' in s, false);
});
