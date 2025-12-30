"use client";

import { useState, useEffect, useRef } from "react";
import VisionCard from "./VisionCard";
import { CardData } from "@/types/board";
import { Plus, History, CheckCircle2, Clock } from "lucide-react";
import { saveState, loadCurrentState, getHistory, HistoryPoint } from "@/utils/history";

export default function Board() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Auto-Save States
  const [lastSaved, setLastSaved] = useState<string>("Not saved");
  const [historyList, setHistoryList] = useState<HistoryPoint[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // We use a ref to track what is currently in storage to prevent duplicate saves
  const lastSavedString = useRef<string>("");

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    const saved = loadCurrentState();
    if (saved && saved.length > 0) {
      setCards(saved);
      setLastSaved("Restored");
      lastSavedString.current = JSON.stringify(saved);
    } else {
        // Default Start State
        setCards([
            {
                id: "1", type: "text", x: window.innerWidth/2 - 140, y: window.innerHeight/2 - 190, 
                width: 280, height: 380, rotation: -2, isFlipped: false,
                content: { 
                    frontText: "Soft Power", 
                    style: { opacity: 1, fontSize: 32, fontFamily: 'font-serif', fontWeight: 'normal', fontStyle: 'italic', textColor: '#292524' },
                    backReflection: { identity: "", practice: "" } 
                },
            }
        ]);
    }
    setHistoryList(getHistory());
    setIsLoaded(true);
  }, []);

  // --- 2. AUTO-SAVE INTERVAL (30s) ---
  useEffect(() => {
    if (!isLoaded) return;

    const interval = setInterval(() => {
        const currentString = JSON.stringify(cards);
        
        // Only save if metadata has changed since last save
        if (currentString !== lastSavedString.current) {
            const time = saveState(cards);
            if (time) {
                setLastSaved(time);
                setHistoryList(getHistory()); // Update dropdown list
                lastSavedString.current = currentString;
                console.log("Auto-saved at", time);
            }
        }
    }, 30000); // 30 Seconds

    return () => clearInterval(interval);
  }, [cards, isLoaded]);

  // --- 3. MANUAL RESTORE ---
  const restoreCheckpoint = (point: HistoryPoint) => {
      if (confirm(`Restore board state from ${point.timestamp}? Unsaved changes will be lost.`)) {
          setCards(point.cards);
          setLastSaved(`Restored: ${point.timestamp}`);
          lastSavedString.current = JSON.stringify(point.cards); // Prevent immediate re-save
          setShowHistory(false);
      }
  };

  // --- 4. BOARD ACTIONS ---
  const addCard = () => {
    const newCard: CardData = {
      id: Math.random().toString(36).substr(2, 9),
      type: "text",
      x: window.innerWidth / 2 - 140, 
      y: window.innerHeight / 2 - 190,
      width: 280,
      height: 380,
      rotation: (Math.random() - 0.5) * 6,
      content: {
        frontText: "New Intention",
        backReflection: { identity: "", practice: "" },
        style: { opacity: 1, fontSize: 32, fontFamily: 'font-serif', fontWeight: 'normal', fontStyle: 'italic', textColor: '#292524' },
      },
      isFlipped: false,
    };
    setCards([...cards, newCard]);
    setSelectedId(newCard.id);
  };

  const updateCard = (id: string, newData: Partial<CardData>) => {
    setCards((prevCards) => prevCards.map((c) => (c.id === id ? { ...c, ...newData } : c)));
  };

  const deleteCard = (id: string) => {
    setCards((prevCards) => prevCards.filter(c => c.id !== id));
  };

  if (!isLoaded) return <div className="w-full h-screen bg-[#F9F8F6]" />;

  return (
    <div 
        className="relative w-full h-screen overflow-hidden bg-[#F9F8F6]"
        onPointerDown={() => setSelectedId(null)} 
    >
      <div className="absolute inset-0 opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* --- TOP BAR (AUTO SAVE UI) --- */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none select-none">
        
        {/* Left Side: Save Status & History */}
        <div className="pointer-events-auto flex flex-col items-start gap-1">
            <h1 className="text-xl font-serif text-stone-800 tracking-tight">2026 Vision</h1>
            
            <div className="relative">
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-xs text-stone-400 hover:text-stone-600 transition-colors bg-white/50 px-2 py-1 rounded-md border border-transparent hover:border-stone-200"
                >
                    {lastSaved.includes("Restored") ? <History size={12} /> : <CheckCircle2 size={12} className="text-green-500" />}
                    <span>{lastSaved.includes("Restored") ? lastSaved : `Saved at ${lastSaved}`}</span>
                </button>

                {/* History Dropdown */}
                {showHistory && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-stone-100 overflow-hidden flex flex-col z-[60]">
                        <div className="px-3 py-2 bg-stone-50 border-b border-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Saved History
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                            {historyList.map((point) => (
                                <button
                                    key={point.id}
                                    onClick={() => restoreCheckpoint(point)}
                                    className="w-full text-left px-3 py-2 text-xs text-stone-600 hover:bg-blue-50 hover:text-blue-600 flex justify-between border-b border-stone-50 last:border-0"
                                >
                                    <span>{point.timestamp}</span>
                                    <span className="text-[10px] text-stone-400">{point.cards.length} cards</span>
                                </button>
                            ))}
                            {historyList.length === 0 && (
                                <div className="px-3 py-2 text-xs text-stone-400 italic">No history yet</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {/* Right Side: Actions */}
        <div className="pointer-events-auto">
            <button 
                onClick={addCard}
                className="flex items-center gap-2 bg-stone-900 text-stone-50 px-4 py-2 rounded-full shadow-lg hover:scale-105 transition-transform"
            >
                <Plus size={16} />
                <span className="text-sm font-medium">Add</span>
            </button>
        </div>
      </div>

      {/* Render Cards */}
      {cards.map((card) => (
        <VisionCard 
            key={card.id} 
            card={card} 
            isSelected={selectedId === card.id}
            updateCard={updateCard} 
            onDelete={deleteCard}
            onSelect={(e) => {
                e.stopPropagation(); 
                setSelectedId(card.id);
            }}
        />
      ))}
    </div>
  );
}