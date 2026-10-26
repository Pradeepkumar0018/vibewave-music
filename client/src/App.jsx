import { useEffect, useRef, useState } from 'react';
import { AudioLines, CircleHelp, Disc3, Headphones, Music2, Pause, Play, Radio, Search, Sparkles, Upload, Volume2 } from 'lucide-react';

const moods = [
  { name: 'Happy', icon: '☀️', color: '#f6bd60' }, { name: 'Calm', icon: '🌿', color: '#7fb69b' },
  { name: 'Sad', icon: '🌧️', color: '#8da9d6' }, { name: 'Angry', icon: '🔥', color: '#e47c73' },
  { name: 'Neutral', icon: '☁️', color: '#b2a8c9' }, { name: 'Surprised', icon: '✨', color: '#d79be8' },
  { name: 'Fearful', icon: '🌙', color: '#8598ba' }, { name: 'Disgust', icon: '🍃', color: '#a1b779' }
];

export default function App() {
  const [songs, setSongs] = useState([]), [mood, setMood] = useState('Happy');
  const [language, setLanguage] = useState('Tamil'), [query, setQuery] = useState('');
  const [playing, setPlaying] = useState(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [api, setApi] = useState(false), [model, setModel] = useState(null);
  const fileRef = useRef(null), audioRef = useRef(null);

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(d => { setApi(true); setModel(d.model); }).catch(() => setApi(false));
    loadSongs('Happy', 'Tamil');
  }, []);

  async function loadSongs(selectedMood = mood, selectedLanguage = language, search = query) {
    setBusy(true); setMessage('');
    try {
      const params = new URLSearchParams({ mood: selectedMood, language: selectedLanguage, q: search });
      const res = await fetch(`/api/recommendations?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load recommendations');
      setSongs(data.songs || []);
      if (!data.songs?.length) setMessage('No songs found for this selection. Try another language or mood.');
    } catch (err) { setMessage('Start the project with npm run dev to connect to the music service.'); }
    finally { setBusy(false); }
  }

  function chooseMood(next) { setMood(next); loadSongs(next, language); }
  function chooseLanguage(e) { setLanguage(e.target.value); loadSongs(mood, e.target.value); }
  function search(e) { e.preventDefault(); loadSongs(mood, language, query); }
  function togglePlay(song) {
    if (!song.previewUrl) {
      if (song.trackUrl) window.open(song.trackUrl, '_blank', 'noopener,noreferrer');
      setMessage(song.trackUrl ? 'Opening this track in Spotify.' : 'A preview is not available for this song.');
      return;
    }
    if (playing === song.trackId) { audioRef.current?.pause(); setPlaying(null); return; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = song.previewUrl; audioRef.current.play().catch(() => setMessage('This preview could not be played.')); }
    setPlaying(song.trackId);
  }
  async function analyze(file) {
    if (!file) return;
    setBusy(true); setMessage('Listening for the feeling in your audio…');
    const body = new FormData(); body.append('audio', file);
    try {
      const res = await fetch('/api/emotion/analyze', { method: 'POST', body });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Audio analysis failed');
      setMood(data.emotion);
      await loadSongs(data.emotion, language);
      setMessage(`We heard ${data.emotion.toLowerCase()} in your voice.`);
    } catch (err) { setMessage(err.message || 'Could not analyze that recording.'); }
    finally { setBusy(false); }
  }
  const filteredMoods = moods;

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#top"><span className="brand-mark"><AudioLines size={21}/></span><span>vibewave<span className="brand-light"> music</span></span></a>
      <div className="side-label">YOUR SPACE</div>
      <a className="nav-item active" href="#discover"><Radio size={17}/> Discover</a>
      <a className="nav-item" href="#mood"><Sparkles size={17}/> Mood match</a>
      <div className="side-label library-label">YOUR LIBRARY</div>
      <a className="nav-item" href="#recommendations"><Headphones size={17}/> For you</a>
      <div className="sidebar-note"><div className="note-icon"><Music2 size={18}/></div><strong>A little music<br/>for every feeling.</strong><p>Tell us how you feel. We’ll find the soundtrack.</p></div>
      <div className="side-bottom"><span className={`status-dot ${api ? 'online' : ''}`}></span>{api ? 'Music service connected' : 'Connecting to music service'}</div>
    </aside>

    <main id="top" className="main-content">
      <header className="topbar"><div className="breadcrumb">Your sound <span>/</span> <b>Discover</b></div><div className="top-actions"><span className="greeting">Made for your moment</span><div className="avatar">K</div></div></header>
      <div id="discover" className="page-wrap">
        <section className="hero">
          <div className="hero-copy"><span className="eyebrow"><span className="eyebrow-dot"></span> A MORE PERSONAL LISTEN</span><h1>Music for the<br/><em>way you feel.</em></h1><p>Every mood has a melody. Find the songs that meet you right where you are.</p>
            <a className="hero-link" href="#mood">Find your feeling <span>↗</span></a>
          </div><div className="hero-art"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="glow-disc"><div className="disc-center"><AudioLines size={31}/></div></div><span className="floating-note note-a">♪</span><span className="floating-note note-b">♫</span><span className="art-caption">YOUR DAY, IN SOUND</span></div>
          <div className="hero-stats"><div><strong>8</strong><span>feelings to explore</span></div><i></i><div><strong>∞</strong><span>ways to listen</span></div><i></i><div><strong>1</strong><span>you, always</span></div></div>
        </section>

        <section id="mood" className="mood-section"><div className="section-head"><div><span className="eyebrow muted">START WITH A FEELING</span><h2>What’s your mood today?</h2><p>Pick what feels closest. There’s no wrong answer.</p></div><button className="help-button" title="You can also upload a short voice recording"><CircleHelp size={18}/></button></div>
          <div className="mood-grid">{filteredMoods.map(item => <button key={item.name} onClick={() => chooseMood(item.name)} className={`mood-card ${mood === item.name ? 'selected' : ''}`} style={{'--mood-color': item.color}}><span className="mood-emoji">{item.icon}</span><span className="mood-name">{item.name}</span>{mood === item.name && <span className="selected-check">✓</span>}</button>)}</div>
          <div className="voice-box"><div className="voice-icon"><Volume2 size={18}/></div><div className="voice-text"><strong>Let your voice choose</strong><span>Upload a short WAV recording for an emotion estimate.</span></div><input ref={fileRef} type="file" accept="audio/wav,audio/x-wav" hidden onChange={e => analyze(e.target.files?.[0])}/><button className="upload-button" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={15}/> Analyze voice</button></div>
          {model && <p className="model-note"><span className="model-dot"></span>Voice model {model.ready ? `ready · ${model.samples} training clips` : 'needs training · run npm run train:model'}</p>}
        </section>

        <section id="recommendations" className="music-section"><div className="section-head music-head"><div><span className="eyebrow muted">A MIX FOR YOUR MOMENT</span><h2>Your {mood.toLowerCase()} mix</h2><p>Picked from the VibeWave collection, just for you.</p></div><div className="music-controls"><label className="language-select"><span>Language</span><select value={language} onChange={chooseLanguage}><option>Tamil</option><option>Hindi</option><option>Telugu</option><option>Malayalam</option><option>English</option></select></label><form onSubmit={search} className="search-box"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a song or artist"/><button aria-label="Search"><span>↵</span></button></form></div></div>
          {message && <div className="message-bar">{message}</div>}
          <div className="song-list">{busy && !songs.length ? <div className="empty-state"><div className="loader"></div><span>Finding your next favorite…</span></div> : songs.map((song, index) => <article className="song-row" key={song.trackId || index}><span className="song-index">{String(index + 1).padStart(2, '0')}</span><div className="cover-wrap">{song.artworkUrl ? <img src={song.artworkUrl} alt=""/> : <div className="cover-fallback" style={{'--cover': moods.find(m => m.name === mood)?.color}}><Disc3 size={22}/></div>}</div><button className="song-title" onClick={() => togglePlay(song)}><strong>{song.trackName}</strong><span>{song.artistName}{song.albumName ? ` · ${song.albumName}` : ''}</span></button><span className="song-language">{song.language || language}</span><button className="play-button" aria-label={playing === song.trackId ? 'Pause preview' : 'Play preview'} onClick={() => togglePlay(song)}>{playing === song.trackId ? <Pause size={16}/> : <Play size={16}/>}</button></article>)}
            {!busy && songs.length === 0 && !message && <div className="empty-state"><Music2 size={24}/><span>Your next favorite is just around the corner.</span></div>}
          </div>
          <div className="list-footer"><span>{songs.length} songs picked for you</span><span className="powered"><span className="powered-dot"></span> Powered by your mood</span></div>
        </section>
        <footer><span>© 2026 VibeWave Music</span><span>Made for listening, and feeling.</span></footer>
      </div>
    </main>
    <audio ref={audioRef} onEnded={() => setPlaying(null)} onPause={() => {}} />
  </div>;
}
