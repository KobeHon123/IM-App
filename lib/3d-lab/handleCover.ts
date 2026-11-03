import cdt2d from 'cdt2d';
import { LOGO_BBOX, LOGO_MIN_GAP_PX, LOGO_MIN_STROKE_PX, LOGO_PATH } from './logoData';
import { refineDelaunay } from './delaunay';
import { MeshBuilder } from './mesh';
import { cleanClosedPolyline, flattenPath, type Point2 } from './svgPath';
import type { BuiltPart, ParamNote, ParamSpec, ParamValues } from './types';

/* -------------------------------------------------------------------------------------------------
 * "Handle Cover - Half (round, S-type)"
 *
 * Coordinates (mm): the handle axis runs along Y, the part spans y = -height .. 0 (same as the
 * reference STL "S (round) - S Type Template") and the half tube sits on the +Z side, split at Z = 0.
 *
 * Cross-section (XZ plane) - how the profile is constructed
 *   r_in  = (handle diameter + 2 * 1 mm tolerance) / 2        inner wall radius
 *   R_o   = r_in + 2.5                                         outer radius (2.5 mm wall)
 *
 *   +x side ("lip", sticks out 2 mm below the split plane Z = 0)
 *     P0 = (R_o, 0)                          outer edge on the split plane
 *     P1 = (R_o - 1, 0)                      1 mm horizontal step towards the axis
 *     P2 = (sqrt((r_in + 1)^2 - 2^2), -2)    on the circle r_in + 1, 2 mm below the split plane
 *     P3 = P2 * r_in / (r_in + 1)            P2 projected radially onto the inner wall (1 mm radial step)
 *     boundary: P0 -> P1 -> P2 (slanted line down to Z = -2) -> P3 (1 mm step along the radius)
 *   -x side ("groove") = the +x profile rotated 180 degrees about Y: (x, z) -> (-x, -z), so it rises to Z = +2.
 *
 *   The half body is everything between the outer arc (radius R_o, angle 0..180 degrees) and the inner
 *   arc (radius r_in, angle -theta0 .. 180 - theta0, theta0 = atan(2 / x(P2))). Extruding that along Y
 *   gives the part. The 45 degree chamfer is made by moving the outer arc radially inwards by `c` on the
 *   two end sections (y = -height and y = 0) and linking them to the full-radius section at distance `c`.
 *
 *   NOTE: the reference STL has P2 at exactly Z = -2 and P3 on the same radial line (13.371, -1.862 for
 *   r_in = 13.5); this builder reproduces that, which differs very slightly from "P3 at Z = -2" in the brief.
 * -----------------------------------------------------------------------------------------------*/

export const LIP_OUTER_STEP = 1;
export const LIP_INNER_STEP = 1;
export const LIP_DROP = 2;
export const WALL_THICKNESS = 2.5;
export const TOLERANCE_PER_SIDE = 1;
export const ENGRAVE_DEPTH = 0.35;
export const MIN_PRINTABLE_FEATURE = 0.4;
const ARC_SEGMENTS = 72;
/** how much of the arc the logo may use (across the arc) */
const LOGO_ARC_FRACTION = 0.6;

