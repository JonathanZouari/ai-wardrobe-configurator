// Builds the Three.js objects for a canonical design. Every mesh comes from a design
// component; nothing here invents geometry (handles are visual-only decoration).
import * as THREE from 'three';

import { motionOf, toSceneBox } from './geometry.js';

const HANDLE = { width: 0.012, height: 0.32, depth: 0.025, inset: 0.03 };

function materialFor(component, materials) {
  if (component.type === 'door') return materials.door;
  if (component.type === 'rail') return materials.metal;
  return materials.carcass;
}

function meshFor(component, box, material) {
  const [w, h, d] = box.size;
  const mesh = component.type === 'rail'
    ? new THREE.Mesh(new THREE.CylinderGeometry(h / 2, h / 2, w, 16).rotateZ(Math.PI / 2), material)
    : new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.componentId = component.id;
  return mesh;
}

function handle(materials, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(HANDLE.width, HANDLE.height, HANDLE.depth), materials.handle);
  mesh.position.set(x, y, z);
  return mesh;
}

// Returns { group, movers }. A mover is { id, type, object, apply(t) } with t from 0 (closed) to 1 (open).
export function buildWardrobe(design, materials) {
  const group = new THREE.Group();
  const movers = [];

  for (const component of design.components) {
    const box = toSceneBox(component, design.dimensions_mm);
    const [w, , d] = box.size;
    const [cx, cy, cz] = box.center;
    const mesh = meshFor(component, box, materialFor(component, materials));
    const motion = motionOf(component);
    const holder = new THREE.Group();
    holder.add(mesh);
    group.add(holder);

    if (motion?.kind === 'swing') {
      // Pivot on the hinge edge so the leaf rotates like a real door.
      const side = motion.hinge === 'left' ? -1 : 1;
      holder.position.set(cx + side * (w / 2), cy, cz);
      mesh.position.x = -side * (w / 2);
      holder.add(handle(materials, -side * (w - HANDLE.inset), 0, d / 2 + HANDLE.depth / 2));
      movers.push({ id: component.id, type: 'door', object: holder, apply: (t) => { holder.rotation.y = motion.angle * t; } });
    } else {
      holder.position.set(cx, cy, cz);
      if (component.type === 'drawer') {
        const pull = handle(materials, 0, 0, d / 2 + HANDLE.depth / 2);
        pull.rotation.z = Math.PI / 2;
        holder.add(pull);
      }
      if (motion) {
        const start = holder.position[motion.axis];
        movers.push({
          id: component.id, type: component.type, object: holder,
          apply: (t) => { holder.position[motion.axis] = start + motion.distance * t; },
        });
      } else if (component.type === 'door') {
        movers.push({ id: component.id, type: 'door', object: holder, apply: () => {} });
      }
    }
  }
  return { group, movers };
}

export function disposeWardrobe(group) {
  group.traverse((child) => child.geometry?.dispose());
}
