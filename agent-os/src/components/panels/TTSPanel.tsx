import { useState } from "react";

export default function TTSPanel() {
  const [text, setText] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [ttsLoading, setTtsLoading] = useState(false);
  const speak = async () => {
    if (!text.trim() || ttsLoading) return;
    setTtsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        // Auto-play
        try { new Audio(data.audioUrl).play(); } catch (_) {}
      }
    } catch (e) { console.error(e); }
    finally { setTtsLoading(false); }
  };
  return (
    <div className="space-y-2">
      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
        <span className="text-green-400">🔊</span> Text to Speech
      </div>
      <div className="flex gap-1.5">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && speak()} placeholder="Type text to speak..." className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-green-500/30" />
        <button onClick={speak} disabled={ttsLoading} className="px-2.5 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-500 text-white text-[10px] font-medium disabled:opacity-50 cursor-pointer">
          {ttsLoading ? '⏳' : '🔊 Speak'}
        </button>
      </div>
      {audioUrl && <audio controls src={audioUrl} className="w-full h-8 opacity-70" />}
    </div>
  );
}
