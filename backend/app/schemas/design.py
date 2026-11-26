"""Canonical structured design (PRD section 5.1): the single source of truth for rendering,
validation and documentation.

Coordinate convention: integer millimetres, origin at the front-bottom-left corner of the
wardrobe envelope; x runs to the right, y up, z from the front towards the back wall.
A component's position is its minimum corner and its size extends in the positive directions.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, model_validator

from app.catalog import example_v1 as catalog

WardrobeType = Literal["hinged", "sliding"]
ComponentType = Literal["panel", "plinth", "back", "partition", "shelf", "rail", "drawer", "door"]


class Dimensions(BaseModel):
    model_config = ConfigDict(frozen=True)

    width: StrictInt
    height: StrictInt
    depth: StrictInt

    @model_validator(mode="after")
    def within_catalog_limits(self) -> "Dimensions":
        for field, (low, high) in catalog.LIMITS_MM.items():
            if not low <= getattr(self, field) <= high:
                raise ValueError(f"{field} must be between {low} and {high} mm")
        return self


class Vector(BaseModel):
    model_config = ConfigDict(frozen=True)

    x: int
    y: int
    z: int


class Component(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    type: ComponentType
    compartment: int | None = None
    position_mm: Vector
    size_mm: Vector
    catalog_ref: str
    params: dict[str, int | str] = Field(default_factory=dict)


class Design(BaseModel):
    model_config = ConfigDict(frozen=True)

    schema_version: int = 1
    design_id: str
    revision: int = 1
    wardrobe_type: WardrobeType
    dimensions_mm: Dimensions
    catalog_version: str
    components: list[Component]
    material_selections: dict[str, str]
    accessories: list[str] = Field(default_factory=list)
    door_configuration: dict[str, int | str]


class CreateDesignRequest(BaseModel):
    wardrobe_type: WardrobeType
    dimensions_mm: Dimensions
    material_selections: dict[str, str] = Field(default_factory=dict)

    @model_validator(mode="after")
    def materials_exist_in_catalog(self) -> "CreateDesignRequest":
        for slot, key in self.material_selections.items():
            if key not in catalog.MATERIALS.get(slot, ()):
                raise ValueError(f"unknown material '{key}' for '{slot}'")
        return self
