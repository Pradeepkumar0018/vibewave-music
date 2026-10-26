import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const projectDir = path.resolve(serverDir, '..');
export const catalogPath = path.join(projectDir, 'data', 'spotify_tracks.csv');
export const ravdessPath = path.join(projectDir, 'data', 'ravdess');
export const modelPath = path.join(serverDir, 'models', 'emotion-knn.json');
