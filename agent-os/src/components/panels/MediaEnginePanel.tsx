import { useState } from 'react';
import { Image, Video, Download } from 'lucide-react';
import type { GalleryItem } from '../../types';

export default function MediaEnginePanel() {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [prompt, setPrompt] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [genProvider, setGenProvider] = useState('pollinations');
  const [loading, setLoading] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>(() => {
    try {
      const saved = localStorage.getItem('agent_os_gallery');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveToGallery = (url: string, type: 'image' | 'video') => {
    const newItem: GalleryItem = {
      id: 'media-' + Date.now(),
      url,
      type,
      prompt,
      timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })
    };
    const updated = [newItem, ...gallery];
    setGallery(updated);
    localStorage.setItem('agent_os_gallery', JSON.stringify(updated));
  };

  const deleteFromGallery = (id: string) => {
    const updated = gallery.filter(item => item.id !== id);
    setGallery(updated);
    localStorage.setItem('agent_os_gallery', JSON.stringify(updated));
  };

  const genImage = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setMediaUrl('');
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: genProvider }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setMediaUrl(data.imageUrl);
        saveToGallery(data.imageUrl, 'image');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const genVideo = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setMediaUrl('');
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.videoUrl) {
        setMediaUrl(data.videoUrl);
        saveToGallery(data.videoUrl, 'video');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleGen = () => {
    if (activeTab === 'image') genImage();
    else genVideo();
  };

  return (
    <div className="space-y-3 p-3 bg-white/[0.015] border border-white/[0.04] rounded-2xl shadow-xl">
      <div className="flex justify-between items-center select-none">
        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
          {activeTab === 'image' ? <Image size={10} className="text-pink-400" /> : <Video size={10} className="text-purple-400" />} Media Engine
        </span>
        <div className="flex gap-1.5">
          <button 
            onClick={() => { setActiveTab('image'); setMediaUrl(''); }} 
            className={`text-[8px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${activeTab === 'image' ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' : 'text-gray-500 border-white/[0.03] hover:text-gray-300'}`}
          >
            Image
          </button>
          <button 
            onClick={() => { setActiveTab('video'); setMediaUrl(''); }} 
            className={`text-[8px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${activeTab === 'video' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'text-gray-500 border-white/[0.03] hover:text-gray-300'}`}
          >
            Video
          </button>
        </div>
      </div>

      {activeTab === 'image' && (
        <div className="flex gap-1.5 select-none">
          {['pollinations', 'gemini'].map(p => (
            <button 
              key={p} 
              onClick={() => setGenProvider(p)} 
              className={`text-[8px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${genProvider === p ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'text-gray-500 border-white/[0.03] hover:text-gray-300'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <input 
          value={prompt} 
          onChange={e => setPrompt(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleGen()} 
          placeholder={activeTab === 'image' ? "Describe image..." : "Describe video..."} 
          className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/30" 
        />
        <button 
          onClick={handleGen} 
          disabled={loading} 
          className={`px-3 py-1.5 rounded-lg text-white text-[10px] font-medium disabled:opacity-50 cursor-pointer whitespace-nowrap ${activeTab === 'image' ? 'bg-pink-600/80 hover:bg-pink-500' : 'bg-purple-600/80 hover:bg-purple-500'}`}
        >
          {loading ? '⏳' : activeTab === 'image' ? '🎨 Gen Image' : '🎬 Gen Video'}
        </button>
      </div>

      {mediaUrl && (
        <div className="rounded-xl overflow-hidden border border-white/[0.05] bg-black/30 p-2 space-y-2">
          {activeTab === 'image' ? (
            <img src={mediaUrl} alt="Generated" className="w-full h-auto max-h-48 object-contain" />
          ) : (
            <div className="space-y-2">
              <video src={mediaUrl} controls autoPlay loop className="w-full h-auto max-h-48 rounded" />
              <a 
                href={mediaUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center justify-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-medium py-1 px-2.5 rounded bg-purple-500/10 border border-purple-500/20 transition-all"
              >
                <Download size={10} /> Open & Download Video
              </a>
            </div>
          )}
        </div>
      )}

      {gallery.length > 0 && (
        <div className="space-y-2 mt-3 pt-3 border-t border-white/[0.04]">
          <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">Saved Gallery ({gallery.length})</div>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {gallery.map(item => (
              <div key={item.id} className="group relative rounded-lg overflow-hidden border border-white/[0.04] bg-black/40 aspect-square flex flex-col justify-between">
                {item.type === 'image' ? (
                  <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                ) : (
                  <video src={item.url} className="w-full h-full object-cover" muted loop autoPlay />
                )}
                <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 flex flex-col justify-between text-[9px] text-white">
                  <p className="text-gray-300 line-clamp-3 select-all overflow-hidden text-[8px] leading-tight">{item.prompt}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[7.5px] text-gray-500">{item.timestamp}</span>
                    <div className="flex gap-1.5">
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-white cursor-pointer font-bold">Open</a>
                      <button onClick={() => deleteFromGallery(item.id)} className="text-red-400 hover:text-red-300 cursor-pointer font-bold">Del</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
