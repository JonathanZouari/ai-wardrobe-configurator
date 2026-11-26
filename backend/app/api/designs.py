from fastapi import APIRouter, HTTPException

from app.catalog import example_v1 as catalog
from app.domain.design_factory import build_design
from app.domain.operations import DomainError, apply_operations
from app.schemas.design import ApplyOperationsRequest, CreateDesignRequest, Design
from app.schemas.response import ApiResponse

router = APIRouter()

# shortcut: stateless. The client holds the draft and sends it back with each batch of
# operations; add server-side sessions, revision checks and persistence with the database.


@router.get("/catalog", response_model=ApiResponse[dict])
def get_catalog() -> ApiResponse[dict]:
    return ApiResponse(success=True, data={
        "version": catalog.CATALOG_VERSION,
        "example_data": True,
        "limits_mm": catalog.LIMITS_MM,
        "materials": catalog.MATERIALS,
        "components": catalog.COMPONENTS,
        "accessories": catalog.ACCESSORIES,
        "templates": list(catalog.TEMPLATES),
    })


@router.post("/designs", response_model=ApiResponse[Design])
def create_design(request: CreateDesignRequest) -> ApiResponse[Design]:
    design = build_design(request.wardrobe_type, request.dimensions_mm, request.material_selections, request.template)
    return ApiResponse(success=True, data=design)


@router.post("/designs/operations", response_model=ApiResponse[Design])
def apply_design_operations(request: ApplyOperationsRequest) -> ApiResponse[Design]:
    try:
        design = apply_operations(request.design, request.operations)
    except DomainError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return ApiResponse(success=True, data=design)
