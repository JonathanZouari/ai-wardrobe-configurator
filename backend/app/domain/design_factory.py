"""Builds a complete example wardrobe as canonical components from type and overall size.

The layout (bay count, one shelf and rail per bay, two drawers in the first bay) is a
development example, not an approved template. All arithmetic is in integer millimetres;
any remainder from a division is given to the last bay or door so parts always add up.
"""

from uuid import uuid4

from app.catalog import example_v1 as c
from app.schemas.design import Component, Design, Dimensions, Vector, WardrobeType


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


def _interior(d: Dimensions, front: int) -> list[Component]:
    t = c.BOARD_THICKNESS_MM
    floor_y = c.PLINTH_HEIGHT_MM + t
    ceiling_y = d.height - t
    inner_width = d.width - 2 * t
    bay_count = -(-inner_width // c.MAX_BAY_WIDTH_MM)  # ceiling division
    bay_widths = _split(inner_width - (bay_count - 1) * t, bay_count)

    z = front + c.INTERIOR_SETBACK_MM
    depth = d.depth - c.BACK_THICKNESS_MM - z
    shelf_y = ceiling_y - c.TOP_SHELF_DROP_MM
    rail_y = shelf_y - c.RAIL_DROP_MM - c.RAIL_DIAMETER_MM
    rail_z = z + (depth - c.RAIL_DIAMETER_MM) // 2

    parts: list[Component] = []
    x = t
    for bay, width in enumerate(bay_widths):
        if bay > 0:
            parts.append(_part(f"partition-{bay}", "partition", (x - t, floor_y, z), (t, ceiling_y - floor_y, depth)))
        parts.append(_part(f"shelf-top-{bay}", "shelf", (x, shelf_y, z), (width, t, depth), bay))
        parts.append(_part(f"rail-{bay}", "rail", (x, rail_y, rail_z),
                           (width, c.RAIL_DIAMETER_MM, c.RAIL_DIAMETER_MM), bay, "hanging-rail"))
        if bay == 0:
            clearance = c.DRAWER_SIDE_CLEARANCE_MM
            for n in range(c.DRAWER_COUNT):
                parts.append(_part(f"drawer-{bay}-{n}", "drawer", (x + clearance, floor_y + n * c.DRAWER_HEIGHT_MM, z),
                                   (width - 2 * clearance, c.DRAWER_HEIGHT_MM - clearance, depth), bay,
                                   "soft-close-drawer", travel_mm=depth * 7 // 10))
            parts.append(_part(f"shelf-drawers-{bay}", "shelf",
                               (x, floor_y + c.DRAWER_COUNT * c.DRAWER_HEIGHT_MM, z), (width, t, depth), bay))
        x += width + t
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


def build_design(wardrobe_type: WardrobeType, dimensions: Dimensions,
                 material_selections: dict[str, str] | None = None) -> Design:
    front = _front_zone(wardrobe_type)
    interior = _interior(dimensions, front)
    bay_count = sum(1 for part in interior if part.type == "partition") + 1
    doors = (_sliding_doors if wardrobe_type == "sliding" else _hinged_doors)(dimensions, bay_count)
    return Design(
        design_id=str(uuid4()),
        wardrobe_type=wardrobe_type,
        dimensions_mm=dimensions,
        catalog_version=c.CATALOG_VERSION,
        components=[*_carcass(dimensions, front), *interior, *doors],
        material_selections={**c.DEFAULT_MATERIALS, **(material_selections or {})},
        door_configuration={"mechanism": wardrobe_type, "count": len(doors), "bays": bay_count},
    )
