export * from './types';
export * from './levels';
import { LEVELS } from './levels';

// Saves remain index-addressed; stable ids support authoring tools and future migrations.
export const LEVEL_IDS = Object.freeze(LEVELS.map(level => level.id));

export function levelId(index: number): string | undefined {
  return LEVEL_IDS[index];
}

export function levelIndex(id: string): number {
  return LEVEL_IDS.indexOf(id);
}
