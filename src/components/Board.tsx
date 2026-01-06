"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import VisionCard from "./VisionCard";
import HelpModal from "./HelpModal"; // <--- Imported HelpModal
import { CardData } from "@/types/board";
// Added 'X' to imports below
import { Plus, History, CheckCircle2, CloudOff, CloudLightning, LogIn, User, X } from "lucide-react";
import { saveState, loadCurrentState, getHistory, HistoryPoint } from "@/utils/history";
import { motion, AnimatePresence } from "framer-motion";

export default function Board() {
  const { data: session, status } = useSession(); 
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Auto-Save States
  const [lastSaved, setLastSaved] = useState<string>("Not saved");
  const [historyList, setHistoryList] = useState<HistoryPoint[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Nudge States
  const [showLoginNudge, setShowLoginNudge] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState("");

  const lastSavedString = useRef<string>("");

  // --- 1. INITIAL LOAD & FIRST VISIT CHECK ---
  useEffect(() => {
    const saved = loadCurrentState();
    if (saved && saved.length > 0) {
      setCards(saved);
      setLastSaved("Restored");
      lastSavedString.current = JSON.stringify(saved);
    } else {
        setCards([{
            id: "1", type: "text", x: window.innerWidth/2 - 140, y: window.innerHeight/2 - 190, 
            width: 280, height: 380, rotation: -2, isFlipped: false,
            content: { frontText: "Soft Power", style: { opacity: 1, fontSize: 32, fontFamily: 'font-serif', fontWeight: 'normal', fontStyle: 'italic', textColor: '#292524' }, backReflection: { identity: "", practice: "" } },
        }]);
    }
    setHistoryList(getHistory());
    setIsLoaded(true);

    // FIRST VISIT NUDGE
    if (status === "unauthenticated") {
        const timer = setTimeout(() => {
            setShowLoginNudge(true);
            setNudgeMessage("Log in to sync your vision across devices.");
        }, 2000);
        return () => clearTimeout(timer);
    }
  }, [status]);

  // --- 2. AUTO-SAVE INTERVAL ---
  useEffect(() => {
    if (!isLoaded) return;

    const interval = setInterval(() => {
        const currentString = JSON.stringify(cards);
        
        if (currentString !== lastSavedString.current) {
            const time = saveState(cards); 
            if (time) {
                setLastSaved(time);
                setHistoryList(getHistory());
                lastSavedString.current = currentString;
                
                // RECURRING NUDGE
                if (status === "unauthenticated") {
                    setNudgeMessage("Saved to local cache only. Log in to protect your data.");
                    setShowLoginNudge(true);
                    setTimeout(() => setShowLoginNudge(false), 5000);
                }
            }
        }
    }, 30000); 

    return () => clearInterval(interval);
  }, [cards, isLoaded, status]);

  // --- ACTIONS ---
  const restoreCheckpoint = (point: HistoryPoint) => {
      if (confirm(`Restore board state from ${point.timestamp}? Unsaved changes will be lost.`)) {
          setCards(point.cards);
          setLastSaved(`Restored: ${point.timestamp}`);
          lastSavedString.current = JSON.stringify(point.cards);
          setShowHistory(false);
      }
  };

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
                <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-xs text-stone-400 hover:text-stone-600 transition-colors bg-white/50 px-2 py-1 rounded-md border border-transparent hover:border-stone-200">
                    {lastSaved.includes("Restored") ? <History size={12} /> : status === "authenticated" ? <CloudLightning size={12} className="text-blue-500"/> : <CheckCircle2 size={12} className="text-green-500" />}
                    <span>{lastSaved.includes("Restored") ? lastSaved : `Saved at ${lastSaved}`}</span>
                </button>
                {showHistory && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-stone-100 overflow-hidden flex flex-col z-[60]">
                        <div className="px-3 py-2 bg-stone-50 border-b border-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-500">Saved History</div>
                        <div className="max-h-48 overflow-y-auto">
                            {historyList.map((point) => (
                                <button key={point.id} onClick={() => restoreCheckpoint(point)} className="w-full text-left px-3 py-2 text-xs text-stone-600 hover:bg-blue-50 hover:text-blue-600 flex justify-between border-b border-stone-50 last:border-0">
                                    <span>{point.timestamp}</span><span className="text-[10px] text-stone-400">{point.cards.length} cards</span>
                                </button>
                            ))}
                            {historyList.length === 0 && <div className="px-3 py-2 text-xs text-stone-400 italic">No history yet</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {/* RIGHT: Auth & Actions */}
        <div className="pointer-events-auto flex gap-3 items-center">
            
            {/* NEW: Guide Button */}
            <HelpModal />

            {/* LOGIN AREA WITH NUDGE POPUP */}
            <div className="relative">
                {status === "authenticated" ? (
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-full shadow-sm">
                         {session.user?.image ? (
                             <img src={session.user.image} alt="User" className="w-5 h-5 rounded-full" />
                         ) : <User size={14} className="text-stone-600"/>}
                         <span className="text-xs font-medium text-stone-600">Hi, {session.user?.name?.split(' ')[0]}</span>
                         <button onClick={() => signOut()} className="ml-2 text-[10px] text-stone-400 hover:text-red-500 font-bold uppercase">Log Out</button>
                     </div>
                ) : (
                    <button 
                        onClick={() => signIn('google')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-stone-600 text-xs font-bold hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm"
                    >
                        <LogIn size={14} /> Log in with Google
                    </button>
                )}

                <AnimatePresence>
                    {showLoginNudge && status === "unauthenticated" && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, x: 10 }}
                            animate={{ opacity: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-12 right-0 w-64 bg-stone-800 text-white p-3 rounded-xl shadow-xl z-[70] arrow-box"
                        >
                            <div className="absolute -top-1.5 right-6 w-3 h-3 bg-stone-800 rotate-45" />
                            <div className="flex gap-3 items-start relative z-10">
                                <div className="p-1.5 bg-stone-700 rounded-lg shrink-0">
                                    <CloudOff size={16} className="text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium leading-relaxed opacity-90">
                                        {nudgeMessage}
                                    </p>
                                    <button onClick={() => signIn('google')} className="mt-2 text-[10px] font-bold uppercase tracking-wider text-blue-300 hover:text-blue-200">Connect Google &rarr;</button>
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

      {/* Render Cards */}
      {cards.map((card) => (
        <VisionCard 
            key={card.id} card={card} isSelected={selectedId === card.id}
            updateCard={updateCard} onDelete={deleteCard}
            onSelect={(e) => { e.stopPropagation(); setSelectedId(card.id); }}
        />
      ))}
    </div>
  );
}