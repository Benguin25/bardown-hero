import type { AuthoredLevel, AuthoredMoment, Objective, Point, Powerup } from './types';

const p = (x: number, z: number): Point => ({ x, z });
const m = (title: string, instruction: string, carrier: Point, support: readonly [Point, Point], defense: readonly [Point, Point], powerup?: Powerup): AuthoredMoment => ({ title, instruction, carrier, support, defense, ...(powerup ? { powerup } : {}) });
const level = (number: number, title: string, objectives: readonly [Objective, Objective, Objective], moments: readonly AuthoredMoment[]): AuthoredLevel => ({ id: `level-${number}`, title, objectives, moments });

/** Levels 17–32 are append-only: version-1 saves address the original campaign by index. */
export const EXTRA_LEVELS: readonly AuthoredLevel[] = [
  level(17, 'GIVE & GO', ['goal', 'passes', 'top'], [
    m('DROP IT WIDE', 'Feed the right wing, then jump through the middle.', p(-5, 6), [p(6, 0), p(-7, -8)], [p(-1, 1), p(5, -7)]),
    m('GET IT BACK', 'Return it through the seam to the cutter.', p(6, 0), [p(-1, -9), p(-7, -7)], [p(3, -5), p(-6, -2)]),
    m('QUICK HANDS', 'The give-and-go worked. Finish upstairs.', p(-1, -9), [p(7, -8), p(-7, -11)], [p(5, -3), p(-6, -4)]),
  ]),
  level(18, 'LOW TO HIGH', ['goal', 'lead', 'passes'], [
    m('SEND IT DEEP', 'Lead the left wing down the wall, safely in front of the goal line.', p(5, 3), [p(-7, -12), p(7, -7)], [p(-3, -5), p(4, -9)]),
    m('CYCLE IT HIGH', 'Curl the puck up the wall to the trailing skater.', p(-7, -12), [p(-1, -7), p(7, -10)], [p(-4, -9), p(2, -11)]),
    m('BACK-DOOR SNAP', 'Switch sides above the crease and catch the goalie moving.', p(-1, -7), [p(7, -12), p(-7, -10)], [p(-3, -10), p(3, -8)]),
    m('CLOSE THE CYCLE', 'Finish the wall cycle upstairs.', p(7, -12), [p(-1, -8), p(-7, -10)], [p(-3, -8), p(2, -10)]),
  ]),
  level(19, 'CAROM CANNON', ['goal', 'bank', 'top'], [
    m('MISS ON PURPOSE', 'Carom it hard off the right-side boards to the weak-side shooter.', p(-6, -7), [p(6, -12), p(0, -5)], [p(-8, 0), p(8, 0)]),
    m('OFF THE WALL', 'Charge Fire Puck and one-time the carom upstairs.', p(6, -12), [p(-6, -11), p(0, -6)], [p(-7, -5), p(7, -5)], 'fire'),
  ]),
  level(20, 'WIDE OPEN', ['goal', 'lead', 'curve'], [
    m('SAUCER TO SPACE', 'Lead the far wing across the ice, beyond the defender.', p(-7, 4), [p(6, -3), p(-5, -9)], [p(0, 0), p(-3, -5)]),
    m('SKATE ONTO IT', 'Collected in stride. Bend the shot around the screen.', p(7, -8), [p(-6, -9), p(0, -5)], [p(2, -12), p(-2, -10)]),
  ]),
  level(21, 'PINBALL', ['goal', 'bank', 'passes'], [
    m('FIRST RAIL', 'Bank right to escape the forechecker.', p(-5, 8), [p(6, 0), p(-7, -5)], [p(-2, 2), p(-6, 3)]),
    m('SECOND RAIL', 'Use the left boards now. Make them chase twice.', p(6, 1), [p(-6, -7), p(7, -9)], [p(2, -4), p(7, -3)]),
    m('PINBALL PAYOFF', 'Two banks opened the middle. Finish the play.', p(-6, -8), [p(6, -10), p(0, -5)], [p(-4, -3), p(4, -4)]),
  ]),
  level(22, 'FROZEN ROPE', ['goal', 'freeze', 'passes'], [
    m('STOP THE CLOCK', 'Freeze the collapsing box and bend a pass to the slot.', p(-7, 2), [p(0, -9), p(7, -7)], [p(-2, -3), p(2, -5)], 'freeze'),
    m('ROPE IT ACROSS', 'Move it cross-ice before the defense resets.', p(0, -9), [p(7, -11), p(-7, -9)], [p(-4, -4), p(4, -5)]),
    m('NO DUST', 'Charge Fire Puck and one-touch the high corner.', p(7, -11), [p(0, -9), p(-7, -9)], [p(-4, -4), p(3, -7)], 'fire'),
  ]),
  level(23, 'CHAOS IN BLUE', ['goal', 'rebound', 'top'], [
    m('START THE SCRAMBLE', 'Feed the middle and shoot low for a rebound.', p(-7, -4), [p(0, -10), p(7, -9)], [p(-5, -11), p(5, -5)]),
    m('MAKE THE SAVE', 'Hit the pads. Stay with the first rebound.', p(0, -10), [p(6, -12), p(-7, -10)], [p(-6, -13), p(5, -5)]),
  ]),
  level(24, 'THE IMPOSSIBLE ARC', ['goal', 'curve', 'top'], [
    m('USE THE SCREEN', 'Find the left shooter while the defenders collapse from high ice.', p(7, 0), [p(-7, -10), p(6, -9)], [p(-8, 5), p(8, 5)]),
    m('BEND THE BUILDING', 'Charge Mega Curve. Loop outside the defender screen and into the slot.', p(-7, -10), [p(0, -13), p(7, -9)], [p(4, -12), p(7, -8)], 'curve'),
    m('ARC TO ROCKET', 'The ridiculous bend found the blade. Fire it upstairs.', p(0, -13), [p(-7, -10), p(7, -9)], [p(5, -8), p(-5, -7)], 'fire'),
  ]),
  level(25, 'SAFETY OFF', ['goal', 'curve', 'passes'], [
    m('CHOOSE YOUR STORY', 'Safe pass left, or curve the highlight feed through traffic right.', p(0, 7), [p(-7, -2), p(7, -6)], [p(2, 1), p(5, -3)]),
    m('TURN THE CORNER', 'Move it to the back-door wing.', p(7, -6), [p(-6, -11), p(0, -8)], [p(2, -9), p(-4, -5)]),
    m('HIGH-RISK REWARD', 'Finish the ambitious route in one touch.', p(-6, -11), [p(7, -9), p(0, -7)], [p(4, -5), p(-2, -8)]),
  ]),
  level(26, 'BANK TO THE FUTURE', ['goal', 'bank', 'lead'], [
    m('BOARDS FIRST', 'Bank around the near defender to the right wing.', p(-6, 6), [p(6, -2), p(-7, -7)], [p(-2, 1), p(-6, -1)]),
    m('SEND THEM AHEAD', 'Turn the bank into a lead pass down the left lane.', p(6, 0), [p(-6, -7), p(7, -9)], [p(1, -5), p(7, -4)]),
    m('BACK ACROSS', 'Cross the seam to the waiting one-timer.', p(-7, -10), [p(6, -12), p(0, -7)], [p(-2, -5), p(3, -8)]),
    m('FROM THE FUTURE', 'Charge Fire Puck. One touch. High corner.', p(6, -12), [p(-7, -10), p(0, -7)], [p(-3, -6), p(2, -9)], 'fire'),
  ]),
  level(27, 'RACE THE RED', ['goal', 'lead', 'top'], [
    m('CHIP AND CHASE', 'Put the puck into open ice and win the loose-puck race.', p(-5, 5), [p(5, -1), p(-7, -7)], [p(1, 2), p(7, 4)]),
    m('BEAT THE SECOND MAN', 'Lead the other wing beyond the recovering defender.', p(5, -5), [p(-6, -10), p(7, -9)], [p(1, -1), p(7, 0)]),
    m('WIN BY A BLADE', 'You won both races. Charge Fire Puck and snap it high.', p(-6, -11), [p(6, -9), p(0, -6)], [p(4, -4), p(-1, -7)], 'fire'),
  ]),
  level(28, 'THREE ON TWO', ['goal', 'passes', 'top'], [
    m('ENTER WITH NUMBERS', 'Carry the threat and dish to either wide lane.', p(0, 9), [p(-7, 1), p(7, 1)], [p(-2.5, -2), p(2.5, -2)]),
    m('MAKE THEM TURN', 'Switch wings behind the two defenders.', p(-7, -3), [p(7, -8), p(0, -6)], [p(-3, -5), p(3, -5)]),
    m('MIDDLE LANE DRIVE', 'Hit the trailer arriving between them.', p(7, -8), [p(0, -12), p(-7, -10)], [p(-3, -7), p(3, -7)]),
    m('NUMBERS WIN', 'The 3-on-2 is solved. Fire Puck upstairs.', p(0, -12), [p(7, -10), p(-7, -10)], [p(-4, -8), p(4, -8)], 'fire'),
  ]),
  level(29, 'ICEBREAKER', ['goal', 'freeze', 'bank'], [
    m('LOCK THE WALL', 'Freeze the defenders and bank down the wall to the waiting wing.', p(-6, 7), [p(6, -8), p(-7, -6)], [p(-2, 1), p(-6, 0)], 'freeze'),
    m('CROSS THE CRACK', 'Curve across to the far wing through the frozen seam.', p(6, 1), [p(-6, -8), p(7, -9)], [p(-1, -4), p(4, -5)]),
    m('BREAK THE ICE', 'Charge Fire Puck and go bar down before everyone thaws.', p(-6, -9), [p(6, -10), p(0, -6)], [p(-2, -5), p(3, -8)], 'fire'),
  ]),
  level(30, 'REDIRECT EXPRESS', ['goal', 'lead', 'passes'], [
    m('TICKET ACROSS', 'Lead the right wing into the far circle.', p(-7, 3), [p(6, -5), p(-5, -8)], [p(0, -1), p(-3, -5)]),
    m('SEND IT BACK', 'Fire a cross-ice feed for the left-side redirect.', p(7, -8), [p(-6, -12), p(0, -7)], [p(2, -11), p(-1, -7)]),
    m('EXPRESS FINISH', 'No settling. Fire the redirect into the high corner.', p(-6, -12), [p(7, -10), p(0, -7)], [p(3, -7), p(-2, -9)], 'fire'),
  ]),
  level(31, 'AFTERBURNER', ['goal', 'fire', 'curve'], [
    m('DRAW THE CROWD', 'Curve the puck behind the screen to the slot.', p(-7, 1), [p(0, -9), p(7, -7)], [p(-3, -4), p(1, -6)]),
    m('KICK IT WIDE', 'Move the puck right and force the goalie across.', p(0, -9), [p(7, -12), p(-7, -10)], [p(-4, -6), p(3, -8)]),
    m('AFTERBURNER ON', 'Charge Fire Puck and hammer the opening upstairs.', p(7, -12), [p(0, -9), p(-7, -10)], [p(-4, -6), p(2, -9)], 'fire'),
  ]),
  level(32, 'IMMORTAL HIGHLIGHT', ['goal', 'fire', 'freeze'], [
    m('WIN THE WALL', 'Freeze the forecheck and bank the breakout right.', p(-6, 9), [p(6, 2), p(-7, -5)], [p(-2, 3), p(-6, 2)], 'freeze'),
    m('LEAD THE HERO', 'Send the left wing into open ice behind coverage.', p(6, 2), [p(-6, -6), p(7, -9)], [p(0, -3), p(7, -3)]),
    m('THE RETURN PASS', 'Give it back across the slot to the right wing.', p(-7, -9), [p(6, -11), p(0, -7)], [p(-2, -5), p(3, -7)]),
    m('BEND HISTORY', 'Mega Curve around the final screen and into the slot.', p(6, -11), [p(0, -13), p(-7, -10)], [p(2, -13), p(-2, -9)], 'curve'),
    m('LIGHTS FOREVER', 'Fire Puck. High corner. Make the last highlight immortal.', p(0, -13), [p(7, -11), p(-7, -10)], [p(4, -8), p(-4, -8)], 'fire'),
  ]),
];

export const EXTRA_HIGHLIGHTS = [
  'Give. Go. Get it back. Finish.', 'Down the wall, back high, then across.', 'A side-board carom serves the one-timer.', 'Put it where only speed can find it.',
  'One rink. Two rails. Three touches.', 'Freeze the box, then pull it apart.', 'The rebound has a rebound.', 'A screen big enough for an impossible bend.',
  'Take the safe lane—or chase the reel.', 'Bank it, lead it, send it back.', 'Loose puck. Two races. No passengers.', 'A late 3-on-2 with every lane alive.',
  'Freeze, bank, cross, bar down.', 'Cross-ice speed becomes a one-touch finish.', 'A screen, a switch, and pure fire.', 'Five decisions. Every trick. One final roar.',
] as const;
