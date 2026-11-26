import pytest
from fastapi.testclient import TestClient

from app.catalog import example_v1 as catalog
from app.core.config import Settings
from app.domain.design_factory import build_design
from app.main import create_app
from app.schemas.design import Dimensions

DIMS = Dimensions(width=2400, height=2400, depth=600)


def by_type(design, component_type):
    return [c for c in design.components if c.type == component_type]


@pytest.mark.parametrize("wardrobe_type", ["hinged", "sliding"])
@pytest.mark.parametrize("width,height,depth", [(1200, 1800, 450), (2400, 2400, 600), (3600, 2800, 750), (2555, 2001, 613)])
def test_every_component_stays_inside_the_declared_envelope(wardrobe_type, width, height, depth):
    design = build_design(wardrobe_type, Dimensions(width=width, height=height, depth=depth))

    for c in design.components:
        assert c.size_mm.x > 0 and c.size_mm.y > 0 and c.size_mm.z > 0, c.id
        assert 0 <= c.position_mm.x and c.position_mm.x + c.size_mm.x <= width, c.id
        assert 0 <= c.position_mm.y and c.position_mm.y + c.size_mm.y <= height, c.id
        assert 0 <= c.position_mm.z and c.position_mm.z + c.size_mm.z <= depth, c.id


def test_component_ids_are_unique_and_stable_between_builds():
    first = [c.id for c in build_design("hinged", DIMS).components]
    second = [c.id for c in build_design("hinged", DIMS).components]

    assert len(set(first)) == len(first)
    assert first == second


def test_bays_fill_the_interior_width_exactly():
    design = build_design("hinged", Dimensions(width=2555, height=2400, depth=600))
    partitions = by_type(design, "partition")
    shelves = design.layout.bays

    assert len(shelves) == len(partitions) + 1
    interior = 2555 - 2 * catalog.BOARD_THICKNESS_MM
    assert sum(b.width_mm for b in shelves) + sum(p.size_mm.x for p in partitions) == interior


def test_hinged_design_has_two_alternating_doors_per_bay():
    design = build_design("hinged", DIMS)
    doors = by_type(design, "door")
    bays = len(by_type(design, "partition")) + 1

    assert len(doors) == 2 * bays
    assert [d.params["hinge"] for d in doors[:4]] == ["left", "right", "left", "right"]


def test_sliding_design_uses_two_tracks_and_overlapping_panels():
    design = build_design("sliding", DIMS)
    doors = by_type(design, "door")

    assert len(doors) >= 2
    assert {d.params["track"] for d in doors} == {0, 1}
    assert doors[0].position_mm.x + doors[0].size_mm.x > doors[1].position_mm.x  # overlap
    assert doors[-1].position_mm.x + doors[-1].size_mm.x == DIMS.width
    assert all("hinge" not in d.params for d in doors)


def test_drawers_declare_their_travel_for_the_open_animation():
    drawers = by_type(build_design("hinged", DIMS), "drawer")

    assert len(drawers) == 2
    assert all(0 < d.params["travel_mm"] < d.size_mm.z for d in drawers)


def test_design_carries_schema_catalog_and_material_metadata():
    design = build_design("sliding", DIMS, {"carcass": "walnut"})

    assert design.schema_version == 1
    assert design.revision == 1
    assert design.catalog_version == catalog.CATALOG_VERSION
    assert design.wardrobe_type == "sliding"
    assert design.material_selections == {"carcass": "walnut", "doors": "cashmere"}


client = TestClient(create_app(Settings(environment="test")))


def test_post_designs_returns_design_in_envelope():
    response = client.post("/api/designs", json={"wardrobe_type": "hinged", "dimensions_mm": DIMS.model_dump()})

    body = response.json()
    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["dimensions_mm"] == {"width": 2400, "height": 2400, "depth": 600}
    assert len(body["data"]["components"]) > 10


@pytest.mark.parametrize(
    "payload",
    [
        {"wardrobe_type": "corner", "dimensions_mm": {"width": 2400, "height": 2400, "depth": 600}},
        {"wardrobe_type": "hinged", "dimensions_mm": {"width": 99999, "height": 2400, "depth": 600}},
        {"wardrobe_type": "hinged", "dimensions_mm": {"width": 2400.5, "height": 2400, "depth": 600}},
        {"wardrobe_type": "hinged", "dimensions_mm": {"width": 2400, "height": 2400, "depth": 600},
         "material_selections": {"carcass": "unobtainium"}},
        {"wardrobe_type": "hinged"},
    ],
)
def test_post_designs_rejects_invalid_input_with_envelope(payload):
    response = client.post("/api/designs", json=payload)

    assert response.status_code == 422
    assert response.json()["success"] is False
    assert response.json()["error"]
