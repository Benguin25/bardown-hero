import { CHAPTER_LEVEL_COUNTS, LEVELS } from './content';
import { isUnlocked, stars, type Progress } from './progress';

/**
 * A venue is the physical face of a chapter: one band on the campaign map,
 * one star gate. Chapters stay the content unit; venues are how they read.
 */
export type Venue = {
  id: string;
  name: string;
  /** Copy for the "walk into the next place" button on the unlock state. */
  cta: string;
  order: number;
  /** Total stars the player must hold before this venue opens. */
  gateStars: number;
  start: number;
  count: number;
  /** Stylized band backdrop until real venue art exists. */
  band: readonly [string, string, string];
  accent: string;
  /** Commissioned art, when it lands. Absent means the stripe placeholder. */
  venueArt?: string;
};

const NAMES = ['BACKYARD POND', 'COMMUNITY RINK', 'JUNIOR BARN', 'COLLEGE ARENA', 'MINOR PRO', 'THE BIG LEAGUE'];
const CTAS = ['HIT THE POND', 'WALK INTO THE RINK', 'WALK INTO THE BARN', 'WALK INTO THE ARENA', 'CATCH THE BUS', 'WALK INTO THE LEAGUE'];
// Gates sit above the one-star-per-level floor so a venue is something you
// earn, but always far under the stars available before it, so replaying a
// couple of earlier levels is enough to break any gate.
const GATES = [0, 5, 12, 20, 30, 44];
const BANDS: readonly (readonly [string, string, string])[] = [
  ['#0A1A22', '#0B2029', '#071620'],
  ['#07202E', '#0A2A3A', '#061A26'],
  ['#131E12', '#1A2A18', '#08150F'],
  ['#161226', '#1E1A38', '#0A0A1C'],
  ['#231423', '#33203A', '#120A18'],
  ['#2A1512', '#3A2118', '#160A0C'],
];
const ACCENTS = ['#9DBCCB', '#78BED7', '#8ED08A', '#A392F0', '#E08ADA', '#FF9A6B'];

export const VENUES: readonly Venue[] = CHAPTER_LEVEL_COUNTS.map((count, order) => ({
  id: `venue-${String(order + 1).padStart(2, '0')}`,
  name: NAMES[order] ?? `VENUE ${order + 1}`,
  cta: CTAS[order] ?? 'KEEP CLIMBING',
  order,
  gateStars: GATES[order] ?? 0,
  start: CHAPTER_LEVEL_COUNTS.slice(0, order).reduce((sum, n) => sum + n, 0),
  count,
  band: BANDS[order] ?? BANDS[0],
  accent: ACCENTS[order] ?? ACCENTS[0],
}));

export const TOTAL_STARS = LEVELS.length * 3;
export const totalStars = (progress: Progress) =>
  LEVELS.reduce((sum, _, i) => sum + stars(progress.runs[String(i)]), 0);

export const venueOfLevel = (index: number) =>
  VENUES.find(venue => index >= venue.start && index < venue.start + venue.count) ?? VENUES[VENUES.length - 1];

export const venueStars = (progress: Progress, venue: Venue) =>
  Array.from({ length: venue.count }, (_, i) => stars(progress.runs[String(venue.start + i)])).reduce((sum, n) => sum + n, 0);

export const venueCleared = (progress: Progress, venue: Venue) =>
  Array.from({ length: venue.count }, (_, i) => !!progress.runs[String(venue.start + i)]?.[0]).every(Boolean);

/** A venue opens on total stars; levels inside it still unlock in order. */
export const isVenueOpen = (progress: Progress, venue: Venue, total = totalStars(progress)) => total >= venue.gateStars;

export const isPlayable = (progress: Progress, index: number, total = totalStars(progress)) =>
  isUnlocked(progress, index) && isVenueOpen(progress, venueOfLevel(index), total);

/** The level the map centres on: first unfinished level the player can enter. */
export function currentLevel(progress: Progress): number {
  const total = totalStars(progress);
  for (let i = 0; i < LEVELS.length; i++) {
    if (!progress.runs[String(i)]?.[0] && isPlayable(progress, i, total)) return i;
  }
  for (let i = 0; i < LEVELS.length; i++) if (!progress.runs[String(i)]?.[0]) return i;
  return LEVELS.length - 1;
}

/** The venue the player is being asked to unlock next, if one is sealed. */
export function sealedVenue(progress: Progress): Venue | undefined {
  const total = totalStars(progress);
  return VENUES.find(venue => !isVenueOpen(progress, venue, total));
}

/**
 * How close the player is to breaking the next gate, 0..1. Drives the bar on
 * the sealed-gate card and the "5 ★ OPENS COMMUNITY RINK" line on home.
 * 1 when nothing is sealed — there is no gate left to fill.
 */
export function nextGateProgress(progress: Progress): number {
  const venue = sealedVenue(progress);
  if (!venue || venue.gateStars <= 0) return 1;
  return Math.max(0, Math.min(1, totalStars(progress) / venue.gateStars));
}

/** Level count behind the CAMPAIGN button, so it can say what it opens. */
export const currentVenueLevelCount = (progress: Progress) =>
  venueOfLevel(currentLevel(progress)).count;

export const openVenues = (progress: Progress) => {
  const total = totalStars(progress);
  return new Set(VENUES.filter(venue => isVenueOpen(progress, venue, total)).map(venue => venue.order));
};
