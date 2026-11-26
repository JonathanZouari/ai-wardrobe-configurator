import pytest
from fastapi.testclient import TestClient

from app.catalog import example_v1 as catalog
from app.core.config import Settings
from app.domain.design_factory import build_design
from app.domain.operations import DomainError, apply_operations
from app.main import create_app
from app.schemas.design import Dimensions

DIMS = Dimensions(width=2400, height=2400, depth=600)


def editable(design):
    return [c for c in design.components if c.type in catalog.COMPONENTS]


def find(design, component_id):
    return next(c for c in design.components if c.id == component_id)


def apply(design, *operations):
    return apply_operations(design, list(operations))


def assert_inside_envelope(design):
    d = design.dimensions_mm
    for c in design.components:
        assert 0 <= c.position_mm.x and c.position_mm.x + c.size_mm.x <= d.width, c.id
        assert 0 <= c.position_mm.y and c.position_mm.y + c.size_mm.y <= d.height, c.id
        assert 0 <= c.position_mm.z and c.position_mm.z + c.size_mm.z <= d.depth, c.id


def test_empty_template_has_a_carcass_and_doors_but_no_interior():
    design = build_design("hinged", DIMS, template="empty")

    assert editable(design) == []
    assert any(c.type == "door" for c in design.components)


def test_add_component_puts_it_in_the_bay_and_bumps_the_revision():
    design = build_design("hinged", DIMS, template="empty")

    result = apply(design, {"op": "add_component", "type": "shelf", "bay": 1, "y_mm": 900})

    [shelf] = editable(result)
    bay = result.layout.bays[1]
    assert (shelf.type, shelf.compartment) == ("shelf", 1)
    assert (shelf.position_mm.x, shelf.size_mm.x) == (bay.x_mm, bay.width_mm)
    assert shelf.position_mm.y == result.layout.interior_floor_mm + 900
    assert result.revision == design.revision + 1
    assert result.design_id == design.design_id
    assert editable(design) == []  # the input design is not mutated


def test_move_component_changes_height_and_bay_and_keeps_its_id():
    design = apply(build_design("hinged", DIMS, template="empty"), {"op": "add_component", "type": "rail", "bay": 0, "y_mm": 500})
    rail_id = editable(design)[0].id

    moved = apply(design, {"op": "move_component", "id": rail_id, "bay": 2, "y_mm": 1500})

    rail = find(moved, rail_id)
    assert rail.compartment == 2
    assert rail.position_mm.y == moved.layout.interior_floor_mm + 1500


def test_component_height_is_clamped_to_the_interior():
    design = apply(build_design("hinged", DIMS, template="empty"), {"op": "add_component", "type": "drawer", "bay": 0, "y_mm": 99999})

    assert_inside_envelope(design)


def test_remove_component_removes_only_that_component():
    design = build_design("hinged", DIMS)
    victim = editable(design)[0].id

    result = apply(design, {"op": "remove_component", "id": victim})

    assert victim not in [c.id for c in result.components]
    assert len(editable(result)) == len(editable(design)) - 1


def test_new_component_ids_never_reuse_a_removed_id_in_the_same_design():
    design = build_design("hinged", DIMS, template="empty")
    design = apply(design, {"op": "add_component", "type": "shelf", "bay": 0, "y_mm": 100},
                   {"op": "add_component", "type": "shelf", "bay": 0, "y_mm": 400})
    first, second = [c.id for c in editable(design)]

    design = apply(design, {"op": "remove_component", "id": first}, {"op": "add_component", "type": "shelf", "bay": 0, "y_mm": 700})

    ids = [c.id for c in editable(design)]
    assert second in ids and first not in ids and len(set(ids)) == 2


def test_resizing_keeps_interior_components_and_refits_them():
    design = apply(build_design("hinged", DIMS), {"op": "set_dimensions", "dimensions_mm": {"width": 1200, "height": 1800, "depth": 450}})

    assert design.dimensions_mm.width == 1200
    assert len(editable(design)) == len(editable(build_design("hinged", DIMS)))
    assert all(c.compartment < len(design.layout.bays) for c in editable(design))
    assert_inside_envelope(design)


