import { LEVELS } from './content';

// Store the best complete run, never merge objectives from separate attempts.
export type Progress = { version: 1; runs: Record<string, boolean[]> };
export const emptyProgress = (): Progress => ({ version: 1, runs: {} });
export const stars = (run?: boolean[]) => run?.filter(Boolean).length ?? 0;
export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !value.runs || typeof value.runs !== 'object' || Array.isArray(value.runs)) throw new Error('Unrecognized save');
  const progress = emptyProgress();
  for (const [key, run] of Object.entries(value.runs)) {
    if (!/^(0|[1-9][0-9]*)$/.test(key) || !LEVELS[Number(key)] || !Array.isArray(run) || run.length !== 3 || run.some(v => typeof v !== 'boolean') || !run[0]) throw new Error('Invalid saved run');
    progress.runs[key] = [...run];
  }
  return progress;
}
export const isUnlocked = (progress: Progress, index: number) => index === 0 || !!progress.runs[String(index - 1)]?.[0];
export function recordRun(progress: Progress, index: number, run: boolean[]): Progress {
  if (!LEVELS[index] || !isUnlocked(progress, index) || run.length !== 3 || !run[0] || stars(run) <= stars(progress.runs[String(index)])) return progress;
  return { version: 1, runs: { ...progress.runs, [String(index)]: [...run] } };
}
