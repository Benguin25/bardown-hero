import { CHAPTER_LEVEL_COUNTS, LEVELS } from './content';
import type { Progress } from './progress';
import { stars } from './progress';

export type AchievementDefinition = { id: string; title: string; description: string; cosmeticReward?: string };
export type AchievementStats = { goals: number; passes: number; runs: number };
export type AchievementState = { version: 1; completed: Record<string, number>; stats: AchievementStats };
export type RunFacts = {
  shotStyle?: string; actionPower?: number | string; goalHeight?: string | number; curvedActions?: number;
  bankPasses?: number; leadPasses?: number; passes?: number; reboundUsed?: boolean; loosePuckRace?: boolean;
  retry?: boolean; highlightRoute?: boolean; goals?: number;
};
export type AchievementEvent = { type: 'run_completed'; levelIndex: number; run: boolean[]; facts?: RunFacts };

export const emptyAchievements = (): AchievementState => ({ version: 1, completed: {}, stats: { goals: 0, passes: 0, runs: 0 } });

const defs: AchievementDefinition[] = [
  { id: 'first-goal', title: 'First Goal', description: 'Score your first goal.' },
  { id: 'bar-down', title: 'Bar Down', description: 'Score a bar-down goal.', cosmeticReward: 'gold' },
  { id: 'one-timer', title: 'One-Timer', description: 'Score with a one-timer.' },
  { id: 'mega-curve', title: 'Mega Curve', description: 'Score using a mega curve.' },
  { id: 'fire-puck', title: 'Fire Puck', description: 'Score with maximum shot power.' },
  { id: 'bank-assist', title: 'Bank Assist', description: 'Complete a bank pass assist.' },
  { id: 'loose-puck', title: 'Loose-Puck Race', description: 'Win a loose-puck race.' },
  { id: 'rebound', title: 'Second Chance', description: 'Score after using a rebound.' },
  { id: 'no-retry', title: 'No Retry', description: 'Complete a level without retrying.', cosmeticReward: 'carbon' },
  { id: 'three-star', title: 'Hat Trick', description: 'Earn three stars on a level.' },
  { id: 'thirty-stars', title: 'Rising Star', description: 'Earn 30 stars.' },
  { id: 'sixty-stars', title: 'All-Star', description: 'Earn 60 stars.' },
  { id: 'ninety-stars', title: 'Superstar', description: 'Earn 90 stars.' },
  { id: 'chapter-complete', title: 'Chapter Complete', description: 'Complete every level in a chapter.' },
  { id: 'chapter-perfect', title: 'Perfect Chapter', description: 'Earn three stars on every level in a chapter.' },
  { id: 'career-stage', title: 'Career Stage', description: 'Complete four chapters.' },
  { id: 'late-perfect', title: 'Highlight Reel', description: 'Perfect a late-game highlight route.' },
  { id: 'campaign-complete', title: 'Full Campaign', description: 'Complete the entire campaign.' },
  { id: 'goal-machine', title: 'Goal Machine', description: 'Score 10 goals.' },
  { id: 'playmaker', title: 'Playmaker', description: 'Complete 25 passes.' },
];
export const ACHIEVEMENTS: readonly AchievementDefinition[] = defs;
export const achievementCatalog = ACHIEVEMENTS;

export function parseAchievements(raw: string | null): AchievementState {
  if (!raw) return emptyAchievements();
  try {
    const v = JSON.parse(raw); const out = emptyAchievements();
    if (v?.version !== 1 || !v || typeof v !== 'object') return out;
    if (v.completed && typeof v.completed === 'object' && !Array.isArray(v.completed)) for (const d of defs) if (typeof v.completed[d.id] === 'number' || v.completed[d.id] === true) out.completed[d.id] = typeof v.completed[d.id] === 'number' ? v.completed[d.id] : 1;
    if (v.stats && typeof v.stats === 'object') for (const k of ['goals','passes','runs'] as const) if (Number.isFinite(v.stats[k]) && v.stats[k] >= 0) out.stats[k] = Math.floor(v.stats[k]);
    return out;
  } catch { return emptyAchievements(); }
}

const totalStars = (p: Progress) => Object.values(p.runs).reduce((n, r) => n + stars(r), 0);
const chapterRanges = () => { const out: [number, number][] = []; let n = 0; for (const c of CHAPTER_LEVEL_COUNTS) { out.push([n, n + c]); n += c; } return out; };
export function observeAchievementEvent(state: AchievementState, event: AchievementEvent, progress: Progress): { state: AchievementState; unlocked: AchievementDefinition[] } {
  if (event.type !== 'run_completed') return { state, unlocked: [] };
  const facts = event.facts ?? {}; const next: AchievementState = { version: 1, completed: { ...state.completed }, stats: { ...state.stats, runs: state.stats.runs + 1, goals: state.stats.goals + (facts.goals ?? 1), passes: state.stats.passes + (facts.passes ?? 0) } };
  const s = stars(event.run); const has = (id: string) => Object.prototype.hasOwnProperty.call(next.completed, id);
  const ranges = chapterRanges(); const chapterDone = ranges.some(([a,b]) => Array.from({length:b-a},(_,i)=>progress.runs[String(a+i)]).every(Boolean));
  const chapterPerfect = ranges.some(([a,b]) => Array.from({length:b-a},(_,i)=>stars(progress.runs[String(a+i)]) === 3));
  const conditions: Record<string, boolean> = {
    'first-goal': next.stats.goals >= 1, 'bar-down': facts.goalHeight === 'bar-down' || facts.goalHeight === 'barDown' || (typeof facts.goalHeight === 'number' && facts.goalHeight >= 3.4),
    'one-timer': facts.shotStyle === 'one-timer' || facts.shotStyle === 'oneTimer', 'mega-curve': facts.actionPower === 'curve' || (facts.curvedActions ?? 0) > 0,
    'fire-puck': facts.actionPower === 'fire' || facts.actionPower === 'max' || (typeof facts.actionPower === 'number' && facts.actionPower >= 1), 'bank-assist': (facts.bankPasses ?? 0) > 0, 'loose-puck': !!facts.loosePuckRace,
    rebound: !!facts.reboundUsed, 'no-retry': !facts.retry, 'three-star': s === 3, 'thirty-stars': totalStars(progress) >= 30,
    'sixty-stars': totalStars(progress) >= 60, 'ninety-stars': totalStars(progress) >= 90, 'chapter-complete': chapterDone,
    'chapter-perfect': chapterPerfect, 'career-stage': ranges.filter(([a,b]) => Array.from({length:b-a},(_,i)=>progress.runs[String(a+i)]).every(Boolean)).length >= 4,
    'late-perfect': event.levelIndex >= 24 && s === 3 && !!facts.highlightRoute, 'campaign-complete': LEVELS.every((_,i) => !!progress.runs[String(i)]), 'goal-machine': next.stats.goals >= 10, playmaker: next.stats.passes >= 25,
  };
  const unlocked = defs.filter(d => conditions[d.id] && !has(d.id)); const now = Date.now(); for (const d of unlocked) next.completed[d.id] = now;
  return { state: next, unlocked };
}
export const isAchievementComplete = (state: AchievementState, id: string) => Object.prototype.hasOwnProperty.call(state.completed, id);
export const completedAchievementCount = (state: AchievementState) => Object.keys(state.completed).length;
