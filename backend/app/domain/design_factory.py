"""Derives the full component list of a wardrobe from a small spec: type, overall size,
bay count and the interior items the customer placed.

Structural parts (carcass, partitions, doors) are always regenerated; interior items are
re-fitted to their bay. All arithmetic is in integer millimetres; any remainder from a
division is given to the last bay or door so parts always add up.
"""

from dataclasses import dataclass, field, replace
from uuid import uuid4

from app.catalog import example_v1 as c
from app.schemas.design import Bay, Component, Design, Dimensions, Layout, Vector, WardrobeType


@dataclass(frozen=True)
class Item:
    """An interior component as the customer placed it: bay and height above the interior floor."""

    id: str
    type: str
    bay: int
    y_mm: int


@dataclass(frozen=True)
class Spec:
    wardrobe_type: WardrobeType
    dimensions: Dimensions
    materials: dict[str, str]
    bays: int
    items: tuple[Item, ...] = ()
    accessories: tuple[str, ...] = ()
    design_id: str = field(default_factory=lambda: str(uuid4()))
    revision: int = 1
    next_number: int = 1


def _part(id_, type_, pos, size, compartment=None, catalog_ref="carcass-board", **params) -> Component:
    return Component(
        id=id_, type=type_, compartment=compartment, catalog_ref=catalog_ref,
        position_mm=Vector(x=pos[0], y=pos[1], z=pos[2]),
        size_mm=Vector(x=size[0], y=size[1], z=size[2]),
        params=params,
    )


def _split(total: int, parts: int) -> list[int]:
    """Split a length into equal integer parts; the last part absorbs the remainder."""
    base = total // parts
    return [base] * (parts - 1) + [total - base * (parts - 1)]


def _front_zone(wardrobe_type: WardrobeType) -> int:
    """Depth reserved at the front for the doors."""
    if wardrobe_type == "sliding":
        return 2 * c.DOOR_THICKNESS_MM + c.SLIDING_TRACK_GAP_MM
    return c.DOOR_THICKNESS_MM


