/**
 * Geometry self-test for the 3D Lab. Run with:  npm run test:3d-lab
 * Checks watertightness, orientation, bounds and the lip/groove points against the reference STL.
 */
import { buildHandleCoverHalf, lipPoints } from '../lib/3d-lab/handleCover';
import { analyzeMesh } from '../lib/3d-lab/mesh';
import { meshToBinaryStl } from '../lib/3d-lab/stl';
import type { ParamValues } from '../lib/3d-lab/types';
import * as fs from 'fs';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures += 1;
};
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

// lip points for r_in = 13.5 (reference STL: P1 = (15, 0), P2 = (14.361, -2), P3 = (13.371, -1.862))
const lip = lipPoints(13.5, 16);
check('lip P1', near(lip.p1.x, 15, 0.05) && near(lip.p1.z, 0, 0.05));
check('lip P2', near(lip.p2.x, 14.361, 0.05) && near(lip.p2.z, -2, 0.05), `(${lip.p2.x.toFixed(3)}, ${lip.p2.z})`);
check('lip P3', near(lip.p3.x, 13.371, 0.05) && near(lip.p3.z, -1.862, 0.05), `(${lip.p3.x.toFixed(3)}, ${lip.p3.z.toFixed(3)})`);

const cases: Array<[string, ParamValues]> = [
  ['default (no icon)', { height: 200, handleDiameter: 25, chamfer: 1, companyIcon: false }],
  ['no chamfer', { height: 200, handleDiameter: 25, chamfer: 0, companyIcon: false }],
  ['chamfer 0.5, small handle', { height: 60, handleDiameter: 10, chamfer: 0.5, companyIcon: false }],
  ['chamfer 2.5 (clamped)', { height: 100, handleDiameter: 60, chamfer: 2.5, companyIcon: false }],
  ['default + icon', { height: 200, handleDiameter: 25, chamfer: 1, companyIcon: true }],
  ['icon, no chamfer', { height: 120, handleDiameter: 40, chamfer: 0, companyIcon: true }],
  ['icon, short + small', { height: 20, handleDiameter: 10, chamfer: 0.25, companyIcon: true }],
  ['icon, max size', { height: 400, handleDiameter: 60, chamfer: 2.5, companyIcon: true }],
];

for (const [name, values] of cases) {
  const t0 = Date.now();
  const built = buildHandleCoverHalf(values);
  const ms = Date.now() - t0;
  const stats = analyzeMesh(built.mesh);
  const H = built.effective.height as number;
  const Ro = ((built.effective.handleDiameter as number) + 2) / 2 + 2.5;
  check(`${name}: watertight`, stats.watertight, `tris=${stats.triangles} open=${stats.openEdges} nonManifold=${stats.nonManifoldEdges} degenerate=${stats.degenerateTriangles} (${ms} ms)`);
  check(`${name}: outward volume`, stats.volume > 0, `${stats.volume.toFixed(1)} mm3`);
  check(`${name}: bounds`, near(stats.min[1], -H, 1e-3) && near(stats.max[1], 0, 1e-3) && near(stats.max[0], Ro, 1e-3) && near(stats.min[0], -Ro, 1e-3) && near(stats.min[2], -2, 1e-3) && near(stats.max[2], Ro, 1e-3),
    `x ${stats.min[0].toFixed(2)}..${stats.max[0].toFixed(2)} y ${stats.min[1].toFixed(2)}..${stats.max[1].toFixed(2)} z ${stats.min[2].toFixed(2)}..${stats.max[2].toFixed(2)}`);
}

// reference comparison for the default geometry (reference volume 23098 mm3 also contains inner text + a small logo recess)
const ref = buildHandleCoverHalf({ height: 200, handleDiameter: 25, chamfer: 1, companyIcon: false });
const refStats = analyzeMesh(ref.mesh);
check('default volume close to reference STL (23098 mm3, which includes small text/logo features)', near(refStats.volume, 23098, 400), refStats.volume.toFixed(1));

const iconOn = buildHandleCoverHalf({ height: 200, handleDiameter: 25, chamfer: 1, companyIcon: true });
const iconStats = analyzeMesh(iconOn.mesh);
check('engraving removes material', iconStats.volume < refStats.volume - 10, `${(refStats.volume - iconStats.volume).toFixed(1)} mm3 removed`);

const stl = meshToBinaryStl(iconOn.mesh);
const triCount = new DataView(stl.buffer).getUint32(80, true);
check('binary STL size', stl.length === 84 + triCount * 50, `${triCount} facets, ${(stl.length / 1024).toFixed(0)} KB`);

if (process.argv[2]) {
  fs.writeFileSync(process.argv[2], stl);
  fs.writeFileSync(process.argv[2].replace(/\.stl$/, '') + '_plain.stl', meshToBinaryStl(ref.mesh));
  console.log('wrote', process.argv[2]);
}

console.log(failures === 0 ? '\nAll checks passed' : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
