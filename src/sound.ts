import {
  clearPreloadedSource,
  createAudioPlayer,
  preload,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';

export type SoundCue = 'tap' | 'release' | 'snapshot' | 'oneTimer' | 'curveShot' | 'screenShot' | 'reboundShot' | 'pass' | 'bank' | 'save' | 'goal' | 'fail' | 'powerup' | 'countdown' | 'start';
export type SoundScene = 'menu' | 'aim' | 'play' | 'result';

type SoundDefinition = { source: AudioSource; volume: number; pool: number };

const sounds: Record<SoundCue, SoundDefinition> = {
  tap: { source: require('../assets/audio/tap.wav'), volume: 0.32, pool: 2 },
  release: { source: require('../assets/audio/release.wav'), volume: 0.78, pool: 3 },
  snapshot: { source: require('../assets/audio/snapshot.wav'), volume: 0.88, pool: 2 },
  oneTimer: { source: require('../assets/audio/one-timer.wav'), volume: 0.94, pool: 2 },
  curveShot: { source: require('../assets/audio/curve-shot.wav'), volume: 0.88, pool: 2 },
  screenShot: { source: require('../assets/audio/screen-shot.wav'), volume: 0.90, pool: 2 },
  reboundShot: { source: require('../assets/audio/rebound-shot.wav'), volume: 0.96, pool: 2 },
  pass: { source: require('../assets/audio/pass.wav'), volume: 0.56, pool: 3 },
  bank: { source: require('../assets/audio/bank.wav'), volume: 0.66, pool: 2 },
  save: { source: require('../assets/audio/save.wav'), volume: 0.76, pool: 2 },
  goal: { source: require('../assets/audio/goal.wav'), volume: 0.92, pool: 1 },
  fail: { source: require('../assets/audio/fail.wav'), volume: 0.60, pool: 1 },
  powerup: { source: require('../assets/audio/powerup.wav'), volume: 0.65, pool: 2 },
  countdown: { source: require('../assets/audio/countdown.wav'), volume: 0.42, pool: 1 },
  start: { source: require('../assets/audio/start.wav'), volume: 0.58, pool: 1 },
};

const music: AudioSource = require('../assets/audio/music.wav');
// Music remains continuous across scenes. Aim is slightly calmer; gameplay is
// full enough to be present on phone speakers without masking puck impacts.
const sceneVolumes: Record<SoundScene, number> = { menu: 0.38, aim: 0.30, play: 0.36, result: 0.34 };
const maxQueuedCues = 12;

/**
 * An intentionally small app-lifetime controller for local game audio.
 * It has no React state so simulation and UI can safely share it.
 */
export class SoundController {
  private enabled = false;
  private active = false;
  private scene: SoundScene = 'menu';
  private initialized = false;
  private disposed = false;
  private initPromise: Promise<void> | null = null;
  private lifecycleToken = 0;
  private players = new Map<SoundCue, AudioPlayer[]>();
  private nextPlayer = new Map<SoundCue, number>();
  private musicPlayer: AudioPlayer | null = null;
  private queuedCues: SoundCue[] = [];
  private audioStateQueue = Promise.resolve();
  private duckToken = 0;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;

  init({ playsInSilentMode }: { playsInSilentMode: boolean }): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.disposed = false;
    const lifecycleToken = this.lifecycleToken;
    this.initPromise = (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
        // Local assets are preloaded before their players are allocated, so the first swipe has no fetch.
        await Promise.allSettled([...Object.values(sounds).map(({ source }) => preload(source)), preload(music)]);
        if (this.disposed || lifecycleToken !== this.lifecycleToken) return;
        for (const [cue, definition] of Object.entries(sounds) as [SoundCue, SoundDefinition][]) {
          const pool = Array.from({ length: definition.pool }, () => {
            const player = createAudioPlayer(definition.source, { downloadFirst: true });
            player.volume = definition.volume;
            return player;
          });
          this.players.set(cue, pool);
          this.nextPlayer.set(cue, 0);
        }
        this.musicPlayer = createAudioPlayer(music, { downloadFirst: true });
        this.musicPlayer.loop = true;
        this.initialized = true;
        this.flushQueuedCues();
        this.syncMusic();
      } catch {
        // Audio is enhancement only. A broken session or asset must never break the game.
      }
    })();
    return this.initPromise;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.duckToken++;
    if (!enabled) this.stopAll();
    this.syncNativeActive();
    this.syncMusic();
  }

  setActive(active: boolean): void {
    this.active = active;
    this.duckToken++;
    if (!active) this.stopAll();
    this.syncNativeActive();
    this.syncMusic();
  }

  setScene(scene: SoundScene): void {
    this.scene = scene;
    this.duckToken++;
    this.syncMusic();
  }

  play(cue: SoundCue): void {
    if (this.disposed || !this.enabled || !this.active) return;
    if (!this.initialized) {
      if (this.initPromise && this.queuedCues.length < maxQueuedCues) this.queuedCues.push(cue);
      return;
    }
    this.playNow(cue);
  }

  dispose(): void {
    this.disposed = true;
    this.initialized = false;
    this.lifecycleToken++;
    this.queuedCues = [];
    this.duckToken++;
    if (this.duckTimer) clearTimeout(this.duckTimer);
    this.duckTimer = null;
    this.stopAll();
    for (const pool of this.players.values()) for (const player of pool) this.safely(() => player.remove());
    this.players.clear();
    this.nextPlayer.clear();
    if (this.musicPlayer) this.safely(() => this.musicPlayer?.remove());
    this.musicPlayer = null;
    for (const { source } of Object.values(sounds)) void clearPreloadedSource(source).catch(() => {});
    void clearPreloadedSource(music).catch(() => {});
    this.syncNativeActive();
  }

  private flushQueuedCues(): void {
    const pending = this.queuedCues;
    this.queuedCues = [];
    if (!this.enabled || !this.active || this.disposed) return;
    pending.forEach(cue => this.playNow(cue));
  }

  private playNow(cue: SoundCue): void {
    const pool = this.players.get(cue);
    if (!pool?.length) return;
    const next = this.nextPlayer.get(cue) ?? 0;
    const idle = pool.findIndex(player => !player.playing);
    const index = idle >= 0 ? idle : next % pool.length;
    this.nextPlayer.set(cue, (index + 1) % pool.length);
    const player = pool[index];
    // Seeking is asynchronous on native platforms. Starting immediately follows Expo's replay recipe
    // and prevents the bridge promise from delaying a hockey impact.
    void player.seekTo(0).catch(() => {});
    this.safely(() => player.play());
    if (cue === 'goal') this.duckMusic();
  }

  private duckMusic(): void {
    const player = this.musicPlayer;
    if (!player || !this.enabled || !this.active) return;
    const token = ++this.duckToken;
    this.safely(() => { player.volume = 0.12; });
    if (this.duckTimer) clearTimeout(this.duckTimer);
    this.duckTimer = setTimeout(() => {
      if (token === this.duckToken && !this.disposed) this.syncMusic();
    }, 1150);
  }

  private syncMusic(): void {
    const player = this.musicPlayer;
    if (!player) return;
    if (!this.enabled || !this.active || this.disposed) {
      this.safely(() => player.pause());
      return;
    }
    this.safely(() => { player.volume = sceneVolumes[this.scene]; player.play(); });
  }

  private stopAll(): void {
    for (const pool of this.players.values()) for (const player of pool) this.safely(() => player.pause());
    if (this.musicPlayer) this.safely(() => this.musicPlayer?.pause());
  }

  private syncNativeActive(): void {
    const desired = this.enabled && this.active && !this.disposed;
    // Serialize native transitions: a delayed background request cannot re-enable the session.
    this.audioStateQueue = this.audioStateQueue.then(() => setIsAudioActiveAsync(desired)).catch(() => {});
  }

  private safely(action: () => void): void { try { action(); } catch {} }
}

export const audio = new SoundController();
