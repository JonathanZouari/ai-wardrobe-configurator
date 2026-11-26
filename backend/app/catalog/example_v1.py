"""DEVELOPMENT EXAMPLE catalog and construction constants.

None of these values were supplied or validated by the carpentry business (PRD section 16).
They exist so the parametric engine and 3D view have something to work with, and must be
replaced by approved values before any production workflow depends on them.
"""

CATALOG_VERSION = "example-v1"

# Overall size limits, in millimetres.
LIMITS_MM = {"width": (1200, 3600), "height": (1800, 2800), "depth": (450, 750)}

BOARD_THICKNESS_MM = 18
BACK_THICKNESS_MM = 8
PLINTH_HEIGHT_MM = 80
PLINTH_RECESS_MM = 40
DOOR_THICKNESS_MM = 20
DOOR_GAP_MM = 3
MAX_BAY_WIDTH_MM = 1000

SLIDING_TRACK_GAP_MM = 5
SLIDING_OVERLAP_MM = 30

TOP_SHELF_DROP_MM = 300
RAIL_DROP_MM = 60
RAIL_DIAMETER_MM = 25
INTERIOR_SETBACK_MM = 20
DRAWER_HEIGHT_MM = 200
DRAWER_COUNT = 2
DRAWER_SIDE_CLEARANCE_MM = 3

MATERIALS = {
    "carcass": ("oak", "walnut", "linen"),
    "doors": ("cashmere", "fluted", "umber"),
}
DEFAULT_MATERIALS = {"carcass": "oak", "doors": "cashmere"}