def test_switching_type_keeps_the_interior_and_swaps_the_doors():
    hinged = build_design("hinged", DIMS)

    sliding = apply(hinged, {"op": "set_wardrobe_type", "wardrobe_type": "sliding"})

    assert sliding.wardrobe_type == "sliding"
    assert [c.id for c in editable(sliding)] == [c.id for c in editable(hinged)]
    assert all("track" in c.params for c in sliding.components if c.type == "door")
    assert_inside_envelope(sliding)


def test_set_bays_changes_partitions_and_doors():
    design = apply(build_design("hinged", DIMS), {"op": "set_bays", "count": 4})

    assert len(design.layout.bays) == 4
    assert sum(1 for c in design.components if c.type == "partition") == 3
    assert design.door_configuration["count"] == 8
    assert_inside_envelope(design)


def test_materials_accessories_and_templates_are_operations_too():
    design = apply(
        build_design("hinged", DIMS),
        {"op": "set_material", "slot": "carcass", "key": "walnut"},
        {"op": "set_accessory", "key": "led_lighting", "enabled": True},
        {"op": "apply_template", "template": "hanging"},
    )

    assert design.material_selections["carcass"] == "walnut"
    assert design.accessories == ["led_lighting"]
    assert {c.type for c in editable(design)} == {"shelf", "rail"}
    assert design.revision == 2  # one committed batch, one revision


@pytest.mark.parametrize(
    "operation",
    [
        {"op": "add_component", "type": "shelf", "bay": 9, "y_mm": 100},
        {"op": "move_component", "id": "does-not-exist", "y_mm": 100},
        {"op": "remove_component", "id": "side-left"},  # structural parts are not editable
        {"op": "set_bays", "count": 1},  # bays would be wider than the example limit
        {"op": "set_bays", "count": 40},
        {"op": "set_material", "slot": "carcass", "key": "unobtainium"},
        {"op": "set_accessory", "key": "jacuzzi", "enabled": True},
        {"op": "apply_template", "template": "nope"},
    ],
)
def test_invalid_operations_are_rejected_and_nothing_is_applied(operation):
    design = build_design("hinged", DIMS)

    with pytest.raises(DomainError):
        apply(design, {"op": "set_material", "slot": "doors", "key": "umber"}, operation)


client = TestClient(create_app(Settings(environment="test")))


def test_catalog_endpoint_lists_what_the_editor_can_use():
    data = client.get("/api/catalog").json()["data"]

    assert data["version"] == catalog.CATALOG_VERSION
    assert set(data["components"]) == {"shelf", "rail", "drawer"}
    assert "empty" in data["templates"] and "led_lighting" in data["accessories"]
    assert data["limits_mm"]["width"] == [1200, 3600]


def test_operations_endpoint_round_trip():
    design = client.post("/api/designs", json={"wardrobe_type": "hinged", "dimensions_mm": DIMS.model_dump(), "template": "empty"}).json()["data"]

    response = client.post("/api/designs/operations", json={
        "design": design, "operations": [{"op": "add_component", "type": "drawer", "bay": 0, "y_mm": 0}]})

    assert response.status_code == 200
    assert response.json()["data"]["revision"] == 2
    assert any(c["type"] == "drawer" for c in response.json()["data"]["components"])


def test_operations_endpoint_reports_domain_errors_as_400():
    design = client.post("/api/designs", json={"wardrobe_type": "hinged", "dimensions_mm": DIMS.model_dump()}).json()["data"]

    response = client.post("/api/designs/operations", json={
        "design": design, "operations": [{"op": "remove_component", "id": "ghost"}]})

    assert response.status_code == 400
    assert response.json() == {"success": False, "data": None, "error": "Unknown component 'ghost'"}


def test_operations_endpoint_rejects_unknown_operation_types():
    design = client.post("/api/designs", json={"wardrobe_type": "hinged", "dimensions_mm": DIMS.model_dump()}).json()["data"]

    response = client.post("/api/designs/operations", json={"design": design, "operations": [{"op": "drop_database"}]})

    assert response.status_code == 422


def test_a_tampered_draft_is_refused_instead_of_crashing():
    design = client.post("/api/designs", json={"wardrobe_type": "hinged", "dimensions_mm": DIMS.model_dump()}).json()["data"]
    shelf = next(c for c in design["components"] if c["type"] == "shelf")
    shelf["compartment"] = 99

    response = client.post("/api/designs/operations", json={
        "design": design, "operations": [{"op": "set_accessory", "key": "led_lighting", "enabled": True}]})

    assert response.status_code == 400
    assert response.json()["success"] is False
