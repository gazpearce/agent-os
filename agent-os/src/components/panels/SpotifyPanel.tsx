import { useState } from "react";

export default function SpotifyPanel() {
  const [track, setTrack] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const togglePlay = async () => { 
    const action = isPlaying ? 'pause' : 'play';
    try {
      const res = await fetch('http://localhost:3000/api/spotify/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await res.json();
      if (data.success) {
        setIsPlaying(data.isPlaying);
        setTrack(data.track || (data.isPlaying ? 'Now Playing' : 'Not playing'));
      }
    } catch (e) { console.error(e); }
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <span className="text-green-400">🎵</span> Spotify
      </div>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.015] border border-white/[0.02]">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm ${isPlaying ? 'bg-green-600 animate-pulse' : 'bg-gray-700'}`}>🎵</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-white font-medium truncate">{track || 'Not playing'}</div>
          <div className="text-[8px] text-gray-500">Local control</div>
        </div>
        <button onClick={togglePlay} className="w-7 h-7 rounded-full bg-green-600/80 hover:bg-green-500 flex items-center justify-center text-white cursor-pointer text-xs">
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>
    </div>
  );
}
