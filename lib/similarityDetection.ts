import { Part, PartType } from '@/types';

/**
 * Calculate the similarity percentage between two sets of dimensions
 * @param dims1 - First set of dimensions
 * @param dims2 - Second set of dimensions
 * @returns Similarity percentage (0-100)
 */
export const calculateDimensionSimilarity = (dims1: any, dims2: any): number => {
  const keys = Object.keys(dims1).filter(
    key =>
      dims2[key] !== undefined &&
      dims2[key] !== '' &&
      dims1[key] !== ''
  );
  if (keys.length === 0) return 0;

  let totalDifference = 0;
  let validKeys = 0;

  for (const key of keys) {
    const val1 = parseFloat(dims1[key]) || 0;
    const val2 = parseFloat(dims2[key]) || 0;

    if ((val1 === 0 && val2 === 0) || (isNaN(val1) && isNaN(val2))) {
      continue;
    }

    const maxVal = Math.max(Math.abs(val1), Math.abs(val2));
    if (maxVal === 0) continue;

    const percentageDifference = (Math.abs(val1 - val2) / maxVal) * 100;
    totalDifference += percentageDifference;
    validKeys++;
  }

  if (validKeys === 0) return 0;

  const avgDifference = totalDifference / validKeys;
  return Math.max(0, 100 - avgDifference);
};

/**
 * Find the most similar part from a list of parts
 * @param currentPartType - Type of the part being created
 * @param currentDimensions - Dimensions of the part being created
 * @param partsToSearch - List of parts to search through
 * @param similarityThreshold - Minimum similarity percentage (default: 90)
 * @returns Object with the most similar part and its similarity percentage, or null
 */
export const findSimilarPart = (
  currentPartType: PartType,
  currentDimensions: any,
  partsToSearch: Part[],
  similarityThreshold: number = 90
): { part: Part; similarity: number } | null => {
  if (!currentPartType || Object.keys(currentDimensions).length === 0) {
    return null;
  }

  let highestSimilarity = 0;
  let mostSimilarPart: Part | null = null;

  for (const part of partsToSearch) {
    // Only compare with parts of the same type
    if (part.type !== currentPartType) continue;

    const similarity = calculateDimensionSimilarity(
      currentDimensions,
      part.dimensions || {}
    );

    if (similarity > similarityThreshold && similarity > highestSimilarity) {
      highestSimilarity = similarity;
      mostSimilarPart = part;
    }
  }

  if (mostSimilarPart) {
    return { part: mostSimilarPart, similarity: highestSimilarity };
  }

  return null;
};
