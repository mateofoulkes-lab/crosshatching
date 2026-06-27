# HatchForge

HatchForge is a local/offline browser app for turning PNG/JPG/WebP character, creature, portrait, and fantasy artwork into **vector SVG laser-engraving hatching/cross-hatching**. It does not embed the source raster in the final SVG; it exports grouped vector paths for LightBurn, Inkscape, and similar tools.

## Run

```bash
npm install
npm run dev
npm run build
npm test
```

Run the app through `npm run dev` or another static HTTP server. Do **not** open `index.html` directly with `file://`, because browser module loading and relative asset resolution are designed for HTTP origins. The HTML uses relative paths (`./src/main.js` and `./src/styles/main.css`), so it also works when hosted from GitHub Pages or another subpath instead of a domain root.

## What is implemented

- Image loading with PNG/JPG/WebP, transparency support, max processing dimension, original/processed size display.
- Tone controls: brightness, contrast, gamma, invert, white-background removal, alpha masking.
- Posterization from 3 to 8 levels, defaulting to RPG-style 5 levels where level 0 is blank/background.
- Figure mask cleanup with morphological close/smooth and tiny island removal.
- Ambitious cumulative hatching from the first version: by default `hatch_level_1` covers all non-white figure pixels, `hatch_level_2` covers level 2 and darker, etc., so dark regions accumulate multiple line families.
- Per-level controls for spacing, angle, second angle/crosshatch, stroke width, jitter, sample step, and minimum segment length.
- Raster-sampling clipping fallback: global parallel lines are sampled against the mask and level map, grouped into valid vector segments, and exported as SVG paths.
- Internal tone edges, detail edges using Sobel-like gradients, and a thick outer silhouette border fallback.
- Layer panel with visibility toggles, segment counts, colored preview or all-black export option.
- SVG export with `width`/`height` in mm, `viewBox`, clean groups (`outer_border`, `internal_edges`, `detail_edges`, `hatch_level_N`), strokes without raster images, and metadata.
- Presets: Soft engraving, Standard RPG engraving, Dense crosshatch, Comic high contrast, Medieval etching, Laser safe low detail, Stress test / maximum detail.
- Settings save/reset plus copy/download SVG.

## How to use

1. Open the app with `npm run dev` and load a transparent PNG or a JPG/WebP with a white background.
2. Adjust tone controls until the gray preview has clear shadows and highlights.
3. Tune posterization and mask controls so the background is empty and the figure remains solid.
4. Keep cumulative mode enabled for classic engraved shading: darker tones receive more hatch families.
5. Click **Generate vector**. Toggle layers to inspect hatch, internal edges, detail edges, and border.
6. Set physical export width in mm, choose colored layers or all black, then download/copy SVG.
7. Open the SVG in Inkscape or LightBurn and verify groups import as separate layers/colors.

## Pipeline

1. Draw source image to a capped processing canvas.
2. Convert to grayscale and apply tone adjustments.
3. Build a figure mask from alpha and/or white threshold.
4. Posterize grayscale to tonal levels and force masked-out pixels to level 0.
5. Generate cumulative threshold masks for hatching patterns.
6. Produce parallel hatch/crosshatch lines and clip them with a raster sampling fallback.
7. Add internal tone-jump edges, detail edges, and outer border.
8. Serialize a vector-only SVG.

## Cumulative hatching

With five levels, level 0 is blank. In the default `byThresholdMask` strategy:

- `hatch_level_1` appears on every non-white figure pixel.
- `hatch_level_2` appears on medium and darker pixels.
- `hatch_level_3` appears on dark and black pixels.
- `hatch_level_4` appears on black pixels.

This makes dark regions physically accumulate more line families instead of replacing one isolated pattern with another.

## LightBurn / SVG notes

The export uses simple SVG paths in groups, no filters, no masks, no raster image, and no complex transforms. Stroke widths are numeric SVG units mapped through a millimeter-sized document. For maximum laser compatibility, enable **All black SVG** or keep colors by layer for LightBurn layer assignment.

## Manual test checklist

- Load a transparent PNG.
- Load a JPG with a white background.
- Adjust brightness, contrast, and gamma.
- Posterize to 3, 5, and 8 levels.
- Enable cumulative hatching and verify darker zones receive more line families.
- Disable cumulative mode and verify each tone receives only its own hatch.
- Generate hatch with different spacing and angles.
- Enable/disable internal edges, detail edges, and outer border.
- Toggle layers in the preview.
- Export SVG and open it in a browser/Inkscape/LightBurn.
- Confirm the background stays empty.
- Confirm the SVG contains separate groups and no embedded raster.

## Limitations and roadmap

This first large pass prioritizes an end-to-end V3-shaped workflow. Advanced geometry is intentionally isolated for replacement:

- Vector polygon clipping is currently a raster-sampling fallback (`vectorClipMode` placeholder remains for future polygon clipping).
- Outer border uses a thick sampled silhouette stroke, not a true outward offset fill.
- Contour-following hatch controls are represented in configuration, but robust offset curves need a future Clipper/Paper.js implementation.
- Region polygonization/merge is planned; current hatching works directly from masks/level maps for reliability in-browser.
- Detail preservation is edge-based, not semantic face/eye detection.
