export function traceOuterBorder(mask, w, h, cfg) {
  if (!cfg.enabled) return null;
  const segments = [];
  const isMask = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isMask(x, y)) continue;
      if (!isMask(x - 1, y)) segments.push({x1: x, y1: y, x2: x, y2: y + 1});
      if (!isMask(x + 1, y)) segments.push({x1: x + 1, y1: y, x2: x + 1, y2: y + 1});
      if (!isMask(x, y - 1)) segments.push({x1: x, y1: y, x2: x + 1, y2: y});
      if (!isMask(x, y + 1)) segments.push({x1: x, y1: y + 1, x2: x + 1, y2: y + 1});
    }
  }

  return {
    id: 'outer_border',
    name: 'Outer silhouette border',
    type: 'border',
    color: cfg.color,
    strokeWidth: cfg.strokeWidth,
    visible: true,
    segments,
    stats: {segments: segments.length},
    note: 'Fallback: exposed mask edges rendered as thick border segments.'
  };
}
