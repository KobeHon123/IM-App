export type Point2 = [number, number];

/**
 * Flattens an absolute SVG path (M, L, C, Z only - which is what scripts/trace-logo.py emits)
 * into closed polylines. `maxStep` is the largest allowed distance between neighbouring
 * points on a curve, in the path's own units.
 */
export function flattenPath(d: string, maxStep: number): Point2[][] {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const polylines: Point2[][] = [];
  let current: Point2[] = [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    const cmd = tokens[i++];
    switch (cmd) {
      case 'M': {
        if (current.length > 2) polylines.push(current);
        cx = num();
        cy = num();
        current = [[cx, cy]];
        break;
      }
      case 'L': {
        cx = num();
        cy = num();
        current.push([cx, cy]);
        break;
      }
      case 'C': {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
        const approxLength = Math.hypot(x1 - cx, y1 - cy) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
        const steps = Math.min(96, Math.max(2, Math.ceil(approxLength / maxStep)));
        for (let s = 1; s <= steps; s += 1) {
          const t = s / steps;
          const mt = 1 - t;
          current.push([
            mt * mt * mt * cx + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3,
            mt * mt * mt * cy + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3,
          ]);
        }
        cx = x3;
        cy = y3;
        break;
      }
      case 'Z':
      case 'z': {
        if (current.length > 2) polylines.push(current);
        current = [];
        break;
      }
      default:
        break;
    }
  }
  if (current.length > 2) polylines.push(current);
  return polylines;
}

/** Removes repeated points (also a repeated first/last point) closer than `epsilon`. */
export function cleanClosedPolyline(points: Point2[], epsilon: number): Point2[] {
  const out: Point2[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > epsilon) out.push(p);
  }
  while (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= epsilon) {
    out.pop();
  }
  return out;
}
