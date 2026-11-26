"""Canonical structured design (PRD section 5.1): the single source of truth for rendering,
validation and documentation.

Coordinate convention: integer millimetres, origin at the front-bottom-left corner of the
wardrobe envelope; x runs to the right, y up, z from the front towards the back wall.
A component's position is its minimum corner and its size extends in the positive directions.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, model_validator

from app.catalog import example_v1 as catalog

WardrobeType = Literal["hinged", "sliding"]
EditableType = Literal["shelf", "rail", "drawer"]
ComponentType = Literal["panel", "plinth", "back", "partition", "shelf", "rail", "drawer", "door"]


class Frozen(BaseModel):
    model_config = ConfigDict(frozen=True)


class Dimensions(Frozen):
    width: StrictInt
    height: StrictInt
    depth: StrictInt

    @model_validator(mode="after")
    def within_catalog_limits(self) -> "Dimensions":
        for field, (low, high) in catalog.LIMITS_MM.items():
            if not low <= getattr(self, field) <= high:
                raise ValueError(f"{field} must be between {low} and {high} mm")
        return self


class Vector(Frozen):
    x: int
    y: int
    z: int


class Component(Frozen):
    id: str = Field(max_length=64)
    type: ComponentType
    compartment: int | None = None
    position_mm: Vector
    size_mm: Vector
    catalog_ref: str = Field(max_length=64)
    params: dict[str, int | str] = Field(default_factory=dict)


class Bay(Frozen):
    x_mm: int
    width_mm: int


class Layout(Frozen):
    """Derived reference geometry the editor needs to place interior components."""

    bays: list[Bay] = Field(min_length=1, max_length=20)
    interior_floor_mm: int
    interior_height_mm: int


class Design(Frozen):
    schema_version: int = 1
    design_id: str = Field(max_length=64)
    revision: int = Field(default=1, ge=1)
    wardrobe_type: WardrobeType
    dimensions_mm: Dimensions
    catalog_version: str
    layout: Layout
    components: list[Component] = Field(max_length=500)
    material_selections: dict[str, str]
    accessories: list[str] = Field(default_factory=list, max_length=20)
    door_configuration: dict[str, int | str]
    # Monotonic counter so a new component never reuses the id of a removed one.
    next_component_number: int = Field(default=1, ge=1)


class CreateDesignRequest(BaseModel):
    wardrobe_type: WardrobeType
    dimensions_mm: Dimensions
    material_selections: dict[str, str] = Field(default_factory=dict)
    template: str = catalog.DEFAULT_TEMPLATE

    @model_validator(mode="after")
    def known_catalog_entries(self) -> "CreateDesignRequest":
        for slot, key in self.material_selections.items():
            if key not in catalog.MATERIALS.get(slot, ()):
                raise ValueError(f"unknown material '{key}' for '{slot}'")
        if self.template not in catalog.TEMPLATES:
            raise ValueError(f"unknown template '{self.template}'")
        return self


class AddComponent(BaseModel):
    op: Literal["add_component"]
    type: EditableType
    bay: int = Field(ge=0)
    y_mm: int


class MoveComponent(BaseModel):
    op: Literal["move_component"]
    id: str
    bay: int | None = Field(default=None, ge=0)
    y_mm: int | None = None


class RemoveComponent(BaseModel):
    op: Literal["remove_component"]
    id: str


class SetDimensions(BaseModel):
    op: Literal["set_dimensions"]
    dimensions_mm: Dimensions


class SetWardrobeType(BaseModel):
    op: Literal["set_wardrobe_type"]
    wardrobe_type: WardrobeType


class SetBays(BaseModel):
    op: Literal["set_bays"]
    count: int


class SetMaterial(BaseModel):
    op: Literal["set_material"]
    slot: str
    key: str


class SetAccessory(BaseModel):
    op: Literal["set_accessory"]
    key: str
    enabled: bool


class ApplyTemplate(BaseModel):
    op: Literal["apply_template"]
    template: str


Operation = Annotated[
    AddComponent | MoveComponent | RemoveComponent | SetDimensions | SetWardrobeType
    | SetBays | SetMaterial | SetAccessory | ApplyTemplate,
    Field(discriminator="op"),
]


class ApplyOperationsRequest(BaseModel):
    design: Design
    operations: list[Operation] = Field(min_length=1, max_length=50)
