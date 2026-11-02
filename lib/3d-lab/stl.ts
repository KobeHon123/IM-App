import type { IndexedMesh } from './types';

/**
 * Binary STL, millimetres, no scaling. Facet normals are computed from the
 * triangle winding; triangles with no area are dropped.
 */
export function meshToBinaryStl(mesh: IndexedMesh, header = 'IM-App 3D Lab - units: mm'): Uint8Array {
  const { positions: p, indices: ix } = mesh;
  const triangles = ix.length / 3;

  const facets: number[] = [];
  for (let t = 0; t < triangles; t += 1) {
    const a = ix[t * 3] * 3;
    const b = ix[t * 3 + 1] * 3;
    const c = ix[t * 3 + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) continue;
    facets.push(t);
  }

  const buffer = new ArrayBuffer(84 + facets.length * 50);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < Math.min(header.length, 80); i += 1) bytes[i] = header.charCodeAt(i) & 0x7f;
  view.setUint32(80, facets.length, true);

  let offset = 84;
  for (const t of facets) {
    const a = ix[t * 3] * 3;
    const b = ix[t * 3 + 1] * 3;
    const c = ix[t * 3 + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    view.setFloat32(offset, nx / len, true);
    view.setFloat32(offset + 4, ny / len, true);
    view.setFloat32(offset + 8, nz / len, true);
    offset += 12;
    for (const v of [a, b, c]) {
      view.setFloat32(offset, p[v], true);
      view.setFloat32(offset + 4, p[v + 1], true);
      view.setFloat32(offset + 8, p[v + 2], true);
      offset += 12;
    }
    view.setUint16(offset, 0, true);
    offset += 2;
  }

  return bytes;
}
