export type PartTypeId = 'qc-block' | 'curved-shape' | 'straight' | 'knob' | 'button' | 'push-plate';

/** Triangle mesh with shared vertices. Units are millimetres. */
export interface IndexedMesh {
  /** x, y, z per vertex */
  positions: Float32Array;
  /** three vertex indices per triangle, counter-clockwise seen from outside */
  indices: Uint32Array;
}

export interface MeshStats {
  triangles: number;
  vertices: number;
  /** edges that are not shared by exactly two triangles with opposite directions */
  openEdges: number;
  nonManifoldEdges: number;
  degenerateTriangles: number;
  watertight: boolean;
  /** signed volume in mm³ (positive = outward-facing triangles) */
  volume: number;
  min: [number, number, number];
  max: [number, number, number];
}

export type ParamValues = Record<string, number | boolean>;

export interface SliderParamSpec {
  kind: 'slider';
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** digits shown after the decimal point */
  decimals: number;
}

export interface ToggleParamSpec {
  kind: 'toggle';
  key: string;
  label: string;
  default: boolean;
  description?: string;
}

export type ParamSpec = SliderParamSpec | ToggleParamSpec;

/** A line of derived information shown under a control. */
export interface ParamNote {
  /** key of the parameter the note belongs to */
  paramKey: string;
  tone: 'info' | 'warning';
  text: string;
}

export interface BuiltPart {
  mesh: IndexedMesh;
  /** radii of cylinders around the Y axis, used to shade curved faces smoothly */
  cylinderRadii: number[];
  /** parameter values after clamping, i.e. what was really modelled */
  effective: ParamValues;
  notes: ParamNote[];
}

export interface PartTypeDefinition {
  id: PartTypeId;
  label: string;
  title: string;
  description: string;
  status: 'ready' | 'coming-soon';
  parameters: ParamSpec[];
  /** clamp / snap raw slider input so the geometry can never become invalid */
  normalize: (values: ParamValues) => ParamValues;
  /** notes that do not need the (expensive) mesh, e.g. "Handle Ø 25 → Inner wall Ø 27" */
  describe: (values: ParamValues) => ParamNote[];
  build: (values: ParamValues) => BuiltPart;
  exportFileName: (values: ParamValues) => string;
}

export function defaultValues(def: PartTypeDefinition): ParamValues {
  const values: ParamValues = {};
  for (const spec of def.parameters) values[spec.key] = spec.default;
  return values;
}
