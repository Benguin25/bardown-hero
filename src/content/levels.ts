import type { AuthoredLevel } from './types';
import { assertValidLevels } from './types';
export type { Powerup, Objective, Point } from './types';
import type { Powerup, Objective, Point } from './types';
export type Moment = AuthoredLevel['moments'][number]; export type Level = AuthoredLevel;
const MOMENTS = [
  { title: 'THE BREAKOUT', instruction: 'Drag anywhere. Guide the puck path to a teal teammate.', carrier: { x: -4, z: 12 }, support: [{ x: 6, z: 4 }, { x: -6, z: -4 }], defense: [{ x: -1, z: 2 }, { x: 2, z: -10 }] },
  { title: 'BEND THE RULES', instruction: 'Curve around the red defender to your teammate.', carrier: { x: 6, z: 3 }, support: [{ x: -6, z: -7 }, { x: 7, z: -10 }], defense: [{ x: 0, z: -2 }, { x: 6.5, z: -5.8 }] },
  { title: 'PICK YOUR CORNER', instruction: 'Aim high or low into a gold corner. Red is covered.', carrier: { x: -4, z: -10 }, support: [{ x: 7, z: -10 }, { x: -7, z: -14 }], defense: [{ x: -1, z: -4 }, { x: 4, z: -6 }] },
] as const;

