# Bardown Hero sound effects

These effects are original procedural sounds generated for this project. They contain no recordings, samples, or borrowed musical material. The generator layers deterministic noise, shaped transients, and simple synthesized body/brass tones into mono 22.05 kHz, 16-bit PCM WAV files.

| File | Duration | Intended use |
| --- | ---: | --- |
| `tap.wav` | 0.105 s | UI puck tap |
| `release.wav` | 0.270 s | Stick slap on shot release |
| `snapshot.wav` | 0.220 s | Short, sharp snapshot release |
| `one-timer.wav` | 0.340 s | Heavy catch-and-release impact |
| `curve-shot.wav` | 0.390 s | Rising curved-shot whoosh |
| `screen-shot.wav` | 0.310 s | Low, dense shot through traffic |
| `rebound-shot.wav` | 0.290 s | Scramble chop and follow-up impact |
| `pass.wav` | 0.150 s | Puck collection / stick tick |
| `bank.wav` | 0.245 s | Board impact thud |
| `save.wav` | 0.315 s | Padded goalie save |
| `goal.wav` | 1.720 s | Layered stadium horn with celebratory tail |
| `fail.wav` | 0.590 s | Descending miss cue |
| `powerup.wav` | 0.800 s | Rising charge swell |
| `countdown.wav` | 0.180 s | Countdown tick |
| `start.wav` | 0.360 s | Start/go accent |
| `music.wav` | 16.000 s | Seamless eight-bar upbeat stadium-electronic instrumental loop |

Regenerate all effects with Node 18+:

```sh
node scripts/generate-audio.cjs
```

The generator normalizes each file to 0.84 peak headroom. Effects use short edge fades to prevent clicks; the music loop uses a repeating 120 BPM eight-bar arrangement with matched zero-level boundaries for a clean wrap. Effects are 22.05 kHz; `music.wav` is 32 kHz, all mono PCM16.
