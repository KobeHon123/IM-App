import type { IndexedMesh, MeshStats } from './types';

/** Resolution used to weld coincident vertices (mm). */
const WELD = 1e4;

/**
 * Collects triangles while welding coincident vertices, so the result is a
 * proper indexed mesh whose topology can be checked for watertightness.
 */
export class MeshBuilder {
  private readonly lookup = new Map<string, number>();
  private readonly pos: number[] = [];
  private readonly idx: number[] = [];

  vertex(x: number, y: number, z: number): number {
    const key = `${Math.round(x * WELD)},${Math.round(y * WELD)},${Math.round(z * WELD)}`;
    const existing = this.lookup.get(key);
    if (existing !== undefined) return existing;
    const index = this.pos.length / 3;
    this.pos.push(x, y, z);
    this.lookup.set(key, index);
    return index;
  }

  /** Adds a triangle; triangles that collapse to a line or point are ignored. */
  triangle(a: number, b: number, c: number): void {
    if (a === b || b === c || a === c) return;
    this.idx.push(a, b, c);
  }

  /** Quad a-b-c-d (counter-clockwise from outside), split along a-c. */
  quad(a: number, b: number, c: number, d: number): void {
    this.triangle(a, b, c);
    this.triangle(a, c, d);
  }

  build(): IndexedMesh {
    return { positions: Float32Array.from(this.pos), indices: Uint32Array.from(this.idx) };
  }
}

/** Topology, volume and bounds of a mesh. A closed, consistently oriented mesh has `watertight === true`. */
export function analyzeMesh(mesh: IndexedMesh): MeshStats {
  const { positions: p, indices: ix } = mesh;
  const vertexCount = p.length / 3;
  const triangles = ix.length / 3;
  const edgeCount = new Map<number, number>();
  const key = (a: number, b: number) => a * vertexCount + b;

  let degenerate = 0;
  let volume = 0;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < p.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      if (p[i + k] < min[k]) min[k] = p[i + k];
      if (p[i + k] > max[k]) max[k] = p[i + k];
    }
  }

  for (let t = 0; t < triangles; t += 1) {
    const a = ix[t * 3];
    const b = ix[t * 3 + 1];
    const c = ix[t * 3 + 2];
    for (const [u, v] of [[a, b], [b, c], [c, a]] as const) {
      const k = key(u, v);
      edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1);
    }
    const ax = p[a * 3], ay = p[a * 3 + 1], az = p[a * 3 + 2];
    const bx = p[b * 3], by = p[b * 3 + 1], bz = p[b * 3 + 2];
    const cx = p[c * 3], cy = p[c * 3 + 1], cz = p[c * 3 + 2];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    if (nx * nx + ny * ny + nz * nz < 1e-14) degenerate += 1;
    volume += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
  }

  let openEdges = 0;
  let nonManifold = 0;
  for (const [k, count] of edgeCount) {
    if (count > 1) {
      nonManifold += 1;
      continue;
    }
    const a = Math.floor(k / vertexCount);
    const b = k - a * vertexCount;
    // a healthy edge appears once in each direction
    if (edgeCount.get(key(b, a)) !== 1) openEdges += 1;
  }

  return {
    triangles,
    vertices: vertexCount,
    openEdges,
    nonManifoldEdges: nonManifold,
    degenerateTriangles: degenerate,
    watertight: openEdges === 0 && nonManifold === 0,
    volume,
    min,
    max,
  };
}

/**
 * Per-corner (non-indexed) buffers for rendering. Normals are smoothed across
 * faces that meet at less than `creaseDegrees`, so curved surfaces look smooth
 * while chamfers, steps and the engraved walls keep crisp edges. Corners that lie on a cylinder around
 * the Y axis (`cylinderRadii`) get the exact radial normal, which avoids blotchy shading from long thin triangles.
 */
export function buildRenderBuffers(
  mesh: IndexedMesh,
  creaseDegrees = 35,
  cylinderRadii: number[] = []
): { positions: Float32Array; normals: Float32Array } {
  const { positions: p, indices: ix } = mesh;
  const triangles = ix.length / 3;
  const vertexCount = p.length / 3;

  const faceNormal = new Float32Array(triangles * 3);
  const faceArea = new Float32Array(triangles);
  const valence = new Uint32Array(vertexCount + 1);

  for (let t = 0; t < triangles; t += 1) {
    const a = ix[t * 3] * 3;
    const b = ix[t * 3 + 1] * 3;
    const c = ix[t * 3 + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    faceArea[t] = len / 2;
    if (len > 0) {
      nx /= len; ny /= len; nz /= len;
    }
    faceNormal[t * 3] = nx;
    faceNormal[t * 3 + 1] = ny;
    faceNormal[t * 3 + 2] = nz;
    valence[ix[t * 3] + 1] += 1;
    valence[ix[t * 3 + 1] + 1] += 1;
    valence[ix[t * 3 + 2] + 1] += 1;
  }

  // vertex -> incident faces (CSR)
  for (let v = 0; v < vertexCount; v += 1) valence[v + 1] += valence[v];
  const fill = valence.slice(0, vertexCount);
  const incident = new Uint32Array(triangles * 3);
  for (let t = 0; t < triangles; t += 1) {
    for (let k = 0; k < 3; k += 1) {
      const v = ix[t * 3 + k];
      incident[fill[v]] = t;
      fill[v] += 1;
    }
  }

  const cosCrease = Math.cos((creaseDegrees * Math.PI) / 180);
  const outPos = new Float32Array(triangles * 9);
  const outNor = new Float32Array(triangles * 9);

  for (let t = 0; t < triangles; t += 1) {
    const fx = faceNormal[t * 3], fy = faceNormal[t * 3 + 1], fz = faceNormal[t * 3 + 2];
    for (let k = 0; k < 3; k += 1) {
      const v = ix[t * 3 + k];
      let sx = 0, sy = 0, sz = 0;
      for (let s = valence[v]; s < valence[v + 1]; s += 1) {
        const g = incident[s];
        const gx = faceNormal[g * 3], gy = faceNormal[g * 3 + 1], gz = faceNormal[g * 3 + 2];
        if (fx * gx + fy * gy + fz * gz >= cosCrease) {
          sx += gx * faceArea[g];
          sy += gy * faceArea[g];
          sz += gz * faceArea[g];
        }
      }
      const len = Math.hypot(sx, sy, sz) || 1;
      const o = t * 9 + k * 3;
      const vx = p[v * 3];
      const vz = p[v * 3 + 2];
      outPos[o] = vx;
      outPos[o + 1] = p[v * 3 + 1];
      outPos[o + 2] = vz;
      outNor[o] = sx / len;
      outNor[o + 1] = sy / len;
      outNor[o + 2] = sz / len;

      if (cylinderRadii.length > 0) {
        const r = Math.hypot(vx, vz);
        if (r > 1e-6 && cylinderRadii.some((cr) => Math.abs(r - cr) < 2e-3)) {
          const rx = vx / r;
          const rz = vz / r;
          const facing = fx * rx + fz * rz; // sign tells whether the surface faces away from or towards the axis
          if (Math.abs(facing) > 0.94) {
            const sign = facing > 0 ? 1 : -1;
            outNor[o] = rx * sign;
            outNor[o + 1] = 0;
            outNor[o + 2] = rz * sign;
          }
        }
      }
    }
  }

  return { positions: outPos, normals: outNor };
}
