from fastapi import APIRouter

from app.domain.design_factory import build_design
from app.schemas.design import CreateDesignRequest, Design
from app.schemas.response import ApiResponse

router = APIRouter()


@router.post("/designs", response_model=ApiResponse[Design])
def create_design(request: CreateDesignRequest) -> ApiResponse[Design]:
    # shortcut: stateless, nothing is stored; add sessions and persistence when the database is connected.
    design = build_design(request.wardrobe_type, request.dimensions_mm, request.material_selections)
    return ApiResponse(success=True, data=design)
