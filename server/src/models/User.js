import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  favorites: [{ trackId: String, trackName: String, artistName: String, artworkUrl: String, trackUrl: String, previewUrl: String }]
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
