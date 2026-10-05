// Writes the waveform peaks for a recording, for components/ui/call-recording.tsx.
//
//   node scripts/audio-peaks.mjs public/audio/sample-call.wav
//
// Reads a 16-bit PCM .wav and writes <name>.peaks.json next to it: 120 values
// between 0 and 1, the loudest sample in each slice of the call. Run it again
// whenever the recording is replaced. (The player takes the peaks as data so the
// page never has to download and decode the whole file just to draw bars.)

import fs from 'node:fs';

const BARS = 120;
const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/audio-peaks.mjs <recording.wav>');
  process.exit(1);
}

const wav = fs.readFileSync(input);
if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') {
  console.error('Not a .wav file. Convert it to 16-bit PCM WAV first.');
  process.exit(1);
}

// Walk the chunks rather than assuming a 44-byte header.
let channels = 1;
let bits = 16;
let format = 1;
let rate = 22050;
let data = null;
for (let p = 12; p + 8 <= wav.length; ) {
  const id = wav.toString('ascii', p, p + 4);
  const size = wav.readUInt32LE(p + 4);
  if (id === 'fmt ') {
    format = wav.readUInt16LE(p + 8);
    channels = wav.readUInt16LE(p + 10);
    rate = wav.readUInt32LE(p + 12);
    bits = wav.readUInt16LE(p + 22);
  } else if (id === 'data') {
    data = wav.subarray(p + 8, Math.min(p + 8 + size, wav.length));
    break;
  }
  p += 8 + size + (size % 2);
}
if (!data || format !== 1 || bits !== 16) {
  console.error('Only 16-bit PCM .wav files are supported.');
  process.exit(1);
}

const frames = Math.floor(data.length / (2 * channels));
const slice = Math.max(1, Math.floor(frames / BARS));
const peaks = Array.from({ length: BARS }, (_, i) => {
  let max = 0;
  for (let f = i * slice; f < Math.min((i + 1) * slice, frames); f++) {
    max = Math.max(max, Math.abs(data.readInt16LE(f * 2 * channels)));
  }
  return max / 32768;
});
const loudest = Math.max(...peaks) || 1;
// Square root lifts the quiet passages so speech reads as speech, not spikes.
const out = peaks.map((p) => Math.round(Math.max(0.08, Math.sqrt(p / loudest)) * 1000) / 1000);

const target = input.replace(/\.wav$/i, '') + '.peaks.json';
fs.writeFileSync(target, JSON.stringify(out));
console.log(`${target}: ${out.length} peaks from ${(frames / rate).toFixed(1)}s`);
