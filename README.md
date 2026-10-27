# VibeWave Music

VibeWave Music is a mood-based music discovery prototype built with React, Vite, Node.js, Express, and optional MongoDB persistence for favorites. It uses the included Spotify track catalog and a small KNN voice-emotion model trained from labeled RAVDESS WAV clips.

## Run locally

Requirements: Node.js 20 or newer and npm.

```powershell
npm install
npm run dev
```

Open <http://localhost:5173>. The Vite development server forwards `/api` requests to the Express API at <http://localhost:4000>.

The generated voice model is included at `server/models/emotion-knn.json`. To rebuild it from the labeled WAV files, run:

```powershell
npm run train:model
```

Voice analysis accepts WAV audio. The API supports PCM and IEEE float WAV formats. The recording is analyzed in memory and is not saved by the app. The voice result is an experimental estimate, not a validated measure of a person's actual mood; the project does not currently publish model accuracy metrics. Recommendations use a simple valence/energy match against the local catalog, so they work without MongoDB or a Spotify API key. This is song discovery, not a music streaming service: if a preview URL is absent, selecting play opens the song's Spotify track page.

## MongoDB

The backend works without MongoDB, using local catalog data and temporary in-memory favorites. Favorites are associated with a signed, anonymous browser cookie; they are not a user account or authentication system. To persist favorites in MongoDB, copy `server/.env.example` to `server/.env`, set `MONGODB_URI` and a long random `FAVORITES_SESSION_SECRET`, and start a local MongoDB server or provide a MongoDB connection string. Set both values in Vercel when using MongoDB there. Without either secret or MongoDB URI, favorites endpoints return an unavailable response on Vercel rather than sharing favorites across visitors.

## Project layout

- `client/` React and Vite application
- `server/` Express API, anonymous favorites session model, recommendation logic, and voice model
- `data/spotify_tracks.csv` music catalog
- `data/ravdess/` emotion-labeled WAV training data

## API

- `GET /api/health` service and model status
- `GET /api/songs?language=Tamil` catalog songs
- `GET /api/recommendations?mood=Happy&language=Tamil` mood-matched songs
- `POST /api/emotion/analyze` multipart WAV upload under `audio`
- `GET/POST/DELETE /api/favorites` saved songs

## Deploy to Vercel

Import this repository into the Vercel team and keep the project root set to the repository root. The included vercel.json builds the Vite client and serves the Express API as a Vercel Function. No MongoDB setup is required for the local catalog and emotion model.
