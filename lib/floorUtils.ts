import type { Part } from '@/types';

export const STANDARD_FLOORS: string[] = ['G', ...Array.from({ length: 99 }, (_, i) => String(i + 1))];

export const MAX_FLOOR_LENGTH = 8;

export const floorQtyKey = (partId: string, floor: string) => `${partId}::${floor}`;

const floorRank = (floor: string): [number, number, string] => {
  const basement = floor.match(/^B(\d+)$/);
  if (basement) return [0, -parseInt(basement[1], 10), floor];
  if (floor === 'G') return [1, 0, floor];
  if (/^\d+$/.test(floor)) return [2, parseInt(floor, 10), floor];
  return [3, 0, floor];
};

export const sortFloors = (floors: string[]): string[] =>
  [...floors].sort((a, b) => {
    const ra = floorRank(a);
    const rb = floorRank(b);
    if (ra[0] !== rb[0]) return ra[0] - rb[0];
    if (ra[1] !== rb[1]) return ra[1] - rb[1];
    return ra[2].localeCompare(rb[2]);
  });

export const normalizeFloorInput = (input: string): string | null => {
  const cleaned = input.trim().toUpperCase().replace(/[\s,:]+/g, '');
  if (!cleaned || cleaned.length > MAX_FLOOR_LENGTH) return null;
  if (/^\d+$/.test(cleaned)) {
    const n = parseInt(cleaned, 10);
    return n === 0 ? 'G' : String(n);
  }
  return cleaned;
};

export const isButtonSetDimensions = (dimensions?: Record<string, any> | null): boolean =>
  !!dimensions && dimensions.buttonSet === true && Array.isArray(dimensions.floors);

export const isButtonSet = (part: Pick<Part, 'type' | 'dimensions'>): boolean =>
  part.type === 'Button' && isButtonSetDimensions(part.dimensions as Record<string, any>);

export const getPartFloors = (part: Pick<Part, 'type' | 'dimensions'>): string[] =>
  isButtonSet(part) ? sortFloors((part.dimensions as any).floors as string[]) : [];

export const getFloorQuantity = (quantities: Record<string, number>, partId: string, floor: string) =>
  quantities[floorQtyKey(partId, floor)] || 0;

export const getButtonSetTotal = (quantities: Record<string, number>, partId: string, floors: string[]) =>
  floors.reduce((sum, floor) => sum + getFloorQuantity(quantities, partId, floor), 0);
