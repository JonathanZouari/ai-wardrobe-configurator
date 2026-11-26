// Run with: node --test frontend/tests/*.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { describeDesign } from '../js/three/describe.js';

const design = {
  wardrobe_type: 'hinged',
  dimensions_mm: { width: 2400, height: 2400, depth: 600 },
  door_configuration: { count: 4, bays: 2 },
  layout: { interior_floor_mm: 98, bays: [{ width_mm: 1173 }, { width_mm: 1173 }] },
  material_selections: { carcass: 'oak', doors: 'cashmere' },
  accessories: ['led_lighting'],
  components: [
    { type: 'panel', compartment: null, position_mm: { y: 80 } },
    { type: 'shelf', compartment: 0, position_mm: { y: 1098 } },
    { type: 'drawer', compartment: 0, position_mm: { y: 98 } },
  ],
};

test('describes type, size, doors, finishes and accessories in words', () => {
  const text = describeDesign(design, { carcass: 'Oak', doors: 'Light' });
  assert.match(text, /Hinged-door wardrobe, 2400 × 2400 × 600 mm \(width × height × depth\)/);
  assert.match(text, /4 doors, 2 bays/);
  assert.match(text, /Interior finish: Oak\. Door finish: Light\./);
  assert.match(text, /LED lighting included/);
});

test('lists each bay from the bottom up, and says when a bay is empty', () => {
  const text = describeDesign(design);
  assert.match(text, /Bay 1, 1173 mm wide: drawer at 0 mm, shelf at 1000 mm\./);
  assert.match(text, /Bay 2, 1173 mm wide: empty\./);
});

test('leaves out accessories that are not selected', () => {
  assert.doesNotMatch(describeDesign({ ...design, accessories: [] }), /LED/);
});
