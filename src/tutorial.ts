import { Game } from './game';

export const LESSONS = [
  { title: 'DRAW A PASS', hint: 'Drag anywhere. Your line starts at the puck. Draw to the right teal player, then lift to pass.', success: 'Pass collected! Play pauses as soon as your teammate gets it.' },
  { title: 'BEND AROUND RED', hint: 'Draw a wide curve around the red defender to the right teammate. Keep the whole line away from red.', success: 'Nice curve. Your puck follows the shape you draw.' },
  { title: 'WIN THE RACE', hint: 'Draw a short pass into empty ice halfway to the right teammate. Lift and watch both teams chase. Collect the loose puck to continue.', success: 'Won the race! Loose pucks stay live until someone gets them.' },
  { title: 'PICK A CORNER', hint: 'Draw into a gold corner inside the red posts. Red corners are covered. Try a late bend to beat the goalie.', success: 'You are ready. Tap yellow powerup buttons before drawing when available. Use boards to bank around defenders.' },
];

export function tutorialGame(lesson: number) {
  const g = new Game();
  g.phase = 'PAUSED_FOR_INPUT';
  g.attackers = lesson === 3
    ? [{ x: 0, z: -10 }, { x: 7, z: -6 }, { x: -7, z: -6 }]
    : [{ x: -4, z: 8 }, { x: 5, z: 1 }, { x: -8, z: 8 }];
  g.puck = { ...g.attackers[0] };
  g.defenders = lesson === 1 ? [{ x: 0, z: 4 }, { x: -8, z: -12 }]
    : lesson === 2 ? [{ x: -3, z: -6 }, { x: -8, z: -12 }]
    : [{ x: -8, z: -12 }, { x: 8, z: -13 }];
  g.message = LESSONS[lesson].hint;
  return g;
}

export function lessonComplete(g: Game, lesson: number, chased: boolean) {
  return lesson === 3 ? g.phase === 'SUCCESS'
    : g.paused && g.passes > 0 && (lesson !== 1 || g.curvedActions > 0) && (lesson !== 2 || chased);
}
