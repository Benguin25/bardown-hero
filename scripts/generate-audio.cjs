/*
 * Original procedural arcade-hockey effects. Uses only Node built-ins and
 * writes small 16-bit PCM mono WAVs, so the asset set is reproducible offline.
 */
const fs = require('fs');
const path = require('path');

const SR = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'audio');
fs.mkdirSync(OUT, { recursive: true });

let seed = 0x51a3c9e7;
function rand() { // deterministic xorshift noise
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return ((seed >>> 0) / 0x100000000) * 2 - 1;
}
function make(seconds, sampleRate = SR) {
  const buf = new Float64Array(Math.ceil(seconds * sampleRate));
  buf.sampleRate = sampleRate;
  return buf;
}
function add(buf, at, seconds, fn) {
  const sampleRate = buf.sampleRate || SR;
  const start = Math.max(0, Math.floor(at * sampleRate));
  const count = Math.min(buf.length - start, Math.ceil(seconds * sampleRate));
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    buf[start + i] += fn(t, i, count);
  }
}
const exp = (t, rate) => Math.exp(-t * rate);
const sine = (freq, t) => Math.sin(Math.PI * 2 * freq * t);
const tri = (freq, t) => 2 * Math.asin(Math.sin(Math.PI * 2 * freq * t)) / Math.PI;
const softSaw = (freq, t) => Math.atan(2.2 * Math.tan(Math.PI * freq * t)) / 1.15;
function impact(buf, at, seconds, options = {}) {
  const { noise = .3, low = 125, tone = .25, decay = 15 } = options;
  add(buf, at, seconds, (t) => {
    const n = rand() * noise * exp(t, decay * 1.65);
    const body = sine(low * (1 - t * .16), t) * tone * exp(t, decay);
    const click = sine(1400, t) * noise * .28 * exp(t, 95);
    return n + body + click;
  });
}
function write(name, duration, render, sampleRate = SR) {
  seed = 0x51a3c9e7 ^ name.split('').reduce((n, c) => ((n * 33) ^ c.charCodeAt(0)) >>> 0, 5381);
  const buf = make(duration, sampleRate);
  render(buf);
  let peak = 0;
  for (const x of buf) peak = Math.max(peak, Math.abs(x));
  const gain = peak ? 0.84 / peak : 1;
  const fade = Math.min(Math.round(sampleRate * .008), Math.floor(buf.length / 2));
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    const edge = i < fade ? i / fade : (i >= buf.length - fade ? (buf.length - 1 - i) / fade : 1);
    const sample = Math.max(-1, Math.min(1, buf[i] * gain * edge));
    data.writeInt16LE(Math.round(sample * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([header, data]));
  return { name, duration: (buf.length / sampleRate).toFixed(3), peak: (peak * gain).toFixed(3), bytes: 44 + data.length };
}

function synthNote(buf, at, seconds, freq, amount, flavor = 'synth') {
  add(buf, at, seconds, t => {
    const attack = 1 - Math.exp(-t * 35);
    const release = Math.min(1, Math.max(0, (seconds - t) * 12));
    const wave = flavor === 'bass' ? sine(freq, t) + softSaw(freq, t) * .22 : softSaw(freq, t) * .66 + sine(freq * 2, t) * .18;
    return wave * amount * attack * release;
  });
}
function kick(buf, at) { add(buf, at, .28, t => sine(125 * Math.exp(-t * 13) + 43, t) * .38 * exp(t, 14) + rand() * .055 * exp(t, 70)); }
function snare(buf, at) { add(buf, at, .20, t => rand() * .18 * exp(t, 22) + sine(185, t) * .11 * exp(t, 19)); }
function hat(buf, at, open = false) { add(buf, at, open ? .24 : .07, t => rand() * (open ? .065 : .042) * exp(t, open ? 16 : 52)); }

const report = [
  write('tap.wav', .105, b => { impact(b, 0, .105, { noise: .18, low: 180, tone: .17, decay: 38 }); }),
  write('release.wav', .270, b => { impact(b, 0, .23, { noise: .46, low: 108, tone: .31, decay: 13 }); add(b, .012, .10, t => sine(265, t) * .13 * exp(t, 32)); }),
  write('snapshot.wav', .220, b => { impact(b, 0, .19, { noise: .30, low: 155, tone: .29, decay: 24 }); add(b, .008, .13, t => sine(510 - t * 420, t) * .12 * exp(t, 29)); }),
  write('one-timer.wav', .340, b => { impact(b, 0, .28, { noise: .48, low: 82, tone: .40, decay: 12 }); impact(b, .018, .18, { noise: .18, low: 240, tone: .16, decay: 25 }); }),
  write('curve-shot.wav', .390, b => { impact(b, 0, .20, { noise: .30, low: 120, tone: .25, decay: 18 }); add(b, .025, .33, t => (sine(280 + t * 760, t) * .10 + rand() * .055) * exp(t, 6)); }),
  write('screen-shot.wav', .310, b => { impact(b, 0, .28, { noise: .24, low: 68, tone: .43, decay: 10 }); add(b, .03, .22, t => sine(105, t) * .14 * exp(t, 12)); }),
  write('rebound-shot.wav', .290, b => { impact(b, 0, .12, { noise: .50, low: 205, tone: .20, decay: 28 }); impact(b, .045, .23, { noise: .34, low: 88, tone: .39, decay: 13 }); }),
  write('pass.wav', .150, b => { impact(b, 0, .14, { noise: .22, low: 235, tone: .18, decay: 31 }); }),
  write('bank.wav', .245, b => { impact(b, 0, .23, { noise: .36, low: 92, tone: .32, decay: 14 }); add(b, .014, .13, t => sine(178, t) * .12 * exp(t, 20)); }),
  write('save.wav', .315, b => { impact(b, 0, .29, { noise: .22, low: 76, tone: .38, decay: 11 }); add(b, .025, .20, t => sine(126, t) * .13 * exp(t, 13)); }),
  write('goal.wav', 1.720, b => {
    // A brass-like chord, softened with a breathy attack, then a tiny crowd tail.
    [220, 277.18, 329.63].forEach((f, j) => add(b, .025, 1.12, t => softSaw(f, t) * (.18 - j * .018) * (1 - exp(t, 28)) * exp(t, 1.75)));
    add(b, .025, 1.05, t => rand() * .045 * (1 - exp(t, 35)) * exp(t, 3.2));
    add(b, .72, .88, t => (rand() * .09 + tri(510 + 90 * Math.sin(t * 18), t) * .035) * (1 - exp(t, 16)) * exp(t, 2.7));
    impact(b, 0, .12, { noise: .18, low: 115, tone: .18, decay: 32 });
  }),
  write('fail.wav', .590, b => { add(b, 0, .55, t => sine(340 - t * 330, t) * .29 * (1 - exp(t, 20)) * exp(t, 4.4) + sine(170 - t * 115, t) * .12 * exp(t, 5)); }),
  write('powerup.wav', .800, b => { add(b, 0, .76, t => (sine(180 + t * 780, t) * .16 + sine(360 + t * 1100, t) * .07 + rand() * .035) * (1 - exp(t, 6)) * Math.exp(Math.max(0, t - .60) * -10)); }),
  write('countdown.wav', .180, b => { impact(b, 0, .16, { noise: .13, low: 420, tone: .23, decay: 38 }); add(b, 0, .1, t => sine(760, t) * .10 * exp(t, 38)); }),
  write('start.wav', .360, b => { add(b, 0, .33, t => (sine(310 + t * 600, t) * .22 + sine(620 + t * 860, t) * .09) * (1 - exp(t, 35)) * exp(t, 8)); impact(b, 0, .12, { noise: .12, low: 155, tone: .12, decay: 30 }); }),
  write('music.wav', 16, b => {
    // Eight 120 BPM bars: a continuous club-sports groove with no intro/outro.
    const beat = .5;
    const roots = [55, 55, 61.74, 61.74, 65.41, 65.41, 73.42, 73.42];
    const hook = [659.25, 783.99, 880, 783.99, 659.25, 587.33, 659.25, 987.77];
    for (let bar = 0; bar < 8; bar++) {
      const at = bar * 2;
      const root = roots[bar];
      for (let q = 0; q < 4; q++) kick(b, at + q * beat);
      snare(b, at + beat); snare(b, at + beat * 3);
      for (let e = 0; e < 8; e++) hat(b, at + e * .25, e === 7);
      [0, .5, 1, 1.5].forEach((offset, i) => synthNote(b, at + offset, .39, root * (i === 2 ? 2 : 1), .105, 'bass'));
      synthNote(b, at, 1.96, root * 2, .048);
      synthNote(b, at, 1.96, root * 3.005, .037);
      for (let n = 0; n < 4; n++) synthNote(b, at + n * beat, .34, hook[(bar + n * 2) % hook.length], .062);
    }
  }, 32000),
];
console.table(report);
console.log(`Total: ${report.reduce((sum, f) => sum + f.bytes, 0)} bytes`);
