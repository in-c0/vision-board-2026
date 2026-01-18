"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import VisionCard from "./VisionCard";
import HelpModal from "./HelpModal";
import OnboardingModal from "./OnboardingModal"; 
import { CardData } from "@/types/board";
import { Plus, Loader2, Cloud, CloudOff, X, User, LogIn, Minus, History } from "lucide-react"; 
import { motion, AnimatePresence } from "framer-motion";

interface HistoryPoint {
  id: string; 
  createdAt: string;
  content: any;
}

export default function Board() {
  const { data: session, status } = useSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Viewport
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);

  // Sync & History States
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [historyList, setHistoryList] = useState<HistoryPoint[]>([]); 
  const [showHistory, setShowHistory] = useState(false);
  const [showLoginNudge, setShowLoginNudge] = useState(false);

  const lastSavedString = useRef<string>("");

  const formatDate = (dateStr: string | Date) => {
      return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  // --- 1. PAN & ZOOM ---
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        const scaleChange = delta > 0 ? 1.1 : 0.9;
        const newScale = Math.min(Math.max(0.1, view.scale * scaleChange), 5); 
        setView(prev => ({ ...prev, scale: newScale }));
    } 
  };
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        e.preventDefault(); isPanning.current = true;
    }
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning.current) {
        setView(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
  };
  const handlePointerUp = () => { isPanning.current = false; };
  const zoomIn = () => setView(p => ({ ...p, scale: Math.min(p.scale * 1.2, 5) }));
  const zoomOut = () => setView(p => ({ ...p, scale: Math.max(p.scale * 0.8, 0.1) }));

  // --- 2. CLOUD SAVE LOGIC ---
  const triggerSave = useCallback(async () => {
    if (status !== "authenticated") {
        setSaveStatus("unsaved");
        setShowLoginNudge(true);
        return;
    }
    if (saveStatus === "saving") return; 

    setSaveStatus("saving");
    try {
        const res = await fetch("/api/board/sync", { method: "POST", body: JSON.stringify({ cards }) });
        const data = await res.json();
        if (res.ok) {
            setSaveStatus("saved");
            setLastSavedTime(formatDate(data.updatedAt));
            lastSavedString.current = JSON.stringify(cards);
            if (data.history) setHistoryList(data.history);
        } else throw new Error();
    } catch (e) { 
        setSaveStatus("error"); 
    }
  }, [cards, status, saveStatus]);

  // --- 3. EFFECTS ---
  useEffect(() => {
    const interval = setInterval(() => {
        const currentString = JSON.stringify(cards);
        if (currentString !== lastSavedString.current) triggerSave();
    }, 30000); 
    return () => clearInterval(interval);
  }, [cards, triggerSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); triggerSave(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSave]);

  useEffect(() => {
    async function initBoard() {
      if (status === "authenticated") {
        try {
            const res = await fetch("/api/board/sync");
            if (res.ok) {
                const data = await res.json();
                if (data.cards && Array.isArray(data.cards)) {
                    setCards(data.cards);
                    lastSavedString.current = JSON.stringify(data.cards);
                    setSaveStatus("saved");
                    setLastSavedTime(formatDate(data.updatedAt));
                }
                if (data.history) setHistoryList(data.history);
            }
        } catch (e) { console.error(e); }
      }
      setIsLoaded(true);
    }
    if (status !== "loading") initBoard();
  }, [status]);


  // Actions
  const findSmartPosition = () => {
      if (typeof window === 'undefined') return { x: 0, y: 0 };
      const screenCx = (window.innerWidth / 2 - view.x) / view.scale;
      const screenCy = (window.innerHeight / 2 - view.y) / view.scale;
      if (cards.length === 0) return { x: screenCx - 140, y: screenCy - 190 };
      return { x: (screenCx - 140) + (Math.random() - 0.5) * 100, y: (screenCy - 190) + (Math.random() - 0.5) * 100 };
  };

  const addCard = () => {
    const { x, y } = findSmartPosition();
    const newCard: CardData = {
      id: Math.random().toString(36).substr(2, 9), type: "text", x, y, width: 280, height: 380, rotation: (Math.random() - 0.5) * 16, 
      content: { frontText: "New Intention", backReflection: { identity: "", practice: "" }, style: { opacity: 1, fontSize: 32, fontFamily: 'font-serif', fontWeight: 'normal', fontStyle: 'italic', textColor: '#292524' } }, isFlipped: false,
    };
    setCards([...cards, newCard]);
    setSelectedId(newCard.id);
    if (status !== "authenticated") setSaveStatus("unsaved");
  };
  
  const updateCard = (id: string, newData: Partial<CardData>) => {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...newData } : c)));
      if (status !== "authenticated") setSaveStatus("unsaved");
  };

  const deleteCard = (id: string) => {
      setCards((prev) => prev.filter(c => c.id !== id));
      if (status !== "authenticated") setSaveStatus("unsaved");
  };
  
  const restoreCheckpoint = (point: HistoryPoint) => {
      if (confirm(`Revert board to ${formatDate(point.createdAt)}? Unsaved changes will be lost.`)) {
          const restoredCards = Array.isArray(point.content) ? point.content as CardData[] : [];
          setCards(restoredCards);
          lastSavedString.current = JSON.stringify(restoredCards);
          setShowHistory(false);
          triggerSave(); 
      }
  };

  // NEW LOADING SCREEN WITH LOGO
  if (!isLoaded) return (
    <div className="w-full h-screen bg-[#F9F8F6] flex flex-col items-center justify-center gap-6">
        {/* LOGO: Ensure 'logo.png' is in your /public folder */}
        <motion.img 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            src="/logo.png" 
            alt="ViBo Logo" 
            className="w-200 h-200 object-contain"
        />
        <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-stone-300" />
            <p className="text-xs font-medium text-stone-400 animate-pulse tracking-widest uppercase">Initializing ViBo...</p>
        </div>
    </div>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F9F8F6] cursor-crosshair touch-none" 
        onPointerDown={(e) => { handlePointerDown(e); setSelectedId(null); }}
        onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onWheel={handleWheel}
    >
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none origin-top-left" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px', transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} />

      <motion.div className="absolute top-0 left-0 w-full h-full origin-top-left" style={{ x: view.x, y: view.y, scale: view.scale }} transition={{ type: "tween", ease: "linear", duration: 0 }}>
          {cards.map((card) => (
            <VisionCard key={card.id} card={card} isSelected={selectedId === card.id} updateCard={updateCard} onDelete={deleteCard} onSelect={(e) => { e.stopPropagation(); setSelectedId(card.id); }} />
          ))}
      </motion.div>

      {/* GUEST BANNER */}
      <AnimatePresence>
        {status === "unauthenticated" && (
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-stone-900/90 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur flex items-center gap-3"
            >
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-xs font-medium">Guest Mode: Data not saved</span>
                <button onClick={() => signIn('google')} className="text-xs font-bold underline hover:text-orange-200">Log In</button>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-6 left-6 flex gap-2 z-50">
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
            <button onClick={zoomIn} className="p-2 hover:bg-stone-50 text-stone-600 border-b border-stone-100"><Plus size={16}/></button>
            <button onClick={zoomOut} className="p-2 hover:bg-stone-50 text-stone-600"><Minus size={16}/></button>
        </div>
        <div className="bg-white/80 backdrop-blur border border-stone-200 rounded-lg px-3 flex items-center text-xs font-mono font-bold text-stone-500 shadow-sm">{Math.round(view.scale * 100)}%</div>
      </div>

      <OnboardingModal />

      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none select-none">
        <div className="pointer-events-auto flex flex-col items-start gap-1">
            {/* UPDATED TITLE */}
            <h1 className="text-xl font-serif text-stone-800 tracking-tight font-bold">ViBo</h1>
            
            <div className="relative flex gap-1">
                <button onClick={triggerSave} className={`flex items-center gap-2 text-xs transition-all bg-white/50 px-2 py-1.5 rounded-l-md border border-stone-200/50 hover:bg-white hover:border-stone-300 ${status === 'unauthenticated' ? 'opacity-70' : ''}`}>
                    {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin text-blue-500"/>}
                    {saveStatus === 'saved' && <Cloud size={12} className="text-blue-500"/>}
                    {saveStatus === 'unsaved' && <CloudOff size={12} className="text-orange-400"/>}
                    {saveStatus === 'error' && <X size={12} className="text-red-500"/>}
                    <span className="font-medium">{status === 'unauthenticated' ? "Guest (Local)" : saveStatus === 'saving' ? "Saving..." : saveStatus === 'unsaved' ? "Unsaved" : `Saved ${lastSavedTime}`}</span>
                </button>
                <button onClick={() => setShowHistory(!showHistory)} className="bg-white/50 px-1.5 py-1.5 rounded-r-md border border-l-0 border-stone-200/50 hover:bg-white hover:border-stone-300 text-stone-500 hover:text-stone-800">
                    <History size={12} />
                </button>

                {showHistory && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-stone-100 overflow-hidden flex flex-col z-[60]">
                        <div className="px-3 py-2 bg-stone-50 border-b border-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-500 flex justify-between">
                            <span>Cloud History</span>
                            <span className="text-stone-400">{historyList.length}/20</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {status !== 'authenticated' && <div className="p-4 text-center text-xs text-stone-500">Log in to view history</div>}
                            {status === 'authenticated' && historyList.length === 0 && <div className="p-4 text-center text-xs text-stone-400 italic">No history yet</div>}
                            {status === 'authenticated' && historyList.map((point) => (
                                <button key={point.id} onClick={() => restoreCheckpoint(point)} className="w-full text-left px-3 py-2.5 text-xs text-stone-600 hover:bg-blue-50 hover:text-blue-600 flex justify-between border-b border-stone-50 last:border-0 group">
                                    <span className="font-medium group-hover:translate-x-1 transition-transform">{formatDate(point.createdAt)}</span>
                                    <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
                                        {Array.isArray(point.content) ? point.content.length : 0} items
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        <div className="pointer-events-auto flex gap-3 items-center">
            <HelpModal />
            <div className="relative">
                {status === "authenticated" ? (
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-full shadow-sm">
                         {session.user?.image ? <img src={session.user.image} alt="User" className="w-5 h-5 rounded-full" /> : <User size={14} className="text-stone-600"/>}
                         <span className="text-xs font-medium text-stone-600">{session.user?.name?.split(' ')[0]}</span>
                         <button onClick={() => signOut()} className="ml-2 text-[10px] text-stone-400 hover:text-red-500 font-bold uppercase">Log Out</button>
                     </div>
                ) : (
                    <button onClick={() => signIn('google')} className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-stone-600 text-xs font-bold hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm"><LogIn size={14} /> Log in</button>
                )}
                <AnimatePresence>
                    {showLoginNudge && status === "unauthenticated" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-12 left-0 w-64 bg-stone-800 text-white p-4 rounded-xl shadow-xl z-[70]">
                            <div className="absolute -top-1.5 left-6 w-3 h-3 bg-stone-800 rotate-45" />
                            <div className="flex gap-3 items-start">
                                <div className="p-1.5 bg-stone-700 rounded-lg shrink-0"><CloudOff size={16} className="text-orange-400" /></div>
                                <div className="flex flex-col gap-2">
                                    <p className="text-xs font-bold">Cloud Sync Required</p>
                                    <p className="text-[11px] opacity-80 leading-relaxed">Changes saved locally. Log in to sync across devices.</p>
                                    <button onClick={() => signIn('google')} className="mt-1 text-xs bg-white text-stone-900 font-bold py-1.5 px-3 rounded hover:bg-stone-200 transition-colors">Log In / Sign Up</button>
                                </div>
                                <button onClick={() => setShowLoginNudge(false)} className="text-stone-500 hover:text-white"><X size={12} /></button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="h-6 w-px bg-stone-200 mx-1"></div>
            <button onClick={addCard} className="flex items-center gap-2 bg-stone-900 text-stone-50 px-4 py-2 rounded-full shadow-lg hover:scale-105 transition-transform">
                <Plus size={16} /> <span className="text-sm font-medium">Add</span>
            </button>
        </div>
      </div>
    </div>
  );
}