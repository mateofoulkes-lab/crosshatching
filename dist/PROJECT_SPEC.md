# HatchForge Project Spec

## Goal

Generate laser-friendly vector SVG hatching/cross-hatching from raster fantasy/role-playing artwork in a local browser app.

## Architecture

- `src/core`: pure or mostly pure processing modules.
- `src/ui`: localStorage and preview helpers.
- `src/main.js`: browser orchestration and UI wiring.
- `src/styles`: application styling.

## Technical decisions

The implementation uses browser-native canvas APIs and dependency-light Vite. For the first ambitious pass, line clipping uses deterministic raster sampling against the computed `levelMap` and figure mask. This is robust offline and avoids shipping a large geometry stack before the UX is proven. Modules and function names are kept compatible with later polygon clipping/offset work.

## Data model

Generated layers contain:

- `id`, `name`, `type`, `color`, `visible`
- `strokeWidth`, `lineCap`, `lineJoin`
- `segments` for straight line/path strokes
- `polylines` for border/contour-like paths
- `stats`

## Pipeline details

1. Load source image and scale to `maxDimension`.
2. Convert RGBA to grayscale plus alpha plane.
3. Apply brightness, contrast, gamma, and invert.
4. Create figure mask from alpha and white-background threshold.
5. Clean mask with close/smooth morphology and island removal.
6. Posterize adjusted grayscale into 3-8 levels. Level 0 is white/background.
7. Generate hatch layers.
   - Simple mode: level K hatch targets only level K pixels.
   - Cumulative mode: level K hatch targets level K and darker pixels.
   - Inverted cumulative is available for experimentation.
8. Generate internal edges by scanning neighbor tone jumps above `minToneJump`.
9. Generate detail edges with Sobel-style gradients within the mask.
10. Generate outer border from silhouette boundary samples as a thick stroke fallback.
11. Export SVG groups with physical mm dimensions.

## TODOs / advanced fallbacks

- Add marching-squares or OpenCV.js contour extraction for true polygon regions.
- Add Douglas-Peucker contour simplification per region and hole support.
- Add polygon clipping for hatch-to-region clipping.
- Add Clipper/Paper.js inward offsets for contour-following hatch and outward border fill.
- Move heavy generation into `src/workers/generateWorker.js` when images exceed interactive thresholds.
