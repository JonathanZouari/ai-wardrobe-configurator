"""Typed design operations (PRD section 5.2). Each operation maps a spec to a new spec;
a batch either applies completely and yields one new revision, or raises and changes nothing.
"""

from dataclasses import replace

from app.catalog import example_v1 as c
from app.domain.design_factory import Item, Spec, bay_range, render, template_items
from app.schemas import design as schema


class DomainError(Exception):
    """An operation that is well-formed but not allowed for this design."""


def spec_of(design: schema.Design) -> Spec:
    # The draft comes back from the client, so it is untrusted: refuse one that does not add up.
    bay_count = len(design.layout.bays)
    low, high = bay_range(design.dimensions_mm)
    editable = [p for p in design.components if p.type in c.COMPONENTS]
    if not low <= bay_count <= high or any(p.compartment is None or not 0 <= p.compartment < bay_count for p in editable):
        raise DomainError("The design is inconsistent; start a new design")
    floor = design.layout.interior_floor_mm
    return Spec(
        wardrobe_type=design.wardrobe_type,
        dimensions=design.dimensions_mm,
        materials=dict(design.material_selections),
        bays=len(design.layout.bays),
        items=tuple(Item(p.id, p.type, p.compartment, p.position_mm.y - floor) for p in editable),
        accessories=tuple(design.accessories),
        design_id=design.design_id,
        revision=design.revision,
        next_number=design.next_component_number,
    )


def _check_bay(spec: Spec, bay: int) -> None:
    if not 0 <= bay < spec.bays:
        raise DomainError(f"Bay {bay + 1} does not exist; this wardrobe has {spec.bays} bays")


def _find(spec: Spec, component_id: str) -> Item:
    for item in spec.items:
        if item.id == component_id:
            return item
    raise DomainError(f"Unknown component '{component_id}'")


def _add(spec: Spec, op: schema.AddComponent) -> Spec:
    _check_bay(spec, op.bay)
    item = Item(f"{op.type}-{spec.next_number}", op.type, op.bay, op.y_mm)
    return replace(spec, items=(*spec.items, item), next_number=spec.next_number + 1)


def _move(spec: Spec, op: schema.MoveComponent) -> Spec:
    current = _find(spec, op.id)
    moved = replace(current, bay=current.bay if op.bay is None else op.bay, y_mm=current.y_mm if op.y_mm is None else op.y_mm)
    _check_bay(spec, moved.bay)
    return replace(spec, items=tuple(moved if item.id == op.id else item for item in spec.items))


def _remove(spec: Spec, op: schema.RemoveComponent) -> Spec:
    _find(spec, op.id)
    return replace(spec, items=tuple(item for item in spec.items if item.id != op.id))


def _set_dimensions(spec: Spec, op: schema.SetDimensions) -> Spec:
    low, high = bay_range(op.dimensions_mm)
    bays = max(low, min(spec.bays, high))
    # Items in bays that no longer exist move to the last remaining bay.
    items = tuple(replace(item, bay=min(item.bay, bays - 1)) for item in spec.items)
    return replace(spec, dimensions=op.dimensions_mm, bays=bays, items=items)


def _set_bays(spec: Spec, op: schema.SetBays) -> Spec:
    low, high = bay_range(spec.dimensions)
    if not low <= op.count <= high:
        raise DomainError(f"This width allows {low} to {high} bays")
    items = tuple(replace(item, bay=min(item.bay, op.count - 1)) for item in spec.items)
    return replace(spec, bays=op.count, items=items)


def _set_material(spec: Spec, op: schema.SetMaterial) -> Spec:
    if op.key not in c.MATERIALS.get(op.slot, ()):
        raise DomainError(f"Unknown material '{op.key}' for '{op.slot}'")
    return replace(spec, materials={**spec.materials, op.slot: op.key})


def _set_accessory(spec: Spec, op: schema.SetAccessory) -> Spec:
    if op.key not in c.ACCESSORIES:
        raise DomainError(f"Unknown accessory '{op.key}'")
    others = tuple(key for key in spec.accessories if key != op.key)
    return replace(spec, accessories=(*others, op.key) if op.enabled else others)


def _apply_template(spec: Spec, op: schema.ApplyTemplate) -> Spec:
    if op.template not in c.TEMPLATES:
        raise DomainError(f"Unknown template '{op.template}'")
    return template_items(spec, op.template)


_HANDLERS = {
    "add_component": _add,
    "move_component": _move,
    "remove_component": _remove,
    "set_dimensions": _set_dimensions,
    "set_wardrobe_type": lambda spec, op: replace(spec, wardrobe_type=op.wardrobe_type),
    "set_bays": _set_bays,
    "set_material": _set_material,
    "set_accessory": _set_accessory,
    "apply_template": _apply_template,
}


def apply_operations(design: schema.Design, operations: list) -> schema.Design:
    """Apply a batch atomically. Accepts operation models or plain dicts."""
    request = schema.ApplyOperationsRequest(design=design, operations=operations)
    spec = spec_of(design)
    for op in request.operations:
        spec = _HANDLERS[op.op](spec, op)
    return render(replace(spec, revision=design.revision + 1))
