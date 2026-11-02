/**
 * Writes a standalone HTML file that loads the real viewer page and feeds it a generated part, so the
 * preview can be checked in any browser:  esbuild + node scripts/viewer-smoke.ts <out.html> <icon:0|1> [h] [d] [c]
 */
import * as fs from 'fs';
import { VIEWER_HTML } from '../lib/3d-lab/viewerHtml.generated';
import { buildHandleCoverHalf } from '../lib/3d-lab/handleCover';
import { buildRenderBuffers } from '../lib/3d-lab/mesh';

const [out, icon, h, d, c] = process.argv.slice(2);
const built = buildHandleCoverHalf({ height: Number(h ?? 200), handleDiameter: Number(d ?? 25), chamfer: Number(c ?? 1), companyIcon: icon === '1' });
const { positions, normals } = buildRenderBuffers(built.mesh, 35, built.cylinderRadii);
const n8 = new Int8Array(normals.length);
for (let i = 0; i < normals.length; i += 1) n8[i] = Math.round(normals[i] * 127);
const b64 = (a: ArrayBufferView) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const msg = { type: 'mesh', positions: b64(positions), normals: b64(n8), theme: { background: '#eef1f5', part: '#a9b8c9', grid: '#8a94a3' } };
const html = VIEWER_HTML.replace('</body>', `<script>window.__lab.handle(${JSON.stringify(msg)});</script></body>`);
fs.writeFileSync(out, html);
console.log('wrote', out, built.mesh.indices.length / 3, 'triangles');