export const HANDLE_COVER_PARAMS: ParamSpec[] = [
  { kind: 'slider', key: 'height', label: 'Height', unit: 'mm', min: 20, max: 400, step: 1, default: 200, decimals: 0 },
  { kind: 'slider', key: 'handleDiameter', label: 'Handle diameter', unit: 'mm', min: 10, max: 60, step: 0.5, default: 25, decimals: 1 },
  { kind: 'slider', key: 'chamfer', label: 'Edge chamfer', unit: 'mm', min: 0, max: 2.5, step: 0.25, default: 1, decimals: 2 },
  { kind: 'toggle', key: 'companyIcon', label: 'Company icon', default: false, description: 'Engraved 0.35 mm into the outer surface' },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const snap = (v: number, step: number) => Math.round(v / step) * step;

export interface HandleCoverParams {
  height: number;
  handleDiameter: number;
  chamfer: number;
  companyIcon: boolean;
}

export function normalizeHandleCoverParams(raw: ParamValues): HandleCoverParams {
  const num = (key: string, fallback: number) => (typeof raw[key] === 'number' && Number.isFinite(raw[key] as number) ? (raw[key] as number) : fallback);
  return {
    height: clamp(snap(num('height', 200), 1), 20, 400),
    handleDiameter: clamp(snap(num('handleDiameter', 25), 0.5), 10, 60),
    chamfer: clamp(snap(num('chamfer', 1), 0.25), 0, 2.5),
    companyIcon: raw.companyIcon === true,
  };
}

export interface HandleCoverDimensions {
  innerDiameter: number;
  innerRadius: number;
  outerDiameter: number;
  outerRadius: number;
  /** chamfer actually modelled */
  chamfer: number;
}

export function handleCoverDimensions(p: HandleCoverParams): HandleCoverDimensions {
  const innerRadius = (p.handleDiameter + 2 * TOLERANCE_PER_SIDE) / 2;
  const outerRadius = innerRadius + WALL_THICKNESS;
  // The chamfer may not eat through the wall, past the 1 mm lip step, or more than a quarter of the length.
  const chamfer = clamp(p.chamfer, 0, Math.min(WALL_THICKNESS - 0.01, LIP_OUTER_STEP, p.height / 4));
  return { innerDiameter: innerRadius * 2, innerRadius, outerDiameter: outerRadius * 2, outerRadius, chamfer };
}

/** Lip points for the +x side (the -x side is the same rotated 180 degrees). */
export function lipPoints(innerRadius: number, outerRadius: number) {
  const p0 = { x: outerRadius, z: 0 };
  const p1 = { x: outerRadius - LIP_OUTER_STEP, z: 0 };
  const rOut = innerRadius + LIP_INNER_STEP;
  const p2 = { x: Math.sqrt(rOut * rOut - LIP_DROP * LIP_DROP), z: -LIP_DROP };
  const k = innerRadius / rOut;
  const p3 = { x: p2.x * k, z: p2.z * k };
  return { p0, p1, p2, p3 };
}

interface Pt {
  x: number;
  z: number;
}

/** Closed outline of the cross-section, counter-clockwise (x to the right, z up). Outer arc comes first. */
function profileLoop(innerRadius: number, outerRadius: number, outerReduction: number): Pt[] {
  const { p1, p2 } = lipPoints(innerRadius, outerRadius);
  const theta0 = Math.atan2(LIP_DROP, p2.x);
  const ro = outerRadius - outerReduction;
  const pts: Pt[] = [];

  for (let j = 0; j <= ARC_SEGMENTS; j += 1) {
    const a = (Math.PI * j) / ARC_SEGMENTS;
    pts.push({ x: ro * Math.cos(a), z: ro * Math.sin(a) });
  }
  pts.push({ x: -p1.x, z: 0 });
  pts.push({ x: -p2.x, z: LIP_DROP });
  for (let k = 0; k <= ARC_SEGMENTS; k += 1) {
    const a = Math.PI - theta0 - (Math.PI * k) / ARC_SEGMENTS;
    pts.push({ x: innerRadius * Math.cos(a), z: innerRadius * Math.sin(a) });
  }
  pts.push({ x: p2.x, z: -LIP_DROP });
  pts.push({ x: p1.x, z: 0 });
  return pts;
}

/* ------------------------------------------------ logo placement ------------------------------------------------ */

export interface LogoPlacement {
  /** millimetres per source pixel */
  scale: number;
  lengthMm: number;
  widthMm: number;
  minFeatureMm: number;
  /** closed outlines in (u = arc length from the +x end of the arc, y) */
  contours: Point2[][];
}

let cachedPolylines: { step: number; polylines: Point2[][] } | null = null;

function logoPolylines(maxStepPx: number): Point2[][] {
  if (!cachedPolylines || Math.abs(cachedPolylines.step - maxStepPx) / maxStepPx > 0.2) {
    cachedPolylines = { step: maxStepPx, polylines: flattenPath(LOGO_PATH, maxStepPx) };
  }
  return cachedPolylines.polylines;
}

export function logoScale(outerRadius: number, y1: number, y2: number): number {
  const arcLength = Math.PI * outerRadius;
  const byArc = (LOGO_ARC_FRACTION * arcLength) / LOGO_BBOX.height;
  const byLength = Math.max(y2 - y1 - 4, 1) / LOGO_BBOX.width;
  const byArcMargin = (arcLength - 3) / LOGO_BBOX.height;
  return Math.min(byArc, byLength, byArcMargin);
}

export function placeLogo(outerRadius: number, y1: number, y2: number, withContours: boolean): LogoPlacement {
  const scale = logoScale(outerRadius, y1, y2)*0.25;
  const minFeatureMm = Math.min(LOGO_MIN_STROKE_PX, LOGO_MIN_GAP_PX) * scale;
  const placement: LogoPlacement = {
    scale,
    lengthMm: LOGO_BBOX.width * scale,
    widthMm: LOGO_BBOX.height * scale,
    minFeatureMm,
    contours: [],
  };
  if (!withContours) return placement;

  const arcLength = Math.PI * outerRadius;
  const u0 = arcLength / 2;
  const yc = (y1 + y2) / 2;
  const cx = LOGO_BBOX.x0 + LOGO_BBOX.width / 2;
  const cy = LOGO_BBOX.y0 + LOGO_BBOX.height / 2;

  // The logo's long axis runs along +y, its "up" along +u (seen from outside the logo reads normally).
  for (const poly of logoPolylines(0.3 / scale)) {
    const mapped: Point2[] = poly.map(([px, py]) => [u0 + -(py - cy) * scale, yc + (px - cx) * scale]);
    const cleaned = cleanClosedPolyline(mapped, 0.02);
    if (cleaned.length >= 3) placement.contours.push(cleaned);
  }
  return placement;
}

/* ------------------------------------------------ engraved patch ------------------------------------------------ */

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Triangulates the outer cylinder band between y1 and y2 as one flat (u, y) domain with the logo outlines
 * as constraints, then lifts it back onto the cylinder. Triangles inside the outlines become the engraved
 * floor (radius R_o - depth) and the outlines become radial walls, so the result stays watertight.
 */
function addEngravedOuterBand(
  builder: MeshBuilder,
  outerRadius: number,
  y1: number,
  y2: number,
  depth: number,
  contours: Point2[][]
): void {
  const N = ARC_SEGMENTS;
  const arcLength = Math.PI * outerRadius;
  const points: Array<[number, number]> = [];
  const edges: Array<[number, number]> = [];
  const contourEdges = new Set<number>();

  // The two boundary rows are bowed outwards by 0.02 micron-scale amounts so no three points are exactly
  // collinear (that would force the triangulator into slow exact arithmetic). The 3D vertices below use
  // the true y1 / y2, so the mesh is unaffected.
  const bow = (j: number) => (4 * j * (N - j)) / (N * N) * 2e-5;
  for (let j = 0; j <= N; j += 1) points.push([outerRadius * ((Math.PI * j) / N), y1 - bow(j)]);
  for (let j = N; j >= 0; j -= 1) points.push([outerRadius * ((Math.PI * j) / N), y2 + bow(j)]);
  const ringCount = points.length;
  for (let i = 0; i < ringCount; i += 1) edges.push([i, (i + 1) % ringCount]);

  const edgeKey = (a: number, b: number) => (a < b ? a * 1e6 + b : b * 1e6 + a);
  const segments: Array<[number, number, number, number]> = [];
  let uMin = Infinity, uMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const contour of contours) {
    const first = points.length;
    for (const [u, y] of contour) {
      points.push([u, y]);
      uMin = Math.min(uMin, u); uMax = Math.max(uMax, u);
      yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
    }
    for (let i = 0; i < contour.length; i += 1) {
      const a = first + i;
      const b = first + ((i + 1) % contour.length);
      edges.push([a, b]);
      contourEdges.add(edgeKey(a, b));
      segments.push([contour[i][0], contour[i][1], contour[(i + 1) % contour.length][0], contour[(i + 1) % contour.length][1]]);
    }
  }

  // Steiner points keep the triangles small enough to follow the curvature of the cylinder.
  // deterministic jitter: a perfectly regular grid makes the triangulator fall back to slow exact arithmetic
  let seed = 12345;
  const jitter = (amount: number) => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return (seed / 4294967296 - 0.5) * 2 * amount;
  };
  const margin = 1.2;
  const step = 1.3;
  const minClearance = 0.45;
  const nearContour = (u: number, y: number, clearance: number) => {
    for (const [ax, ay, bx, by] of segments) {
      if (u < Math.min(ax, bx) - clearance || u > Math.max(ax, bx) + clearance) continue;
      if (y < Math.min(ay, by) - clearance || y > Math.max(ay, by) + clearance) continue;
      if (distanceToSegment(u, y, ax, ay, bx, by) < clearance) return true;
    }
    return false;
  };
  for (let u = uMin - margin; u <= uMax + margin; u += step) {
    for (let y = yMin - margin; y <= yMax + margin; y += step) {
      if (u < 0.6 || u > arcLength - 0.6 || y < y1 + 0.6 || y > y2 - 0.6) continue;
      const ju = u + jitter(0.25);
      const jy = y + jitter(0.25);
      if (nearContour(ju, jy, minClearance)) continue;
      points.push([ju, jy]);
    }
  }
  const rows = Math.max(1, Math.ceil((y2 - y1) / 9));
  for (let k = 1; k < rows; k += 1) {
    const y = y1 + ((y2 - y1) * k) / rows;
    for (let j = 1; j < N; j += 1) {
      const u = outerRadius * ((Math.PI * j) / N);
      const inside = u > uMin - margin - 0.8 && u < uMax + margin + 0.8 && y > yMin - margin - 0.8 && y < yMax + margin + 0.8;
      if (!inside) points.push([u + jitter(0.15), y + jitter(0.4)]);
    }
  }

  const constrained = new Set<number>(edges.map(([a, b]) => edgeKey(a, b)));
  const triangles = refineDelaunay(points, cdt2d(points, edges, { delaunay: false }), (a, b) => constrained.has(edgeKey(a, b)));

  // flood-fill from the outside; every contour edge crossed toggles "inside the logo"
  const edgeToTris = new Map<number, number[]>();
  const P = points.length;
  triangles.forEach((tri, t) => {
    for (let k = 0; k < 3; k += 1) {
      const a = tri[k];
      const b = tri[(k + 1) % 3];
      const key = Math.min(a, b) * P + Math.max(a, b);
      const list = edgeToTris.get(key);
      if (list) list.push(t); else edgeToTris.set(key, [t]);
    }
  });
  const inside = new Int8Array(triangles.length).fill(-1);
  const start = (edgeToTris.get(0 * P + 1) ?? [])[0];
  if (start === undefined) throw new Error('Engraving: triangulation failed');
  inside[start] = 0;
  const stack = [start];
  while (stack.length) {
    const t = stack.pop() as number;
    const tri = triangles[t];
    for (let k = 0; k < 3; k += 1) {
      const a = tri[k];
      const b = tri[(k + 1) % 3];
      const neighbours = edgeToTris.get(Math.min(a, b) * P + Math.max(a, b)) ?? [];
      const flip = contourEdges.has(edgeKey(a, b)) ? 1 : 0;
      for (const s of neighbours) {
        if (s !== t && inside[s] === -1) {
          inside[s] = (inside[t] ^ flip) as 0 | 1;
          stack.push(s);
        }
      }
    }
  }

  const lift = (index: number, radius: number) => {
    const [u, yRaw] = points[index];
    // boundary rows are snapped back to the exact section positions
    const y = index < N + 1 ? y1 : index < ringCount ? y2 : yRaw;
    const angle = u / outerRadius;
    return builder.vertex(radius * Math.cos(angle), y, radius * Math.sin(angle));
  };
  const floorRadius = outerRadius - depth;

  triangles.forEach((tri, t) => {
    const isFloor = inside[t] === 1;
    const radius = isFloor ? floorRadius : outerRadius;
    let [a, b, c] = tri;
    // make the triangle face outwards (away from the axis)
    const [ua, ya] = points[a];
    const [ub, yb] = points[b];
    const [uc, yc] = points[c];
    const cross = (ub - ua) * (yc - ya) - (uc - ua) * (yb - ya);
    // in (u, y) with u increasing counter-clockwise around +y, outward-facing is "clockwise" seen with u right, y up
    if (cross > 0) [b, c] = [c, b];
    builder.triangle(lift(a, radius), lift(b, radius), lift(c, radius));
    if (!isFloor) return;
    const order = [a, b, c];
    for (let k = 0; k < 3; k += 1) {
      const p = order[k];
      const q = order[(k + 1) % 3];
      if (!contourEdges.has(edgeKey(p, q))) continue;
      const fp = lift(p, floorRadius);
      const fq = lift(q, floorRadius);
      const tp = lift(p, outerRadius);
      const tq = lift(q, outerRadius);
      builder.triangle(fq, fp, tp);
      builder.triangle(fq, tp, tq);
    }
  });
}

