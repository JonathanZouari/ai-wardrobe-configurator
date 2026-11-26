# Sahara — Warm Minimalism

Source: Google Stitch project `1009266073155508731` ("AI Wardrobe Configurator"), design system `assets/9893180916397480160` (copied from preset `assets/preset-sahara`). Exported 2026-11-26.

## North Star: "Sun-Baked Simplicity"
Luxurious warmth meets disciplined minimalism. Golden tones, editorial serif headings, and abundant whitespace.

## Colors
- **Primary (`#c2652a`):** Burnt sienna — warm, earthy CTAs and focus states.
- **Background (`#faf5ee`):** Warm linen — never cold white.
- **Tertiary (`#8c3c3c`):** Dusty rose — sparse accent for emphasis.
- Entire palette is warm-shifted. Even grays have warm undertones.

## Typography
- **Headlines:** EB Garamond — elegant, editorial serif. Large sizes with tight leading.
- **Body/Labels:** Manrope — geometric sans-serif, clean and modern contrast to the serif.
- The serif/sans pairing creates a luxury editorial feel.

## Elevation
- Ultra-soft shadows: `0 2px 16px rgba(58, 48, 42, 0.04)`. Barely visible.
- Prefer warm background tinting for hierarchy.
- Borders: thin and warm (`#d8d0c8` at 60% opacity).

## Components
- **Buttons:** Primary = solid sienna fill, 8px radius. Secondary = outlined with warm border. Text links underlined on hover.
- **Cards:** Warm white or `surface_container_low`, generous padding (28-32px). Minimal borders.
- **Inputs:** White background, warm gray border, sienna focus state.

## Rules
- Whitespace is the primary design tool. When in doubt, add more.
- Content should feel curated, not cluttered. Limit items per section.
- Photography should be warm-toned. Avoid cool/blue stock imagery.

## Theme settings
- Color mode: LIGHT · Color variant: FIDELITY · Roundness: 8px (`ROUND_EIGHT`) · Saturation: 2
- Fonts: headline `EB Garamond`, body `Manrope`, label `Manrope`
- Seed colors: primary `#c2652a`, secondary `#78706a`, tertiary `#8c3c3c`, neutral `#605850`

## Named color tokens

| Token | Value | Token | Value |
|---|---|---|---|
| `background` | `#faf5ee` | `on_background` | `#3a302a` |
| `surface` | `#faf5ee` | `on_surface` | `#3a302a` |
| `surface_bright` | `#faf5ee` | `on_surface_variant` | `#605850` |
| `surface_dim` | `#dcd6cc` | `surface_variant` | `#ece6dc` |
| `surface_tint` | `#c2652a` | `surface_container_lowest` | `#ffffff` |
| `surface_container_low` | `#f6f0e8` | `surface_container` | `#f2ece4` |
| `surface_container_high` | `#ece6dc` | `surface_container_highest` | `#e6e0d6` |
| `inverse_surface` | `#3a302a` | `inverse_on_surface` | `#faf5ee` |
| `outline` | `#9a9088` | `outline_variant` | `#d8d0c8` |
| `primary` | `#c2652a` | `on_primary` | `#ffffff` |
| `primary_container` | `#e08850` | `on_primary_container` | `#fbe8d8` |
| `primary_fixed` | `#fbe8d8` | `on_primary_fixed` | `#401a08` |
| `primary_fixed_dim` | `#f0a878` | `on_primary_fixed_variant` | `#8a4518` |
| `inverse_primary` | `#f0a878` | | |
| `secondary` | `#78706a` | `on_secondary` | `#ffffff` |
| `secondary_container` | `#eae2da` | `on_secondary_container` | `#605850` |
| `secondary_fixed` | `#eae2da` | `on_secondary_fixed` | `#2a2420` |
| `secondary_fixed_dim` | `#cec6be` | `on_secondary_fixed_variant` | `#504840` |
| `tertiary` | `#8c3c3c` | `on_tertiary` | `#ffffff` |
| `tertiary_container` | `#d47070` | `on_tertiary_container` | `#3a2020` |
| `tertiary_fixed` | `#fce0e0` | `on_tertiary_fixed` | `#2e1515` |
| `tertiary_fixed_dim` | `#e8a0a0` | `on_tertiary_fixed_variant` | `#6e3030` |
| `error` | `#c0392b` | `on_error` | `#ffffff` |
| `error_container` | `#fce4e0` | `on_error_container` | `#7a1a10` |