def bay_range(dimensions: Dimensions) -> tuple[int, int]:
    """Smallest and largest bay count allowed for this width (example limits)."""
    inner = dimensions.width - 2 * c.BOARD_THICKNESS_MM
    return -(-inner // c.MAX_BAY_WIDTH_MM), max(1, inner // c.MIN_BAY_WIDTH_MM)


def layout_of(dimensions: Dimensions, bay_count: int) -> Layout:
    t = c.BOARD_THICKNESS_MM
    widths = _split(dimensions.width - 2 * t - (bay_count - 1) * t, bay_count)
    bays, x = [], t
    for width in widths:
        bays.append(Bay(x_mm=x, width_mm=width))
        x += width + t
    floor = c.PLINTH_HEIGHT_MM + t
    return Layout(bays=bays, interior_floor_mm=floor, interior_height_mm=dimensions.height - t - floor)


def _carcass(d: Dimensions, front: int) -> list[Component]:
    t, plinth = c.BOARD_THICKNESS_MM, c.PLINTH_HEIGHT_MM
    body_depth = d.depth - front
    side = (t, d.height - plinth, body_depth)
    deck = (d.width - 2 * t, t, body_depth)
    return [
        _part("plinth", "plinth", (0, 0, front + c.PLINTH_RECESS_MM), (d.width, plinth, body_depth - c.PLINTH_RECESS_MM)),
        _part("side-left", "panel", (0, plinth, front), side),
        _part("side-right", "panel", (d.width - t, plinth, front), side),
        _part("bottom", "panel", (t, plinth, front), deck),
        _part("top", "panel", (t, d.height - t, front), deck),
        _part("back", "back", (t, plinth + t, d.depth - c.BACK_THICKNESS_MM),
              (d.width - 2 * t, d.height - plinth - 2 * t, c.BACK_THICKNESS_MM), catalog_ref="back-board"),
    ]


def _interior(spec: Spec, layout: Layout, front: int) -> list[Component]:
    t = c.BOARD_THICKNESS_MM
    z = front + c.INTERIOR_SETBACK_MM
    depth = spec.dimensions.depth - c.BACK_THICKNESS_MM - z
    floor, height = layout.interior_floor_mm, layout.interior_height_mm

    parts = [
        _part(f"partition-{i}", "partition", (bay.x_mm - t, floor, z), (t, height, depth))
        for i, bay in enumerate(layout.bays) if i > 0
    ]
    for item in spec.items:
        bay = layout.bays[item.bay]
        entry = c.COMPONENTS[item.type]
        y = floor + max(0, min(item.y_mm, height - entry["height_mm"]))
        if item.type == "rail":
            parts.append(_part(item.id, "rail", (bay.x_mm, y, z + (depth - c.RAIL_DIAMETER_MM) // 2),
                               (bay.width_mm, c.RAIL_DIAMETER_MM, c.RAIL_DIAMETER_MM), item.bay, entry["catalog_ref"]))
        elif item.type == "drawer":
            gap = c.DRAWER_SIDE_CLEARANCE_MM
            parts.append(_part(item.id, "drawer", (bay.x_mm + gap, y, z), (bay.width_mm - 2 * gap, entry["height_mm"], depth),
                               item.bay, entry["catalog_ref"], travel_mm=depth * 7 // 10))
        else:
            parts.append(_part(item.id, "shelf", (bay.x_mm, y, z), (bay.width_mm, t, depth), item.bay, entry["catalog_ref"]))
    return parts


def _hinged_doors(d: Dimensions, bay_count: int) -> list[Component]:
    gap, count = c.DOOR_GAP_MM, 2 * bay_count
    widths = _split(d.width - (count + 1) * gap, count)
    height = d.height - c.PLINTH_HEIGHT_MM - 2 * gap
    doors, x = [], gap
    for i, width in enumerate(widths):
        doors.append(_part(f"door-{i}", "door", (x, c.PLINTH_HEIGHT_MM + gap, 0), (width, height, c.DOOR_THICKNESS_MM),
                           i // 2, "hinged-door", hinge="left" if i % 2 == 0 else "right"))
        x += width + gap
    return doors


def _sliding_doors(d: Dimensions, bay_count: int) -> list[Component]:
    count, overlap = max(2, bay_count), c.SLIDING_OVERLAP_MM
    width = (d.width + (count - 1) * overlap) // count
    height = d.height - c.PLINTH_HEIGHT_MM - 2 * c.DOOR_GAP_MM
    doors = []
    for i in range(count):
        last = i == count - 1
        x = d.width - width if last else i * (width - overlap)
        track = i % 2
        # Front-track panels slide over their neighbour; back-track panels stay put.
        travel = 0 if track else (width - overlap) * (-1 if last else 1)
        doors.append(_part(f"door-{i}", "door",
                           (x, c.PLINTH_HEIGHT_MM + c.DOOR_GAP_MM, track * (c.DOOR_THICKNESS_MM + c.SLIDING_TRACK_GAP_MM)),
                           (width, height, c.DOOR_THICKNESS_MM), None, "sliding-door", track=track, travel_mm=travel))
    return doors


def template_items(spec: Spec, template: str) -> Spec:
    """Replace the interior with a catalog template, numbering the new items."""
    interior_height = layout_of(spec.dimensions, spec.bays).interior_height_mm
    items, number = [], spec.next_number
    for type_, selector, y in c.TEMPLATES[template]:
        for bay in (range(spec.bays) if selector == "all" else [selector]):
            items.append(Item(f"{type_}-{number}", type_, bay, y if y >= 0 else interior_height + y))
            number += 1
    return replace(spec, items=tuple(items), next_number=number)


def render(spec: Spec) -> Design:
    front = _front_zone(spec.wardrobe_type)
    layout = layout_of(spec.dimensions, spec.bays)
    doors = (_sliding_doors if spec.wardrobe_type == "sliding" else _hinged_doors)(spec.dimensions, spec.bays)
    return Design(
        design_id=spec.design_id,
        revision=spec.revision,
        wardrobe_type=spec.wardrobe_type,
        dimensions_mm=spec.dimensions,
        catalog_version=c.CATALOG_VERSION,
        layout=layout,
        components=[*_carcass(spec.dimensions, front), *_interior(spec, layout, front), *doors],
        material_selections=spec.materials,
        accessories=list(spec.accessories),
        door_configuration={"mechanism": spec.wardrobe_type, "count": len(doors), "bays": spec.bays},
        next_component_number=spec.next_number,
    )


def build_design(wardrobe_type: WardrobeType, dimensions: Dimensions,
                 material_selections: dict[str, str] | None = None, template: str = c.DEFAULT_TEMPLATE) -> Design:
    spec = Spec(
        wardrobe_type=wardrobe_type,
        dimensions=dimensions,
        materials={**c.DEFAULT_MATERIALS, **(material_selections or {})},
        bays=bay_range(dimensions)[0],
    )
    return render(template_items(spec, template))
