import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mongoose from 'mongoose';
import User from './models/User.js';
import { getCatalog, recommend } from './services/catalog.js';
import { loadModel, predictEmotion } from './services/emotionModel.js';

const app = express(), port = Number(process.env.PORT) || 4000;
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const memoryFavorites = new Map();

app.get('/api/health', async (_req, res) => {
  const model = await loadModel();
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'local-catalog', model: { ready: Boolean(model?.samples?.length), samples: model?.samples?.length || 0 } });
});

app.get('/api/songs', async (req, res, next) => {
  try {
    const catalog = await getCatalog(), language = (req.query.language || '').toLowerCase();
    res.json(catalog.filter(song => !language || song.language.toLowerCase() === language).slice(0, 50));
  } catch (error) { next(error); }
});

app.get('/api/recommendations', async (req, res, next) => {
  try { res.json({ mood: req.query.mood || 'Happy', language: req.query.language || 'Tamil', songs: await recommend(req.query) }); }
  catch (error) { next(error); }
});

app.post('/api/emotion/analyze', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a voice recording first.' });
  try {
    const result = await predictEmotion(req.file.buffer);
    res.json({ ...result, songs: await recommend({ mood: result.emotion, language: req.body.language || 'Tamil' }) });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/favorites', async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: req.query.email || 'local@vibewave.music' }).lean();
      return res.json(user?.favorites || []);
    }
    return res.json(memoryFavorites.get(req.query.email || 'local') || []);
  } catch (error) { next(error); }
});

app.post('/api/favorites', async (req, res, next) => {
  try {
    const { song, email = 'local@vibewave.music' } = req.body;
    if (!song?.trackId) return res.status(400).json({ error: 'A song with a track ID is required.' });
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOneAndUpdate({ email }, { $addToSet: { favorites: song } }, { upsert: true, new: true, setDefaultsOnInsert: true });
      return res.json(user.favorites);
    }
    const favorites = memoryFavorites.get(email) || [];
    if (!favorites.some(item => item.trackId === song.trackId)) favorites.push(song);
    memoryFavorites.set(email, favorites); res.json(favorites);
  } catch (error) { next(error); }
});

app.delete('/api/favorites/:trackId', async (req, res, next) => {
  try {
    const email = req.query.email || 'local@vibewave.music';
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOneAndUpdate({ email }, { $pull: { favorites: { trackId: req.params.trackId } } }, { new: true });
      return res.json(user?.favorites || []);
    }
    const favorites = (memoryFavorites.get(email) || []).filter(item => item.trackId !== req.params.trackId);
    memoryFavorites.set(email, favorites); res.json(favorites);
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(error.status || 500).json({ error: error.status === 413 ? 'The recording is too large. Choose one under 20 MB.' : 'The music service could not complete that request.' });
});

if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB connected')).catch(error => console.warn(`MongoDB is unavailable; using local catalog and session favorites (${error.message})`));
if (!process.env.VERCEL) app.listen(port, () => console.log(`VibeWave Music API listening on http://localhost:${port}`));

export default app;