type LevelScenario = Omit<AuthoredLevel, 'id' | 'objectives'>;
const RAW_LEVELS: readonly LevelScenario[] = [
  { title: 'THE OPENING RUSH', moments: MOMENTS },
  { title: 'AROUND THE STICK', moments: [
    { title: 'HOOK THE PASS', instruction: 'Bend left of the defender, then into the far teammate.', carrier: { x: -6, z: 6 }, support: [{ x: 5, z: -6 }, { x: -7, z: -9 }], defense: [{ x: -0.5, z: 0 }, { x: -6.5, z: -2 }] },
    { title: 'FAR CORNER', instruction: 'Finish the rush with a corner shot.', carrier: { x: 5, z: -10 }, support: [{ x: -6, z: -10 }, { x: 7, z: -13 }], defense: [{ x: -2, z: -6 }, { x: 0, z: -12 }] },
  ] },
  { title: 'CROSS-ICE ONE-TIMER', moments: [
    { title: 'ACROSS THE SLOT', instruction: 'Send it across to the right wing. Be ready to shoot.', carrier: { x: -7, z: -10 }, support: [{ x: 7, z: -10 }, { x: -5, z: -5 }], defense: [{ x: 0, z: -7 }, { x: -2, z: -14 }] },
    { title: 'HIT IT FIRST TIME', instruction: 'No skating delay. Swipe into the near corner.', carrier: { x: 7, z: -10 }, support: [{ x: -7, z: -10 }, { x: -5, z: -5 }], defense: [{ x: 0, z: -7 }, { x: -2, z: -14 }] },
  ] },
  { title: 'TWO CLOSED LANES', moments: [
    { title: 'SPLIT THE COVERAGE', instruction: 'Both straight lanes are blocked. Loop outside to a wing.', carrier: { x: 0, z: 8 }, support: [{ x: -7, z: -2 }, { x: 7, z: -2 }], defense: [{ x: -3.5, z: 3 }, { x: 3.5, z: 3 }] },
    { title: 'SWITCH SIDES', instruction: 'Curl below the red jerseys and find the opposite wing.', carrier: { x: -7, z: -3 }, support: [{ x: 7, z: -9 }, { x: -7, z: -12 }], defense: [{ x: 0, z: -6 }, { x: -7, z: -7.5 }] },
    { title: 'AROUND TRAFFIC', instruction: 'Bend outside the defender and back inside the right post.', carrier: { x: 6, z: -9 }, support: [{ x: -7, z: -10 }, { x: 8, z: -5 }], defense: [{ x: 4, z: -13.5 }, { x: -1, z: -12 }] },
  ] },
  { title: 'SAVE & SCRAMBLE', moments: [
    { title: 'SET UP THE SAVE', instruction: 'Feed the slot. Crash the crease for the second chance.', carrier: { x: -6, z: -5 }, support: [{ x: 0, z: -10 }, { x: 7, z: -9 }], defense: [{ x: -5, z: -12 }, { x: 5, z: -6 }] },
    { title: 'TEST THE PADS', instruction: 'Shoot at the goalie for a guided rebound, then pick a corner.', carrier: { x: 0, z: -10 }, support: [{ x: 6, z: -11.5 }, { x: -7, z: -10 }], defense: [{ x: -5, z: -13 }, { x: 5, z: -6 }] },
  ] },
  { title: 'BREAKAWAY HEAT', moments: [
    { title: 'SPRING THE WINGER', instruction: 'Lead the right wing into open ice.', carrier: { x: -5, z: 2 }, support: [{ x: 5, z: -10 }, { x: -7, z: -8 }], defense: [{ x: -8, z: 5 }, { x: 8, z: 4 }] },
    { title: 'LIGHT THE LAMP', instruction: 'Tap FIRE PUCK, then rip a shot into a corner.', carrier: { x: 5, z: -10 }, support: [{ x: -5, z: -9 }, { x: -7, z: -5 }], defense: [{ x: -8, z: 2 }, { x: 8, z: 1 }], powerup: 'fire' },
  ] },
  { title: 'THE BIG BENDER', moments: [
    { title: 'LOAD THE SLINGSHOT', instruction: 'Feed the left wing for a ridiculous finish.', carrier: { x: 6, z: 1 }, support: [{ x: -6, z: -10 }, { x: 7, z: -8 }], defense: [{ x: -8, z: 4 }, { x: 8, z: 5 }] },
    { title: 'BEND SPACE', instruction: 'Tap MEGA CURVE. Draw a bend; the preview amplifies it.', carrier: { x: -6, z: -10 }, support: [{ x: 6, z: -7 }, { x: -8, z: -5 }], defense: [{ x: -8, z: 2 }, { x: 8, z: 1 }], powerup: 'curve' },
  ] },
  { title: 'COLD SNAP', moments: [
    { title: 'ICE THE DEFENSE', instruction: 'Tap FREEZE to hold the defenders. Pass through the middle.', carrier: { x: -6, z: 2 }, support: [{ x: 5, z: -9 }, { x: -7, z: -9 }], defense: [{ x: -4, z: -5 }, { x: 4, z: 2 }], powerup: 'freeze' },
    { title: 'THAW THE NET', instruction: 'Finish high before the goalie gets across.', carrier: { x: 5, z: -9 }, support: [{ x: -6, z: -8 }, { x: 7, z: -4 }], defense: [{ x: -7, z: -3 }, { x: 7, z: 1 }] },
  ] },
  { title: 'NEEDLE & THREAD', moments: [
    { title: 'THE NARROW WINDOW', instruction: 'Thread the middle between two red jerseys.', carrier: { x: 0, z: 6 }, support: [{ x: 0, z: -6 }, { x: -7, z: -8 }], defense: [{ x: -2, z: 0 }, { x: 2, z: 0 }] },
    { title: 'SEND IT WIDE', instruction: 'Find the left wing, then bring it home.', carrier: { x: 0, z: -6 }, support: [{ x: -7, z: -10 }, { x: 7, z: -9 }], defense: [{ x: -3, z: 1 }, { x: 3, z: 1 }] },
    { title: 'SHELF SERVICE', instruction: 'Pick a high corner from the wing.', carrier: { x: -7, z: -10 }, support: [{ x: 0, z: -7 }, { x: 7, z: -9 }], defense: [{ x: -4, z: -3 }, { x: 4, z: -3 }] },
  ] },
  { title: 'LIGHTS OUT FINAL', moments: [
    { title: 'WIN THE ENTRY', instruction: 'Freeze the coverage and find the right wing.', carrier: { x: -5, z: 8 }, support: [{ x: 6, z: 0 }, { x: -7, z: -5 }], defense: [{ x: -6, z: 2 }, { x: 4, z: -5 }], powerup: 'freeze' },
    { title: 'CROSS THE ICE', instruction: 'Swing a pass across to the left wing.', carrier: { x: 6, z: 0 }, support: [{ x: -6, z: -8 }, { x: 7, z: -10 }], defense: [{ x: -7, z: 3 }, { x: 7, z: 3 }] },
    { title: 'THE LAST FEED', instruction: 'Send it right for the final one-timer.', carrier: { x: -6, z: -8 }, support: [{ x: 6, z: -11 }, { x: -8, z: -3 }], defense: [{ x: -7, z: 2 }, { x: 7, z: 2 }] },
    { title: 'BRING THE HEAT', instruction: 'Fire Puck is ready. End this with a high-corner rocket.', carrier: { x: 6, z: -11 }, support: [{ x: -6, z: -8 }, { x: -8, z: -3 }], defense: [{ x: -7, z: 2 }, { x: 7, z: 2 }], powerup: 'fire' },
  ] },
  { title: 'INTO THE GAP', moments: [
    { title: 'LEAD THE RUSH', instruction: 'Send it ahead of the right wing. Let them skate onto it.', carrier: { x: -5, z: 5 }, support: [{ x: 5, z: -3 }, { x: -7, z: -8 }], defense: [{ x: -7, z: 2 }, { x: 8, z: 4 }] },
    { title: 'CATCH & RELEASE', instruction: 'Collected in stride. Rip a high corner.', carrier: { x: 5, z: -7 }, support: [{ x: -5, z: -6 }, { x: -7, z: -10 }], defense: [{ x: -8, z: 2 }, { x: 8, z: 1 }] },
  ] },
  { title: 'RIM & RIP', moments: [
    { title: 'USE THE WALL', instruction: 'Bank off the right boards toward the waiting wing.', carrier: { x: -4, z: 10 }, support: [{ x: 6, z: -5 }, { x: -7, z: -7 }], defense: [{ x: -3, z: -1 }, { x: -7, z: 5 }] },
    { title: 'ACROSS THE SEAM', instruction: 'Switch to the left wing for the finish.', carrier: { x: 6, z: 2 }, support: [{ x: -6, z: -10 }, { x: 7, z: -9 }], defense: [{ x: -8, z: 4 }, { x: 8, z: 5 }] },
    { title: 'RIP IT HOME', instruction: 'High corner. Make the boards your best assist.', carrier: { x: -6, z: -10 }, support: [{ x: 6, z: -6 }, { x: 8, z: -10 }], defense: [{ x: -8, z: 3 }, { x: 8, z: 3 }] },
  ] },
  { title: 'DOUBLE TAKE', moments: [
    { title: 'SELL THE FAKE', instruction: 'Two receivers. Curl outside the coverage to either wing.', carrier: { x: 0, z: 6 }, support: [{ x: -7, z: -3 }, { x: 7, z: -3 }], defense: [{ x: -3, z: 1 }, { x: 3, z: 1 }] },
    { title: 'SWITCH THE PLAY', instruction: 'Find the opposite wing. Make the goalie turn twice.', carrier: { x: -7, z: -3 }, support: [{ x: 7, z: -10 }, { x: -7, z: -11 }], defense: [{ x: -3, z: 2 }, { x: 3, z: 2 }] },
    { title: 'ONE TOUCH', instruction: 'Catch, shoot, celebrate. Pick a high corner.', carrier: { x: 7, z: -10 }, support: [{ x: -7, z: -10 }, { x: 0, z: -6 }], defense: [{ x: -4, z: -3 }, { x: 4, z: -3 }] },
  ] },
  { title: 'SECOND HELPING', moments: [
    { title: 'FEED THE CREASE', instruction: 'Find the center. A pad save is your invitation.', carrier: { x: -7, z: -3 }, support: [{ x: 0, z: -10 }, { x: 7, z: -10 }], defense: [{ x: -7, z: -12 }, { x: 6, z: -3 }] },
    { title: 'CRASH THE NET', instruction: 'Shoot low at the pads, then bury the rebound upstairs.', carrier: { x: 0, z: -10 }, support: [{ x: 6, z: -11.5 }, { x: -7, z: -10 }], defense: [{ x: -6, z: -13 }, { x: 6, z: -3 }] },
  ] },
  { title: 'THROUGH THE CROWD', moments: [
    { title: 'DRAW THEM IN', instruction: 'Slip a pass to the right wing.', carrier: { x: -6, z: 4 }, support: [{ x: 6, z: -5 }, { x: -7, z: -7 }], defense: [{ x: -6, z: -2 }, { x: 0, z: -8 }] },
    { title: 'FIND THE SHOOTER', instruction: 'Curl across the slot to the left wing.', carrier: { x: 6, z: -5 }, support: [{ x: -6, z: -9 }, { x: 7, z: -12 }], defense: [{ x: 0, z: -9 }, { x: 4, z: -12 }] },
    { title: 'BEND IT LATE', instruction: 'Loop outside the screen, then cut back inside the post.', carrier: { x: -6, z: -9 }, support: [{ x: 6, z: -10 }, { x: 7, z: -6 }], defense: [{ x: -3, z: -13 }, { x: 2, z: -12 }] },
  ] },
  { title: 'THE ENCORE', moments: [
    { title: 'OFF THE WALL', instruction: 'Bank right. Start your final highlight with a bounce.', carrier: { x: -4, z: 10 }, support: [{ x: 6, z: -5 }, { x: -7, z: -6 }], defense: [{ x: -3, z: -1 }, { x: -7, z: 5 }] },
    { title: 'CHASE THE SPACE', instruction: 'Lead the left wing deeper into the zone.', carrier: { x: 6, z: 2 }, support: [{ x: -6, z: -5 }, { x: 7, z: -10 }], defense: [{ x: -8, z: 4 }, { x: 8, z: 5 }] },
    { title: 'THE FINAL FEED', instruction: 'Cross-ice to the right wing. One last touch.', carrier: { x: -6, z: -9 }, support: [{ x: 6, z: -11 }, { x: -8, z: -3 }], defense: [{ x: -7, z: 2 }, { x: 7, z: 2 }] },
    { title: 'TAKE A BOW', instruction: 'Light up Fire Puck. Send the crowd home happy.', carrier: { x: 6, z: -11 }, support: [{ x: -6, z: -8 }, { x: -8, z: -3 }], defense: [{ x: -7, z: 2 }, { x: 7, z: 2 }], powerup: 'fire' },
  ] },
];

