import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { catalogPath } from '../config.js';

let cached;
export async function getCatalog() {
  if (cached) return cached;
  const text = await readFile(catalogPath, 'utf8');
  cached = parse(text, { columns: true, skip_empty_lines: true, relax_quotes: true }).map(row => ({
    trackId: row.track_id,
    trackName: row.track_name,
    artistName: row.artist_name,
    albumName: row.album_name,
    year: Number(row.year) || null,
    popularity: Number(row.popularity) || 0,
    artworkUrl: row.artwork_url || '',
    trackUrl: row.track_url || '',
    previewUrl: row.preview_url || '',
    language: row.language || 'Other',
    valence: Number(row.valence) || 0,
    energy: Number(row.energy) || 0
  }));
  return cached;
}

export function moodTarget(mood) {
  const values = { happy: [0.78, 0.72], calm: [0.57, 0.3], sad: [0.27, 0.37], angry: [0.3, 0.88], neutral: [0.52, 0.5], surprised: [0.78, 0.86], fearful: [0.25, 0.43], disgust: [0.34, 0.58] };
  return values[(mood || 'happy').toLowerCase()] || values.happy;
}

export async function recommend({ mood, language, q }) {
  const catalog = await getCatalog(), [targetValence, targetEnergy] = moodTarget(mood);
  const selectedLanguage = (language || 'Tamil').toLowerCase();
  let pool = catalog.filter(song => song.language.toLowerCase() === selectedLanguage);
  if (!pool.length) pool = catalog;
  const query = (q || '').trim().toLowerCase();
  if (query) pool = pool.filter(song => `${song.trackName} ${song.artistName} ${song.albumName}`.toLowerCase().includes(query));
  return pool.map(song => ({ ...song, match: 1 - (Math.abs(song.valence - targetValence) * 0.6 + Math.abs(song.energy - targetEnergy) * 0.4) }))
    .sort((a, b) => b.match + b.popularity / 1000 - (a.match + a.popularity / 1000)).slice(0, 12);
}
