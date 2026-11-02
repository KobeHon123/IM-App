import {
  HANDLE_COVER_PARAMS,
  buildHandleCoverHalf,
  describeHandleCover,
  handleCoverFileName,
  normalizeHandleCoverParams,
} from './handleCover';
import type { ParamValues, PartTypeDefinition, PartTypeId } from './types';

/**
 * One entry per part type in the selector. To add a part type later, give it a `ready` entry with its own
 * parameters, `normalize`, `describe`, `build` (geometry generator) and `exportFileName`. The screen,
 * viewer, sliders and STL export are all driven by this registry.
 */
const comingSoon = (id: PartTypeId, label: string): PartTypeDefinition => ({
  id,
  label,
  title: label,
  description: 'This part type is not available yet.',
  status: 'coming-soon',
  parameters: [],
  normalize: (values) => values,
  describe: () => [],
  build: () => {
    throw new Error(`${label} is not implemented yet`);
  },
  exportFileName: () => `${id}.stl`,
});

const straight: PartTypeDefinition = {
  id: 'straight',
  label: 'Straight',
  title: 'Handle Cover – Half (round, S-type)',
  description: 'Half of a round handle cover. The lip and groove on the split edge are fixed.',
  status: 'ready',
  parameters: HANDLE_COVER_PARAMS,
  normalize: (values: ParamValues) => ({ ...normalizeHandleCoverParams(values) }),
  describe: describeHandleCover,
  build: buildHandleCoverHalf,
  exportFileName: handleCoverFileName,
};

const curvedShape: PartTypeDefinition = {
  id: 'curved-shape',
  label: 'U/Curved shape',
  title: 'U/Curved shape',
  description: 'This part type is not available yet.',
  status: 'coming-soon',
  parameters: [],
  normalize: (values) => values,
  describe: () => [],
  build: () => {
    throw new Error('U/Curved shape is not implemented yet');
  },
  exportFileName: () => 'u-curved-shape.stl',
};

export const PART_TYPES: PartTypeDefinition[] = [
  comingSoon('qc-block', 'QC Block'),
  straight,
  curvedShape,
  comingSoon('knob', 'Knob'),
  comingSoon('button', 'Button'),
  comingSoon('push-plate', 'Push Plate'),
];

export const DEFAULT_PART_TYPE: PartTypeId = 'straight';

export const getPartType = (id: PartTypeId): PartTypeDefinition => PART_TYPES.find((t) => t.id === id) ?? straight;
