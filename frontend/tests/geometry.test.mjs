// Run with: node --test frontend/tests/geometry.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { motionOf, toSceneBox } from '../js/three/geometry.js';

const dims = { width: 2400, height: 2400, depth: 600 };
const near = (actual, expected) => actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-9, `${actual} != ${expected}`));

test('a part filling the whole envelope is centred on x and z and sits on the floor', () => {
  const box = toSceneBox({ position_mm: { x: 0, y: 0, z: 0 }, size_mm: { x: 2400, y: 2400, z: 600 } }, dims);
  near(box.size, [2.4, 2.4, 0.6]);
  near(box.center, [0, 1.2, 0]);
});

test('the front of the wardrobe (z = 0 mm) faces the viewer at +z', () => {
  const door = toSceneBox({ position_mm: { x: 0, y: 80, z: 0 }, size_mm: { x: 600, y: 2000, z: 20 } }, dims);
  near(door.center, [-0.9, 1.08, 0.29]);
});

test('the back panel ends up at -z', () => {
  const back = toSceneBox({ position_mm: { x: 18, y: 98, z: 592 }, size_mm: { x: 2364, y: 2284, z: 8 } }, dims);
  assert.ok(Math.abs(back.center[2] - -0.296) < 1e-9);
});

test('hinged doors swing outwards in opposite directions', () => {
  const left = motionOf({ type: 'door', params: { hinge: 'left' } });
  const right = motionOf({ type: 'door', params: { hinge: 'right' } });
  assert.equal(left.kind, 'swing');
  assert.ok(left.angle < 0 && right.angle > 0);
});

test('sliding doors move along x, drawers pull out along z, fixed parts do not move', () => {
  assert.deepEqual(motionOf({ type: 'door', params: { track: 0, travel_mm: 1000 } }), { kind: 'slide', axis: 'x', distance: 1 });
  assert.deepEqual(motionOf({ type: 'drawer', params: { travel_mm: 350 } }), { kind: 'slide', axis: 'z', distance: 0.35 });
  assert.equal(motionOf({ type: 'door', params: { track: 1, travel_mm: 0 } }), null);
  assert.equal(motionOf({ type: 'shelf' }), null);
});