export const CHAPTERS = ['FIRST TRACKS', 'HEAT CHECK', 'PLAYMAKERS', 'HIGHLIGHT REEL'];
export const HIGHLIGHTS = [
  'Break out. Bend it. Bury it.', 'A hook pass with bad intentions.', 'Across the ice. Off the blade.', 'Two closed lanes. Find a third.',
  'The second chance is the best chance.', 'Open ice. A puck on fire.', 'A finish that bends the rules.', 'Freeze the lane. Heat up the net.',
  'A pass through the smallest window.', 'Four touches. Lights out.', 'Put it where they’re going.', 'The boards get the assist.',
  'Two wings. One very confused goalie.', 'A pad save is just the beginning.', 'Make your own shooting lane.', 'Bank. Chase. Cross. Bury.',
];
const OBJECTIVES: readonly (readonly Objective[])[] = [
  ['goal', 'passes', 'top'], ['goal', 'curve', 'top'], ['goal', 'passes', 'top'],
  ['goal', 'curve', 'passes'], ['goal', 'rebound', 'top'], ['goal', 'fire', 'top'],
  ['goal', 'curve', 'top'], ['goal', 'freeze', 'top'], ['goal', 'passes', 'top'], ['goal', 'fire', 'freeze'],
  ['goal', 'lead', 'top'], ['goal', 'bank', 'passes'], ['goal', 'curve', 'passes'],
  ['goal', 'rebound', 'top'], ['goal', 'curve', 'top'], ['goal', 'bank', 'lead'],
];
export const OBJECTIVE_LABELS: Record<Objective, string> = {
  goal: 'Score a goal', top: 'Go top shelf', curve: 'Land a curved play',
  passes: 'Make every setup pass', rebound: 'Bury a rebound', fire: 'Score with Fire Puck', freeze: 'Make a frozen play',
  bank: 'Complete a bank pass', lead: 'Lead a skater into space',
};


export const LEVELS: readonly AuthoredLevel[] = RAW_LEVELS.map((level, index) => ({
  ...level,
  id: `level-${String(index + 1).padStart(2, '0')}`,
  objectives: OBJECTIVES[index],
}));
assertValidLevels(LEVELS);
export { MOMENTS, OBJECTIVES };
