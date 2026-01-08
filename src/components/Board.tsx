"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import VisionCard from "./VisionCard";
import HelpModal from "./HelpModal";
import { CardData } from "@/types/board";
import { Plus, History, CheckCircle2, Cloud, CloudOff, LogIn, User, X, Loader2 } from "lucide-react";
import { saveState, loadCurrentState, getHistory, HistoryPoint } from "@/utils/history";
import { motion, AnimatePresence } from "framer-motion";

export default function Board() {
  const { data: session, status } = useSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Sync States
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "local" | "error">("local");
  const [lastSavedTime, setLastSavedTime] = useState<string>("Not saved");
  
  // History & Nudge
  const [historyList, setHistoryList] = useState<HistoryPoint[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showLoginNudge, setShowLoginNudge] = useState(false);

  const lastSavedString = useRef<string>("");

  // Helper: Format Date
  const formatDate = (timestamp: number | string | Date) => {
      return new Date(timestamp).toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit' 
      });
  };

  // --- 1. THE REUSABLE SAVE FUNCTION ---
  const triggerSave = useCallback(async () => {
    setSaveStatus("saving");
    
    // PATH A: CLOUD SAVE
    if (status === "authenticated") {
        try {
            const res = await fetch("/api/board/sync", {
                method: "POST",
                body: JSON.stringify({ cards }),
            });
            const data = await res.json();
            
            if (res.ok) {
                setSaveStatus("saved");
                setLastSavedTime(formatDate(data.updatedAt));
                lastSavedString.current = JSON.stringify(cards);

                // *** FIX: MIRROR TO LOCAL HISTORY ***
                // Even though we saved to Cloud, we save a local snapshot 
                // so the History Dropdown stays populated.
                saveState(cards); 
                setHistoryList(getHistory()); 
            } else {
                throw new Error();
            }
        } catch (e) {
            setSaveStatus("error");
        }
    } 
    // PATH B: LOCAL SAVE
    else {
        await new Promise(r => setTimeout(r, 500)); 
        const time = saveState(cards); 
        
        if (time) {
            setLastSavedTime(formatDate(Date.now()));
            setHistoryList(getHistory());
            lastSavedString.current = JSON.stringify(cards);
            setSaveStatus("local");
            
            setShowLoginNudge(true);
            setTimeout(() => setShowLoginNudge(false), 5000);
        }
    }
  }, [cards, status]);

  // --- 2. KEYBOARD SHORTCUT (Ctrl + S) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); 
        triggerSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSave]);

  // --- 3. AUTO-SAVE INTERVAL ---
  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
        const currentString = JSON.stringify(cards);
        if (currentString !== lastSavedString.current) {
            triggerSave();
        }
    }, 30000); 
    return () => clearInterval(interval);
  }, [cards, isLoaded, triggerSave]);

  // --- 4. INITIAL LOAD ---
  useEffect(() => {
    async function initBoard() {
      // 1. Load Local
      const local = loadCurrentState();
      if (local && local.length > 0) {
        setCards(local);
        setLastSavedTime("Restored Local");
        lastSavedString.current = JSON.stringify(local);
      }

      // 2. Load Cloud (and overwrite if exists)
      if (status === "authenticated") {
        setSaveStatus("saving");
        try {
            const res = await fetch("/api/board/sync");
            const data = await res.json();
            if (data.cards && Array.isArray(data.cards) && data.cards.length > 0) {
                setCards(data.cards);
                lastSavedString.current = JSON.stringify(data.cards);
                setSaveStatus("saved");
                setLastSavedTime(formatDate(data.updatedAt));
                
                // Populate local history with cloud data on load
                saveState(data.cards);
            }
        } catch (e) { console.error("Cloud load failed", e); setSaveStatus("error"); }
      } else {
         setTimeout(() => setShowLoginNudge(true), 2000);
      }
      
      // 3. Hydrate History List
      setHistoryList(getHistory());
      setIsLoaded(true);
    }
    if (status !== "loading") initBoard();
  }, [status]);

  // Actions
  const addCard = () => {
    const newCard: CardData = {
      id: Math.random().toString(36).substr(2, 9), type: "text",
      x: window.innerWidth / 2 - 140, y: window.innerHeight / 2 - 190,
      width: 280, height: 380, rotation: (Math.random() - 0.5) * 6,
      content: { frontText: "New Intention", backReflection: { identity: "", practice: "" }, style: { opacity: 1, fontSize: 32, fontFamily: 'font-serif', fontWeight: 'normal', fontStyle: 'italic', textColor: '#292524' } },
      isFlipped: false,
    };
    setCards([...cards, newCard]);
    setSelectedId(newCard.id);
  };
  const updateCard = (id: string, newData: Partial<CardData>) => setCards((prevCards) => prevCards.map((c) => (c.id === id ? { ...c, ...newData } : c)));
  const deleteCard = (id: string) => setCards((prevCards) => prevCards.filter(c => c.id !== id));
  const restoreCheckpoint = (point: HistoryPoint) => {
      const dateStr = formatDate(point.id);
      if (confirm(`Restore checkpoint from ${dateStr}?`)) {
          setCards(point.cards);
          lastSavedString.current = ""; 
          setShowHistory(false);
      }
  };

  if (!isLoaded) return <div className="w-full h-screen bg-[#F9F8F6]" />;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F9F8F6]" onPointerDown={() => setSelectedId(null)}>
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

      {/* --- TOP BAR --- */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none select-none">
        
        {/* LEFT: Save Status */}
        <div className="pointer-events-auto flex flex-col items-start gap-1">
            <h1 className="text-xl font-serif text-stone-800 tracking-tight">2026 Vision</h1>
            <div className="relative">
                <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-700 transition-colors bg-white/50 px-2 py-1 rounded-md border border-stone-200/50 hover:border-stone-300 min-w-[140px]">
                    {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin text-blue-500"/>}
                    {saveStatus === 'saved' && <Cloud size={12} className="text-blue-500"/>}
                    {saveStatus === 'local' && <CloudOff size={12} className="text-orange-400"/>}
                    {saveStatus === 'error' && <X size={12} className="text-red-500"/>}
                    
                    <span className="font-medium">
                        {saveStatus === 'saving' ? "Saving..." : lastSavedTime.includes("Restored") ? lastSavedTime : `Saved ${lastSavedTime}`}
                    </span>
                </button>
                {/* Local History Dropdown */}
                {showHistory && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-stone-100 overflow-hidden flex flex-col z-[60]">
                        <div className="px-3 py-2 bg-stone-50 border-b border-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-500">Session History (Backups)</div>
                        <div className="max-h-48 overflow-y-auto">
                            {historyList.map((point) => (
                                <button key={point.id} onClick={() => restoreCheckpoint(point)} className="w-full text-left px-3 py-2 text-xs text-stone-600 hover:bg-blue-50 hover:text-blue-600 flex justify-between border-b border-stone-50 last:border-0">
                                    <span>{formatDate(point.id)}</span>
                                    <span className="text-[10px] text-stone-400">{point.cards.length} items</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {/* RIGHT: Auth & Actions */}
        <div className="pointer-events-auto flex gap-3 items-center">
            <HelpModal />
            <div className="relative">
                {status === "authenticated" ? (
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-full shadow-sm">
                         {session.user?.image ? (
                             <img src={session.user.image} alt="User" className="w-5 h-5 rounded-full" />
                         ) : <User size={14} className="text-stone-600"/>}
                         <span className="text-xs font-medium text-stone-600">{session.user?.name?.split(' ')[0]}</span>
                         <button onClick={() => signOut()} className="ml-2 text-[10px] text-stone-400 hover:text-red-500 font-bold uppercase">Log Out</button>
                     </div>
                ) : (
                    <button onClick={() => signIn('google')} className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-stone-600 text-xs font-bold hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm">
                        <LogIn size={14} /> Log in
                    </button>
                )}
                <AnimatePresence>
                    {showLoginNudge && status === "unauthenticated" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-12 right-0 w-64 bg-stone-800 text-white p-3 rounded-xl shadow-xl z-[70]">
                            <div className="absolute -top-1.5 right-6 w-3 h-3 bg-stone-800 rotate-45" />
                            <div className="flex gap-3 items-start">
                                <div className="p-1.5 bg-stone-700 rounded-lg shrink-0"><CloudOff size={16} className="text-orange-400" /></div>
                                <div><p className="text-xs font-medium opacity-90">Saving locally. Log in to sync.</p></div>
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

      {cards.map((card) => (
        <VisionCard key={card.id} card={card} isSelected={selectedId === card.id} updateCard={updateCard} onDelete={deleteCard} onSelect={(e) => { e.stopPropagation(); setSelectedId(card.id); }} />
      ))}
    </div>
  );
}