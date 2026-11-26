// Text alternative for the 3D view: the same facts a sighted customer reads from the model.
const TYPE = { hinged: 'Hinged-door', sliding: 'Sliding-door' };

function describeBay(design, bay, index) {
  const items = design.components
    .filter((c) => c.compartment === index && ['shelf', 'rail', 'drawer'].includes(c.type))
    .sort((a, b) => a.position_mm.y - b.position_mm.y)
    .map((c) => `${c.type} at ${c.position_mm.y - design.layout.interior_floor_mm} mm`);
  return `Bay ${index + 1}, ${bay.width_mm} mm wide: ${items.join(', ') || 'empty'}.`;
}

export function describeDesign(design, finishes = design.material_selections) {
  const { width, height, depth } = design.dimensions_mm;
  const { count, bays } = design.door_configuration;
  return [
    `${TYPE[design.wardrobe_type]} wardrobe, ${width} × ${height} × ${depth} mm (width × height × depth).`,
    `${count} doors, ${bays} bays.`,
    `Interior finish: ${finishes.carcass}. Door finish: ${finishes.doors}.`,
    design.accessories.includes('led_lighting') ? 'LED lighting included.' : '',
    'Item heights are measured from the base of the interior.',
    ...design.layout.bays.map((bay, index) => describeBay(design, bay, index)),
  ].filter(Boolean).join(' ');
}
