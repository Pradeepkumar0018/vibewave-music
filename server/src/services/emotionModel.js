import { readFile } from 'node:fs/promises';
import { modelPath } from '../config.js';
import { extractFeatures } from './audioFeatures.js';

let modelCache;
export async function loadModel() {
  if (modelCache) return modelCache;
  try { modelCache = JSON.parse(await readFile(modelPath, 'utf8')); return modelCache; }
  catch { return null; }
}

export async function predictEmotion(audioBuffer) {
  const model = await loadModel();
  if (!model?.samples?.length) throw new Error('The voice model is not trained yet. Run npm run train:model from the project folder.');
  const input = extractFeatures(audioBuffer);
  const distances = model.samples.map(item => ({ emotion: item.emotion, distance: Math.sqrt(item.features.reduce((sum, value, i) => sum + ((value - input[i]) / (model.scales[i] || 1)) ** 2, 0)) }));
  distances.sort((a, b) => a.distance - b.distance);
  const nearest = distances.slice(0, model.neighbors || 7), scores = new Map();
  for (const item of nearest) scores.set(item.emotion, (scores.get(item.emotion) || 0) + 1 / (item.distance + 0.05));
  const [emotion, score] = [...scores].sort((a, b) => b[1] - a[1])[0];
  const total = [...scores.values()].reduce((sum, n) => sum + n, 0);
  return { emotion, confidence: Math.round(score / total * 100), sampleCount: model.samples.length };
}
