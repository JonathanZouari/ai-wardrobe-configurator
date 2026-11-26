// Pure mapping from the canonical design (integer mm, origin front-bottom-left, z towards the
// back wall) to scene space (metres, centred on x, y up, front facing +z). No Three.js here so
// it can be unit-tested with plain Node.
export const MM = 0.001;

export function toSceneBox(component, dims) {
  const { position_mm: p, size_mm: s } = component;
  return {
    size: [s.x * MM, s.y * MM, s.z * MM],
    center: [
      (p.x + s.x / 2 - dims.width / 2) * MM,
      (p.y + s.y / 2) * MM,
      (dims.depth / 2 - p.z - s.z / 2) * MM,
    ],
  };
}

// How a component moves between closed (0) and open (1), or null when it is static.
export function motionOf(component) {
  const { type, params = {} } = component;
  if (type === 'door' && params.hinge) {
    return { kind: 'swing', hinge: params.hinge, angle: (params.hinge === 'left' ? -1 : 1) * Math.PI * 0.58 };
  }
  if (type === 'door' && params.travel_mm) return { kind: 'slide', axis: 'x', distance: params.travel_mm / 1000 };
  if (type === 'drawer' && params.travel_mm) return { kind: 'slide', axis: 'z', distance: params.travel_mm / 1000 };
  return null;
}
