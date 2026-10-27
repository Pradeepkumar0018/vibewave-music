import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  favorites: [{ trackId: String, trackName: String, artistName: String, artworkUrl: String, trackUrl: String, previewUrl: String }]
}, { timestamps: true });

export default mongoose.models.FavoriteSession || mongoose.model('FavoriteSession', sessionSchema, 'anonymous_favorites');
