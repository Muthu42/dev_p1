
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, ValentineData } from './types';
import Rose3D from './components/Rose3D';
import ScratchCard from './components/ScratchCard';
import { generateRomanticMessage } from './services/gemini';
import QRCode from 'qrcode';
import { saveCard, loadCard } from './services/cardStorage';

const LOVE_QUOTES = [
  "Our love is a kaleidoscope of beautiful moments.",
  "You are the poem I never knew I could write.",
  "Every butterfly in my stomach belongs to you.",
  "In your eyes, I found my favorite world.",
  "Time stops whenever you are near.",
  "You are my forever and my always.",
  "Our story is my favorite fairy tale.",
  "With you, every day feels like magic.",
  "You had me at your very first smile.",
  "Growing old with you is my only dream."
];

interface ButterflyParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
}

const encodeData = (obj: any) => {
  const str = JSON.stringify(obj);
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
};

const decodeData = (str: string) => {
  const decoded = decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  return JSON.parse(decoded);
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.LANDING);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrError, setQrError] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
  const [particles, setParticles] = useState<ButterflyParticle[]>([]);
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false);
  const [openingLabel, setOpeningLabel] = useState('SCRATCH TO REVEAL');
  const [shareId, setShareId] = useState<string | null>(null);
  
  const [localHighResPhotos, setLocalHighResPhotos] = useState<string[]>([]);
  
  const [data, setData] = useState<ValentineData>({
    recipientName: '',
    specialDate: '',
    photoUrls: [],
    quotes: [],
    message: ''
  });

  const storyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    const cardParam = urlParams.get('card');
    const labelParam = urlParams.get('label');

    if (labelParam) setOpeningLabel(decodeURIComponent(labelParam));
    if (!idParam && !cardParam) return;

    (async () => {
      let baseData: ValentineData | null = null;

      // Decode lightweight card payload from URL if present
      if (cardParam) {
        try {
          const decoded = decodeData(cardParam);
          baseData = {
            recipientName: decoded.recipientName || '',
            specialDate: decoded.specialDate || '',
            photoUrls: [],
            quotes: decoded.quotes || [],
            message: decoded.message || '',
          };
        } catch (err) {
          console.error('Error decoding card payload', err);
        }
      }

      // Try to hydrate from Supabase if an id is present
      if (idParam) {
        try {
          const card = await loadCard(idParam);
          if (card) {
            setShareId(idParam);
            setData({
              recipientName: card.recipientName,
              specialDate: card.specialDate,
              photoUrls: card.photoUrls || (baseData?.photoUrls ?? []),
              quotes: card.quotes || (baseData?.quotes ?? []),
              message: card.message || (baseData?.message ?? ''),
            });
            setState(AppState.SCRATCH);
            return;
          }
        } catch (e) {
          console.error('Error loading card from Supabase', e);
        }
      }

      // Fallback: if we at least decoded something from the URL, use that
      if (baseData) {
        setData(baseData);
        setState(AppState.SCRATCH);
      }
    })();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (state !== AppState.STORY || !storyRef.current) return;
      const totalHeight = storyRef.current.scrollHeight - window.innerHeight;
      const progress = window.scrollY / (totalHeight || 1);
      setScrollProgress(Math.min(1, Math.max(0, progress)));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [state]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5) as File[];
    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setLocalHighResPhotos(prev => [...prev, base64]);
        // Store the raw base64 (already limited to 5 photos). This is only used
        // locally and uploaded to Supabase; it is NOT placed in the URL, so
        // size here is safe.
        setData(prev => ({
          ...prev,
          photoUrls: [...prev.photoUrls, base64],
          quotes: [...prev.quotes, ''], // Initialize empty quote for the new photo
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const updateQuote = (index: number, val: string) => {
    const newQuotes = [...data.quotes];
    newQuotes[index] = val;
    setData(prev => ({ ...prev, quotes: newQuotes }));
  };

  const spawnButterfly = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random();
    const newParticle: ButterflyParticle = {
      id, x, y,
      vx: 0, vy: 0, rotation: Math.random() * 360
    };
    setParticles(prev => [...prev.slice(-10), newParticle]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 1500);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState(AppState.GENERATING);

    const msg = await generateRomanticMessage(data.recipientName, data.specialDate);
    const fullData: ValentineData = { ...data, message: msg };
    setData(fullData);

    try {
      const stored = await saveCard(fullData);
      setShareId(stored.id);
      setData({
        recipientName: stored.recipientName,
        specialDate: stored.specialDate,
        photoUrls: stored.photoUrls,
        quotes: stored.quotes,
        message: stored.message,
      });
    } catch (err) {
      console.error('Error saving card to Supabase', err);
    }

    setState(AppState.SHARE);
  };

  const openEnvelope = () => {
    setIsEnvelopeOpen(true);
    setTimeout(() => {
      setState(AppState.STORY);
    }, 2800);
  };

  const getFullShareUrl = useCallback(() => {
    const base = `${window.location.origin}${window.location.pathname}`;

    // Always include a lightweight encoded payload so the scratch view can be restored
    const sharePayload = {
      recipientName: data.recipientName,
      specialDate: data.specialDate,
      quotes: data.quotes,
      message: data.message,
    };
    const code = encodeData(sharePayload);

    const params = new URLSearchParams();
    params.set('card', code);
    if (shareId) params.set('id', shareId);
    params.set('label', encodeURIComponent(openingLabel));

    return `${base}?${params.toString()}`;
  }, [data.recipientName, data.specialDate, data.quotes, data.message, openingLabel, shareId]);

  useEffect(() => {
    if (state === AppState.SHARE) {
      setQrError(false);
      QRCode.toDataURL(getFullShareUrl(), { width: 400, margin: 2, errorCorrectionLevel: 'L' })
        .then(setQrCodeUrl)
        .catch(() => setQrError(true));
    }
  }, [state, getFullShareUrl]);

  const displayPhotos = localHighResPhotos.length > 0 ? localHighResPhotos : data.photoUrls;

  const StorySection: React.FC<{ index: number; photo?: string; quote: string }> = ({ index, photo, quote }) => {
    const total = displayPhotos.length + 1;
    const start = index / total;
    const end = (index + 1) / total;
    const isActive = scrollProgress >= start - 0.1 && scrollProgress <= end + 0.1;
    
    const rotation = (index % 2 === 0 ? 2 : -2);
    const align = index % 2 === 0 ? 'md:justify-start' : 'md:justify-end';

    return (
      <div className={`min-h-[100vh] md:h-[150vh] relative flex flex-col items-center justify-center ${align} transition-all duration-1000 ${isActive ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10 pointer-events-none'}`}>
        <div className="max-w-4xl w-full px-6 md:px-12 text-center flex flex-col items-center gap-8 md:gap-16">
            {photo && (
                <div className="relative group" style={{ transform: `rotate(${rotation}deg)` }}>
                    <div className="relative z-10 p-3 md:p-6 bg-white shadow-[0_40px_120px_rgba(0,0,0,0.15)] border-4 border-slate-50 overflow-hidden rounded-sm">
                        <img src={photo} alt="Memory" className="w-64 h-80 md:w-[36rem] md:h-[36rem] object-cover rounded-sm" />
                    </div>
                    <div className="absolute -top-12 -right-12 text-6xl animate-bounce pointer-events-none">✨</div>
                </div>
            )}
            <p className="text-3xl md:text-7xl font-dancing text-rose-950 px-2 max-w-2xl leading-tight">
                {quote}
            </p>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900 overflow-x-hidden selection:bg-rose-100 font-sans">
      <Rose3D scrollProgress={scrollProgress} />

      <div className="fixed inset-0 pointer-events-none z-[100]">
        {particles.map(p => (
          <div key={p.id} className="absolute text-2xl animate-butterfly-fly" style={{ left: p.x, top: p.y, transform: `rotate(${p.rotation}deg)` }}>
            🦋
          </div>
        ))}
      </div>

      <div className="relative z-10 w-full">
        {state === AppState.LANDING && (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <h1 className="text-6xl md:text-[12rem] font-dancing text-rose-800 mb-6 drop-shadow-sm px-4 leading-none">Prism of Love</h1>
            <p className="text-lg md:text-2xl font-playfair italic mb-12 text-slate-400 tracking-[0.3em] max-w-md uppercase">Editorial Romance Experience</p>
            <button 
              onClick={() => setState(AppState.FORM)} 
              className="w-full max-w-xs px-12 py-5 bg-rose-900 hover:bg-rose-800 text-white rounded-full font-black uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-95"
            >
              Enter Story
            </button>
          </div>
        )}

        {state === AppState.FORM && (
          <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-lg bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-[0_30px_100px_rgba(0,0,0,0.08)]">
              <h2 className="text-3xl md:text-4xl font-playfair text-rose-900 mb-8 text-center tracking-tighter uppercase">Craft Your Vision</h2>
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2">Recipient Name</label>
                    <input required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 md:py-5 outline-none focus:border-rose-300 transition-all" value={data.recipientName} placeholder="E.g. My Eternal Love" onChange={e => setData(prev => ({...prev, recipientName: e.target.value}))} />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2">Anniversary Date</label>
                    <input required type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 md:py-5 outline-none focus:border-rose-300 transition-all text-slate-900" value={data.specialDate} onChange={e => setData(prev => ({...prev, specialDate: e.target.value}))} />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2">Opening Label</label>
                    <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-rose-300 transition-all" value={openingLabel} onChange={e => setOpeningLabel(e.target.value.toUpperCase())} placeholder="E.g. SCRATCH TO REVEAL" />
                </div>
                
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2">Memories ({displayPhotos.length}/5)</label>
                    <div className="relative w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-rose-400 transition-all cursor-pointer">
                      <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <p className="text-xs text-slate-400">Select images that define us</p>
                    </div>
                </div>

                {displayPhotos.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <label className="text-[10px] uppercase tracking-widest text-rose-900 font-bold px-2">Personalize Each Memory (Optional)</label>
                    {displayPhotos.map((photo, i) => (
                      <div key={i} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <img src={photo} className="w-12 h-12 object-cover rounded-lg shadow-sm" alt="Thumbnail" />
                        <input 
                          className="flex-1 bg-transparent text-xs outline-none focus:text-rose-900 transition-colors"
                          placeholder="Enter a custom quote..."
                          value={data.quotes[i] || ''}
                          onChange={(e) => updateQuote(i, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button type="submit" className="w-full py-5 bg-rose-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-rose-800 transition-all active:scale-95">Generate</button>
              </form>
            </div>
          </div>
        )}

        {state === AppState.GENERATING && (
          <div className="min-h-screen flex flex-col items-center justify-center space-y-8 p-6 text-center">
              <div className="text-7xl md:text-9xl animate-pulse grayscale opacity-20">🕯️</div>
              <p className="text-rose-900 font-dancing text-3xl md:text-5xl animate-pulse">Designing your universe...</p>
          </div>
        )}

        {state === AppState.SHARE && (
          <div className="min-h-screen flex items-center justify-center p-6 md:p-8">
            <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 text-center max-w-lg w-full shadow-[0_50px_150px_rgba(0,0,0,0.1)]">
                <h3 className="text-3xl md:text-4xl font-dancing text-rose-900 mb-8">Gift Invitation</h3>
                <div className="bg-white p-5 rounded-[2rem] mb-10 inline-block shadow-sm mx-auto border border-slate-50">
                    {qrError ? <div className="p-8 text-rose-900 font-bold">Error generating QR</div> : qrCodeUrl ? <img src={qrCodeUrl} className="w-48 h-48 md:w-64 md:h-64" alt="QR" /> : <div className="w-48 h-48 animate-pulse bg-slate-100 rounded-2xl" />}
                </div>
                <div className="space-y-4">
                  <button onClick={() => { navigator.clipboard.writeText(getFullShareUrl()); setShareStatus('copied'); }} className="w-full py-5 bg-rose-900 text-white rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all">
                      {shareStatus === 'copied' ? '✓ Link Copied' : 'Share Invitation'}
                  </button>
                  <button onClick={() => setState(AppState.SCRATCH)} className="w-full py-3 text-slate-400 uppercase tracking-widest text-[10px] hover:text-rose-900 transition-colors">Preview Story</button>
                </div>
            </div>
          </div>
        )}

        {state === AppState.SCRATCH && (
          <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-4xl">
                <ScratchCard 
                  label={openingLabel}
                  onScratch={spawnButterfly} 
                  onComplete={() => setState(AppState.ENVELOPE)}
                >
                    <div className="w-full h-full bg-white flex flex-col items-center justify-center p-6 text-center">
                        <div className="text-6xl mb-4">🕯️</div>
                        <p className="text-rose-900 font-dancing text-4xl md:text-6xl italic">Reveal the vision...</p>
                    </div>
                </ScratchCard>
            </div>
          </div>
        )}

        {state === AppState.ENVELOPE && (
          <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md md:max-w-2xl flex justify-center">
              {isEnvelopeOpen && (
                <div className="absolute inset-0 z-[110] pointer-events-none">
                  {displayPhotos.map((url, i) => (
                    <img 
                      key={i} 
                      src={url} 
                      className={`absolute w-32 h-32 md:w-56 md:h-56 object-cover border-4 border-white shadow-2xl animate-photo-fly-out-${i}`}
                      style={{ 
                        left: '50%', top: '50%', 
                        marginLeft: '-16px', marginTop: '-16px',
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              )}

              <div 
                onClick={openEnvelope}
                className={`group relative w-full aspect-[3/2] max-w-sm md:max-w-md cursor-pointer transition-all duration-1000 transform ${isEnvelopeOpen ? 'scale-150 opacity-0 -translate-y-[100vh]' : 'hover:scale-105 active:scale-95'}`}
              >
                <div className="absolute inset-0 bg-[#fdfcf8] rounded-[2.5rem] shadow-[0_40px_120px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 border-[1.5rem] border-rose-950/5 pointer-events-none"></div>
                  
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-rose-900 rounded-full flex items-center justify-center text-white text-4xl md:text-5xl shadow-xl border-4 border-white transform transition-transform group-hover:scale-110 duration-700">
                    🌹
                  </div>
                  <h2 className="mt-6 font-dancing text-rose-950 text-4xl md:text-6xl font-black">For {data.recipientName}</h2>
                  <p className="mt-2 text-[10px] md:text-xs uppercase tracking-[0.5em] text-slate-400 font-black">Open Invitation</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {state === AppState.STORY && (
          <div ref={storyRef} className="relative w-full">
            <div className="fixed top-0 left-0 h-1 md:h-2 bg-rose-900 z-[100] transition-all duration-300" style={{ width: `${scrollProgress * 100}%` }}></div>
            
            <div className="h-screen flex flex-col items-center justify-center text-center p-6">
                <h1 className="text-6xl md:text-[11rem] font-dancing text-rose-900 mb-8 px-4 leading-tight drop-shadow-sm">Dear {data.recipientName}</h1>
                <p className="text-slate-400 uppercase tracking-[0.8em] font-black text-xs">Swipe through our memories</p>
                <div className="mt-20 animate-bounce text-rose-200 text-5xl opacity-40">↓</div>
            </div>

            {displayPhotos.map((url, i) => (
                <StorySection 
                  key={i} 
                  index={i} 
                  photo={url} 
                  quote={data.quotes[i] || LOVE_QUOTES[i % LOVE_QUOTES.length]} 
                />
            ))}

            <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 md:p-20 bg-white border-t border-slate-50">
                <div className="max-w-4xl w-full space-y-16 py-32">
                    <p className="text-4xl md:text-8xl font-dancing text-rose-950 leading-tight italic px-4">
                        "{data.message}"
                    </p>
                    <div className="pt-20 border-t border-slate-100 flex flex-col items-center">
                        <p className="text-slate-400 font-black tracking-[0.5em] uppercase text-xs mb-6">Established On</p>
                        <p className="text-5xl md:text-8xl font-playfair tracking-tight text-rose-900">
                          {new Date(data.specialDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="h-[40vh] flex flex-col items-center justify-center p-8 bg-slate-50">
                 <button 
                  onClick={() => { window.history.replaceState({}, '', window.location.origin + window.location.pathname); window.location.reload(); }} 
                  className="px-14 py-6 bg-rose-900 text-white rounded-full text-[11px] font-black uppercase tracking-[0.6em] transition-all shadow-2xl active:scale-95"
                 >
                   Create New Experience
                 </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes butterfly-fly {
          0% { opacity: 0; transform: translateY(0) scale(0.5) rotate(0); }
          20% { opacity: 0.6; }
          100% { opacity: 0; transform: translateY(-500px) scale(2) rotate(45deg); }
        }
        .animate-butterfly-fly { animation: butterfly-fly 2s forwards ease-out; }

        @keyframes photo-out-0 { 0% { transform: translate(-50%,-50%) rotate(0) scale(1); opacity: 1; } 100% { transform: translate(-300%, -400%) rotate(-10deg) scale(0); opacity: 0; } }
        @keyframes photo-out-1 { 0% { transform: translate(-50%,-50%) rotate(0) scale(1); opacity: 1; } 100% { transform: translate(300%, -350%) rotate(10deg) scale(0); opacity: 0; } }
        @keyframes photo-out-2 { 0% { transform: translate(-50%,-50%) rotate(0) scale(1); opacity: 1; } 100% { transform: translate(-400%, 100%) rotate(-20deg) scale(0); opacity: 0; } }
        @keyframes photo-out-3 { 0% { transform: translate(-50%,-50%) rotate(0) scale(1); opacity: 1; } 100% { transform: translate(400%, 200%) rotate(20deg) scale(0); opacity: 0; } }
        @keyframes photo-out-4 { 0% { transform: translate(-50%,-50%) rotate(0) scale(1); opacity: 1; } 100% { transform: translate(0%, 500%) rotate(-5deg) scale(0); opacity: 0; } }

        .animate-photo-fly-out-0 { animation: photo-out-0 2.5s forwards ease-in-out; }
        .animate-photo-fly-out-1 { animation: photo-out-1 2.5s forwards ease-in-out; }
        .animate-photo-fly-out-2 { animation: photo-out-2 2.5s forwards ease-in-out; }
        .animate-photo-fly-out-3 { animation: photo-out-3 2.5s forwards ease-in-out; }
        .animate-photo-fly-out-4 { animation: photo-out-4 2.5s forwards ease-in-out; }

        ::-webkit-scrollbar { width: 0px; background: transparent; }
        * { scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;