/* ------------------------------------------------ main builder ------------------------------------------------ */

export function describeHandleCover(raw: ParamValues): ParamNote[] {
  const p = normalizeHandleCoverParams(raw);
  const d = handleCoverDimensions(p);
  const notes: ParamNote[] = [];
  notes.push({
    paramKey: 'handleDiameter',
    tone: 'info',
    text: `Handle Ø ${fmt(p.handleDiameter)} → Inner wall Ø ${fmt(d.innerDiameter)} · Outer Ø ${fmt(d.outerDiameter)}`,
  });
  if (p.chamfer > d.chamfer + 1e-9) {
    notes.push({
      paramKey: 'chamfer',
      tone: 'info',
      text: `Applied ${fmt(d.chamfer)} mm - limited by the ${LIP_OUTER_STEP} mm lip step / wall thickness`,
    });
  }
  if (p.companyIcon) {
    const y2 = 0;
    const y1 = -p.height;
    const placement = placeLogo(d.outerRadius, y1 + d.chamfer, y2 - d.chamfer, false);
    notes.push({
      paramKey: 'companyIcon',
      tone: 'info',
      text: `Logo ${fmt(placement.lengthMm)} × ${fmt(placement.widthMm)} mm, ${ENGRAVE_DEPTH} mm deep, ® removed`,
    });
    if (placement.minFeatureMm < MIN_PRINTABLE_FEATURE) {
      notes.push({
        paramKey: 'companyIcon',
        tone: 'warning',
        text: `Thinnest logo detail is about ${placement.minFeatureMm.toFixed(2)} mm, below ${MIN_PRINTABLE_FEATURE} mm - it may not print cleanly.`,
      });
    }
  }
  return notes;
}

