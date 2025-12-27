"use client";

import { useState } from "react";
import VisionCard from "./VisionCard";
import { CardData } from "@/types/board";
import { Plus } from "lucide-react";

export default function Board() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [cards, setCards] = useState<CardData[]>([
    {
      id: "1",
      type: "text",
      x: 100,
      y: 100,
      width: 280,   // Standard width
      height: 380,  // Standard height
      rotation: -2,
      content: {
        frontText: "Soft Power",
        backReflection: { identity: "", practice: "" },
        // Add defaults:
        style: {
            opacity: 1,
            fontSize: 32,
            fontFamily: 'font-serif',
            fontWeight: 'normal',
            fontStyle: 'italic',
            textColor: '#292524' // stone-800
        }
      },
      isFlipped: false,
    },
    // ... add more initial cards if desired
  ]);

  const addCard = () => {
      const newCard: CardData = {
      id: Math.random().toString(36).substr(2, 9),
      type: "text",
      // Use window center as spawn point
      x: window.innerWidth / 2, 
      y: window.innerHeight / 2,
      width: 280,
      height: 380,
      rotation: (Math.random() - 0.5) * 3, // Subtle random rotation
      content: {
        frontText: "New Intention",
        backReflection: { identity: "", practice: "" },
        style: {
            opacity: 1,
            fontSize: 32,
            fontFamily: 'font-serif',
            fontWeight: 'normal',
            fontStyle: 'italic',
            textColor: '#292524'
        }
      },
      isFlipped: false,
    };
    setCards([...cards, newCard]);
    setSelectedId(newCard.id); // Auto-select new card
  };

  const updateCard = (id: string, newData: Partial<CardData>) => {
    setCards(cards.map((c) => (c.id === id ? { ...c, ...newData } : c)));
  };
  const deleteCard = (id: string) => {
      setCards(cards.filter(c => c.id !== id));
    };

    
  return (
    <div 
        className="relative w-full h-screen overflow-hidden bg-[#F9F8F6]"
        // Click background to deselect
        onPointerDown={() => setSelectedId(null)} 
    >
      <div className="absolute inset-0 opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-xl font-serif text-stone-800 tracking-tight">2026 Vision</h1>
        </div>
        
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
          onDelete={deleteCard} // <--- Pass this
          onSelect={(e) => {
              e.stopPropagation();
              setSelectedId(card.id);
          }}
      />
      ))}
    </div>
  );
}