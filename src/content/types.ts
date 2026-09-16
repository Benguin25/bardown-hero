export type Point = { x: number; z: number; height?: number; bounce?: boolean };
export type Powerup = 'fire' | 'curve' | 'freeze';
export type Objective = 'goal' | 'top' | 'curve' | 'passes' | 'rebound' | 'fire' | 'freeze' | 'bank' | 'lead';

/** Authored, serialisable description of one playable moment. */
export type AuthoredMoment = {
  title: string;
  instruction: string;
  carrier: Point;
  support: readonly Point[];
  defense: readonly Point[];
  powerup?: Powerup;
};

/** Stable id is for analytics/content tooling; saves continue to use array indexes. */
export type AuthoredLevel = {
  id: string;
  title: string;
  moments: readonly AuthoredMoment[];
  objectives: readonly Objective[];
};

export const POWERUPS: readonly Powerup[] = ['fire', 'curve', 'freeze'];
export const OBJECTIVE_IDS: readonly Objective[] = ['goal', 'top', 'curve', 'passes', 'rebound', 'fire', 'freeze', 'bank', 'lead'];

const point = (value: unknown): value is Point => {
  if (!value || typeof value !== 'object') return false;
  const p = value as Point;
  return Number.isFinite(p.x) && Number.isFinite(p.z);
};

/** Validate authored content at boundaries (editor/import/tests) without changing simulation tuning. */
export function validateLevels(levels: readonly AuthoredLevel[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  levels.forEach((level, index) => {
    if (!level || typeof level.id !== 'string' || !level.id.trim()) errors.push(`level ${index}: missing stable id`);
    else if (ids.has(level.id)) errors.push(`level ${index}: duplicate stable id ${level.id}`);
    else ids.add(level.id);
    if (!level?.title?.trim()) errors.push(`level ${index}: missing title`);
    if (!Array.isArray(level?.moments) || level.moments.length === 0) errors.push(`level ${index}: moments must be non-empty`);
    if (!Array.isArray(level?.objectives) || level.objectives.length !== 3 || new Set(level.objectives).size !== 3 || !level.objectives.includes('goal')) errors.push(`level ${index}: objectives must be exactly 3 unique entries including goal`);
    (level?.objectives ?? []).forEach((objective) => {
      if (!(OBJECTIVE_IDS as readonly string[]).includes(objective)) errors.push(`level ${index}: invalid objective ${String(objective)}`);
    });
    (level?.moments ?? []).forEach((moment, momentIndex) => {
      if (!moment?.title?.trim() || !moment?.instruction?.trim()) errors.push(`level ${index} moment ${momentIndex}: missing title/instruction`);
      if (!point(moment?.carrier) || !Array.isArray(moment?.support) || moment.support.length !== 2 || !moment.support.every(point) || !Array.isArray(moment?.defense) || moment.defense.length !== 2 || !moment.defense.every(point)) errors.push(`level ${index} moment ${momentIndex}: invalid formation`);
      if (moment?.powerup !== undefined && !(POWERUPS as readonly string[]).includes(moment.powerup)) errors.push(`level ${index} moment ${momentIndex}: invalid powerup ${String(moment.powerup)}`);
    });
  });
  return errors;
}

export function assertValidLevels(levels: readonly AuthoredLevel[]): void {
  const errors = validateLevels(levels);
  if (errors.length) throw new Error(`Invalid level content:\n${errors.join('\n')}`);
}