const fmt = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

export function buildHandleCoverHalf(raw: ParamValues): BuiltPart {
  const p = normalizeHandleCoverParams(raw);
  const d = handleCoverDimensions(p);
  const H = p.height;
  const c = d.chamfer;
  const builder = new MeshBuilder();

  // sections along y: chamfered end, full radius, full radius, chamfered end
  const sections: Array<{ y: number; reduction: number }> =
    c > 0
      ? [
          { y: -H, reduction: c },
          { y: -H + c, reduction: 0 },
          { y: -c, reduction: 0 },
          { y: 0, reduction: c },
        ]
      : [
          { y: -H, reduction: 0 },
          { y: 0, reduction: 0 },
        ];
  const middleBand = c > 0 ? 1 : 0; // index of the section pair that carries the outer surface

  const loops = sections.map((s) => profileLoop(d.innerRadius, d.outerRadius, s.reduction));
  const vertexLoops = loops.map((loop, i) => loop.map((pt) => builder.vertex(pt.x, sections[i].y, pt.z)));
  const M = loops[0].length;

  const engraveContours = p.companyIcon
    ? placeLogo(d.outerRadius, sections[middleBand].y, sections[middleBand + 1].y, true).contours
    : [];
  const engrave = engraveContours.length > 0;

  // side walls
  for (let s = 0; s < sections.length - 1; s += 1) {
    const A = vertexLoops[s];
    const B = vertexLoops[s + 1];
    for (let i = 0; i < M; i += 1) {
      if (engrave && s === middleBand && i < ARC_SEGMENTS) continue; // replaced by the engraved band
      const j = (i + 1) % M;
      builder.triangle(A[i], B[i], A[j]);
      builder.triangle(A[j], B[i], B[j]);
    }
  }
  if (engrave) {
    addEngravedOuterBand(builder, d.outerRadius, sections[middleBand].y, sections[middleBand + 1].y, ENGRAVE_DEPTH, engraveContours);
  }

  // end caps
  const capAt = (sectionIndex: number, facingPositiveY: boolean) => {
    const loop = loops[sectionIndex];
    const verts = vertexLoops[sectionIndex];
    const uniqueIdx: number[] = [];
    for (let i = 0; i < loop.length; i += 1) {
      if (uniqueIdx.length === 0 || verts[i] !== verts[uniqueIdx[uniqueIdx.length - 1]]) uniqueIdx.push(i);
    }
    if (verts[uniqueIdx[0]] === verts[uniqueIdx[uniqueIdx.length - 1]]) uniqueIdx.pop();
    const pts: Array<[number, number]> = uniqueIdx.map((i) => [loop[i].x, loop[i].z]);
    const ring: Array<[number, number]> = pts.map((_, i) => [i, (i + 1) % pts.length]);
    const tris = cdt2d(pts, ring, { exterior: false, delaunay: false });
    for (const [a, b, cc] of tris) {
      const [ax, az] = pts[a];
      const [bx, bz] = pts[b];
      const [cx, cz] = pts[cc];
      const ccw = (bx - ax) * (cz - az) - (cx - ax) * (bz - az) > 0;
      // CCW in (x, z) faces -y, so flip for the +y end
      const flip = facingPositiveY ? ccw : !ccw;
      const va = verts[uniqueIdx[a]];
      const vb = verts[uniqueIdx[b]];
      const vc = verts[uniqueIdx[cc]];
      if (flip) builder.triangle(va, vc, vb); else builder.triangle(va, vb, vc);
    }
  };
  capAt(0, false);
  capAt(sections.length - 1, true);

  return {
    mesh: builder.build(),
    cylinderRadii: [d.outerRadius, d.innerRadius, ...(engrave ? [d.outerRadius - ENGRAVE_DEPTH] : [])],
    effective: { ...p, chamfer: c },
    notes: describeHandleCover(raw),
  };
}

export function handleCoverFileName(raw: ParamValues): string {
  const p = normalizeHandleCoverParams(raw);
  const d = handleCoverDimensions(p);
  const n = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(Number(v.toFixed(2))));
  return `handle-cover-half_H${n(p.height)}_D${n(p.handleDiameter)}_C${n(d.chamfer)}${p.companyIcon ? '_icon' : ''}.stl`;
}
