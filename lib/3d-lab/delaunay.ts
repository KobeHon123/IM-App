type Tri = [number, number, number];

/**
 * Lawson edge flips: turns any triangulation into a (constrained) Delaunay triangulation using plain floating
 * point maths. cdt2d's own refinement uses exact arithmetic and is far too slow on a phone; our points are
 * jittered, so ordinary arithmetic is safe here. Constrained edges are never flipped.
 */
export function refineDelaunay(
  points: ReadonlyArray<readonly [number, number]>,
  input: ReadonlyArray<Tri>,
  isConstrained: (a: number, b: number) => boolean
): Tri[] {
  const P = points.length;
  const tris: Tri[] = input.map(([a, b, c]) => (orient(points, a, b, c) > 0 ? [a, b, c] : [a, c, b]));
  const key = (a: number, b: number) => (a < b ? a * P + b : b * P + a);

  // edge -> the (up to two) triangles sharing it
  const owners = new Map<number, [number, number]>();
  const link = (k: number, t: number) => {
    const o = owners.get(k);
    if (!o) owners.set(k, [t, -1]);
    else if (o[0] === -1) o[0] = t;
    else o[1] = t;
  };
  const relink = (k: number, from: number, to: number) => {
    const o = owners.get(k);
    if (!o) return;
    if (o[0] === from) o[0] = to;
    else if (o[1] === from) o[1] = to;
  };
  tris.forEach(([a, b, c], t) => {
    link(key(a, b), t);
    link(key(b, c), t);
    link(key(c, a), t);
  });

  const queue: Array<[number, number]> = [];
  for (const [k] of owners) {
    const a = Math.floor(k / P);
    queue.push([a, k - a * P]);
  }

  const opposite = (t: number, a: number, b: number) => {
    const [x, y, z] = tris[t];
    if (x !== a && x !== b) return x;
    if (y !== a && y !== b) return y;
    return z;
  };

  let guard = queue.length * 20 + 1000;
  while (queue.length && guard > 0) {
    guard -= 1;
    const [a, b] = queue.pop() as [number, number];
    if (isConstrained(a, b)) continue;
    const o = owners.get(key(a, b));
    if (!o || o[0] === -1 || o[1] === -1) continue;
    const t1 = o[0];
    const t2 = o[1];
    const c = opposite(t1, a, b);
    const d = opposite(t2, a, b);

    // orient so that t1 = (a, b, c) counter-clockwise
    let p = a;
    let q = b;
    if (orient(points, p, q, c) < 0) [p, q] = [q, p];
    if (inCircle(points, p, q, c, d) <= 0) continue;
    // the flip is only valid for a strictly convex quad
    if (orient(points, c, d, p) * orient(points, c, d, q) >= 0) continue;

    // quad (counter-clockwise): p, d, q, c  ->  new diagonal c-d
    tris[t1] = [p, d, c];
    tris[t2] = [d, q, c];
    owners.delete(key(p, q));
    owners.set(key(c, d), [t1, t2]);
    relink(key(p, d), t2, t1);
    relink(key(q, c), t1, t2);
    queue.push([p, d], [d, q], [q, c], [c, p]);
  }
  return tris;
}

function orient(points: ReadonlyArray<readonly [number, number]>, a: number, b: number, c: number): number {
  const [ax, ay] = points[a];
  const [bx, by] = points[b];
  const [cx, cy] = points[c];
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

/** > 0 when d lies inside the circumcircle of the counter-clockwise triangle (a, b, c). */
function inCircle(points: ReadonlyArray<readonly [number, number]>, a: number, b: number, c: number, d: number): number {
  const [dx, dy] = points[d];
  const ax = points[a][0] - dx, ay = points[a][1] - dy;
  const bx = points[b][0] - dx, by = points[b][1] - dy;
  const cx = points[c][0] - dx, cy = points[c][1] - dy;
  const a2 = ax * ax + ay * ay;
  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;
  return ax * (by * c2 - b2 * cy) - ay * (bx * c2 - b2 * cx) + a2 * (bx * cy - by * cx);
}
