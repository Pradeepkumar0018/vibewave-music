import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { modelPath, ravdessPath } from '../src/config.js';
import { extractFeatures } from '../src/services/audioFeatures.js';

const emotions = ['angry', 'calm', 'disgust', 'fearful', 'happy', 'neutral', 'sad', 'surprised'];
const targetPerEmotion = 36;
const samples = [];
for (const emotion of emotions) {
  const files = (await readdir(path.join(ravdessPath, emotion))).filter(file => file.toLowerCase().endsWith('.wav')).sort();
  if (!files.length) throw new Error(`No WAV recordings found for ${emotion} at ${path.join(ravdessPath, emotion)}`);
  const count = Math.min(targetPerEmotion, files.length);
  for (let index = 0; index < count; index++) {
    const fileIndex = Math.floor(index * files.length / count), file = files[fileIndex];
    try { samples.push({ emotion: emotion[0].toUpperCase() + emotion.slice(1), features: extractFeatures(await readFile(path.join(ravdessPath, emotion, file))) }); }
    catch (error) { console.warn(`Skipped ${file}: ${error.message}`); }
  }
  console.log(`${emotion}: learned from ${samples.filter(item => item.emotion.toLowerCase() === emotion).length} clips`);
}
if (samples.length < emotions.length * 4) throw new Error('Not enough usable WAV clips to train a model.');
const dimensions = samples[0].features.length, means = [], scales = [];
for (let i = 0; i < dimensions; i++) {
  const values = samples.map(item => item.features[i]), mean = values.reduce((s, v) => s + v, 0) / values.length;
  means.push(mean); scales.push(Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) || 1);
}
await mkdir(path.dirname(modelPath), { recursive: true });
await writeFile(modelPath, JSON.stringify({ version: 1, trainedAt: new Date().toISOString(), featureNames: ['rms', 'rmsVariation', 'zeroCrossingRate', 'spectralCentroid', 'pitchEstimate'], means, scales, neighbors: 7, samples }, null, 2));
console.log(`Saved ${samples.length} labeled voice clips to ${modelPath}`);
