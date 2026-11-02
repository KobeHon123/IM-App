import { encode } from 'base64-arraybuffer';
import { buildRenderBuffers } from './mesh';
import type { BuiltPart } from './types';

export interface ViewerMeshPayload {
  /** base64 of little-endian Float32 xyz per triangle corner */
  positions: string;
  /** base64 of Int8 (normalised) xyz per triangle corner */
  normals: string;
  triangles: number;
}

/** Converts a built part into compact buffers for the preview page. */
export function toViewerPayload(part: BuiltPart): ViewerMeshPayload {
  const { positions, normals } = buildRenderBuffers(part.mesh, 35, part.cylinderRadii);
  const packed = new Int8Array(normals.length);
  for (let i = 0; i < normals.length; i += 1) packed[i] = Math.round(normals[i] * 127);
  return {
    positions: encode(positions.buffer as ArrayBuffer),
    normals: encode(packed.buffer as ArrayBuffer),
    triangles: positions.length / 9,
  };
}
