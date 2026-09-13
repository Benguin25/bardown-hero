export type SoundCue = 'tap' | 'release' | 'pass' | 'bank' | 'save' | 'goal' | 'fail' | 'powerup' | 'countdown' | 'start';

export type AudioEvent = { id: number; event: string };

const CUES: Record<string, SoundCue | undefined> = {
  release: 'release', pass: 'pass', bank: 'bank', save: 'save', goal: 'goal', fail: 'fail',
  powerup: 'powerup', countdown: 'countdown', start: 'start',
};

// A game update can emit more than one event (a second save becomes a fail).
// Read the bounded history, rather than the old single latest-event field.
export function drainSoundEvents(events: readonly AudioEvent[], afterId: number) {
  const cues: SoundCue[] = [];
  let lastId = afterId;
  for (const entry of events) {
    if (entry.id <= afterId) continue;
    lastId = Math.max(lastId, entry.id);
    const cue = CUES[entry.event];
    if (cue) cues.push(cue);
  }
  return { cues, lastId };
}
