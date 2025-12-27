"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { CardData } from "@/types/board";
import { RefreshCw, RotateCw, Maximize2, Trash2, Type, Image as ImageIcon, MoreHorizontal, X } from "lucide-react";

interface VisionCardProps {
  card: CardData;
  isSelected: boolean;
  onSelect: (e: React.PointerEvent) => void;
  updateCard: (id: string, newData: Partial<CardData>) => void;
  onDelete: (id: string) => void; // New prop for deletion
}

export default function VisionCard({ card, isSelected, onSelect, updateCard, onDelete }: VisionCardProps) {
  const isInteracting = useRef(false);
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- SAFE DEFAULTS (Backwards compatibility) ---
  const style = card.content.style || {
    opacity: 1,
    fontSize: 32,
    fontFamily: 'font-serif',
    fontWeight: 'normal',
    fontStyle: 'italic',
    textColor: '#292524'
  };

  // --- EVENT HELPERS ---
  const toggleTextSelection = (allow: boolean) => {
    document.body.style.userSelect = allow ? 'auto' : 'none';
    document.body.style.cursor = allow ? 'auto' : 'grabbing';
  };

  const rotatePoint = (x: number, y: number, radians: number) => {
    return {
      x: x * Math.cos(radians) - y * Math.sin(radians),
      y: x * Math.sin(radians) + y * Math.cos(radians)
    };
  };

  // Close menu if clicking elsewhere
  useEffect(() => {
    const closeMenu = () => setShowMenu(false);
    if (showMenu) window.addEventListener('pointerdown', closeMenu);
    return () => window.removeEventListener('pointerdown', closeMenu);
  }, [showMenu]);

  // --- HANDLERS ---
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(true);
    // Auto-select the card on right click if not already
    // We cast the event because onSelect expects a PointerEvent, but this is safe here
    if (!isSelected) onSelect(e as unknown as React.PointerEvent);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateCard(card.id, { 
        type: 'image',
        content: { ...card.content, frontUrl: url } 
      });
    }
  };

  const updateStyle = (key: keyof typeof style, value: any) => {
    updateCard(card.id, {
        content: {
            ...card.content,
            style: { ...style, [key]: value }
        }
    });
  };

  // --- DRAG / ROTATE / RESIZE LOGIC (Kept exactly as fixed previously) ---
  const handleDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    onSelect(e);
    setShowMenu(false); // Close menu on drag
    
    isInteracting.current = true;
    toggleTextSelection(false); 
    
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startCardX = card.x;
    const startCardY = card.y;

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;
      updateCard(card.id, { x: startCardX + deltaX, y: startCardY + deltaY });
    };

    const onUp = () => {
      isInteracting.current = false;
      toggleTextSelection(true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // (Rotate and Resize handlers omitted for brevity - assume they are same as previous step)
  // ... Paste handleRotateStart and handleResizeStart here from previous code if needed ...
  // For the sake of this snippet, I will include the critical rotation/resize setup logic briefly:
  const handleRotateStart = (e: React.PointerEvent) => {
      e.stopPropagation();
      isInteracting.current = true;
      toggleTextSelection(false);
      const centerX = card.x;
      const centerY = card.y;
      const startMouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const startCardRotation = card.rotation;
      const onMove = (moveEvent: PointerEvent) => {
        const currentMouseAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
        updateCard(card.id, { rotation: startCardRotation + (currentMouseAngle - startMouseAngle) * (180/Math.PI) });
      };
      const onUp = () => { isInteracting.current = false; toggleTextSelection(true); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
  };

  const handleResizeStart = (e: React.PointerEvent) => {
      e.stopPropagation();
      isInteracting.current = true;
      toggleTextSelection(false);
      const startMouseX = e.clientX; const startMouseY = e.clientY;
      const startWidth = card.width; const startHeight = card.height;
      const startX = card.x; const startY = card.y;
      const rotationRad = card.rotation * (Math.PI / 180);
      const onMove = (moveEvent: PointerEvent) => {
          const globalDeltaX = moveEvent.clientX - startMouseX;
          const globalDeltaY = moveEvent.clientY - startMouseY;
          const localDelta = rotatePoint(globalDeltaX, globalDeltaY, -rotationRad);
          const newWidth = Math.max(150, startWidth + localDelta.x);
          const newHeight = Math.max(150, startHeight + localDelta.y);
          const widthGrowth = newWidth - startWidth;
          const heightGrowth = newHeight - startHeight;
          const localCenterShift = { x: widthGrowth / 2, y: heightGrowth / 2 };
          const globalCenterShift = rotatePoint(localCenterShift.x, localCenterShift.y, rotationRad);
          updateCard(card.id, { width: newWidth, height: newHeight, x: startX + globalCenterShift.x, y: startY + globalCenterShift.y });
      };
      const onUp = () => { setTimeout(() => isInteracting.current = false, 100); toggleTextSelection(true); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
      window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  };


  return (
    <>
    <motion.div
      style={{
        width: card.width,
        height: card.height,
        left: card.x,
        top: card.y,
        x: "-50%", 
        y: "-50%",
        rotate: card.rotation,
        zIndex: showMenu ? 100 : (isSelected || isInteracting.current ? 50 : 10),
        position: 'absolute',
      }}
      onPointerDown={handleDragStart} 
      onContextMenu={handleContextMenu}
      initial={false}
      className={`group cursor-grab active:cursor-grabbing perspective-1000 select-none`}
    >
        {/* --- CONTROLS LAYER --- */}
        {isSelected && (
            <>
                <div className="absolute -inset-3 border-2 border-blue-400/50 rounded-3xl pointer-events-none z-0" />
                <div onPointerDown={handleRotateStart} className="absolute -top-14 left-1/2 -translate-x-1/2 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center cursor-alias hover:bg-blue-50 z-50 text-stone-600 border border-stone-200">
                    <RotateCw size={14} />
                    <div className="absolute top-8 left-1/2 w-px h-6 bg-blue-400/50 -translate-x-1/2 pointer-events-none" />
                </div>
                 <div onPointerDown={handleResizeStart} className="absolute -bottom-6 -right-6 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center cursor-nwse-resize hover:bg-blue-50 z-50 text-stone-600 border border-stone-200">
                    <Maximize2 size={14} />
                </div>
            </>
        )}

        {/* --- CARD CONTENT --- */}
        <motion.div
          // REMOVED: "transition-all duration-500" (The culprit!)
          className="w-full h-full relative preserve-3d"
          animate={{ rotateY: card.isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }} // Snappy flip
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (isInteracting.current) return;
            const target = e.target as HTMLElement;
            // Prevent flip if clicking inputs/menu
            if (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.closest('.context-menu')) return;
            updateCard(card.id, { isFlipped: !card.isFlipped });
          }}
        >
          {/* --- FRONT --- */}
          <div className="absolute inset-0 backface-hidden w-full h-full bg-stone-50 rounded-2xl shadow-xl overflow-hidden border border-stone-200 flex flex-col select-none">
            {/* Image Layer */}
            {card.content.frontUrl && (
              <img 
                src={card.content.frontUrl} 
                alt="Vision" 
                className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
                style={{ opacity: style.opacity }}
              />
            )}
            
            {/* Text Layer (Visible even on images for captioning) */}
            <div className="relative w-full h-full flex items-center justify-center p-6 z-10">
                {(card.type === 'text' || !card.content.frontUrl) && (
                     <span 
                        className="text-center outline-none"
                        style={{ 
                            fontSize: `${style.fontSize}px`,
                            fontFamily: style.fontFamily === 'font-serif' ? 'serif' : style.fontFamily === 'font-mono' ? 'monospace' : 'sans-serif',
                            fontWeight: style.fontWeight,
                            fontStyle: style.fontStyle,
                            color: style.textColor
                        }}
                     >
                      {card.content.frontText || "Empty"}
                     </span>
                )}
             </div>
          </div>

          {/* --- BACK --- */}
          <div 
            className="absolute inset-0 backface-hidden w-full h-full bg-white rounded-2xl shadow-inner border-2 border-stone-100 p-6 flex flex-col"
            style={{ transform: "rotateY(180deg)" }}
          >
             <div className="flex-1 overflow-y-auto flex flex-col gap-4 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent pr-1">
                <div className="flex flex-col gap-1 mt-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400 select-none">Identity</label>
                  <textarea
                    placeholder="In 2026, I am becoming..."
                    className="w-full bg-stone-50 p-3 rounded-lg text-sm text-stone-700 resize-none focus:outline-none focus:ring-1 focus:ring-stone-300 placeholder:text-stone-300 min-h-[80px]"
                    onPointerDown={(e) => { e.stopPropagation(); onSelect(e); }} 
                    onChange={(e) => updateCard(card.id, { content: { ...card.content, backReflection: { ...card.content.backReflection, identity: e.target.value }} })}
                    defaultValue={card.content.backReflection.identity}
                  />
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-xs font-semibold uppercase tracking-wider text-stone-400 select-none">Practice</label>
                  <textarea
                    placeholder="I will support this by..."
                    className="w-full bg-stone-50 p-3 rounded-lg text-sm text-stone-700 resize-none focus:outline-none focus:ring-1 focus:ring-stone-300 placeholder:text-stone-300 min-h-[80px]"
                    onPointerDown={(e) => { e.stopPropagation(); onSelect(e); }} 
                    onChange={(e) => updateCard(card.id, { content: { ...card.content, backReflection: { ...card.content.backReflection, practice: e.target.value }} })}
                    defaultValue={card.content.backReflection.practice}
                  />
                </div>
                 <div className="h-4 shrink-0"></div>
            </div>
          </div>
        </motion.div>
    </motion.div>

    {/* --- CONTEXT MENU (Rendered via Portal or absolute over everything) --- */}
    {showMenu && (
        <div 
            className="context-menu fixed z-[999] bg-white/90 backdrop-blur-md border border-stone-200 shadow-2xl rounded-xl p-2 w-64 flex flex-col gap-1"
            style={{ 
                left: card.x + card.width/2 + 20, // Position to right of card
                top: card.y - 100 
            }}
            onPointerDown={(e) => e.stopPropagation()} // Prevent dragging card when clicking menu
        >
            {/* Header */}
            <div className="flex justify-between items-center px-2 py-1 border-b border-stone-100 pb-2 mb-1">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Edit Card</span>
                <button onClick={() => setShowMenu(false)} className="text-stone-400 hover:text-stone-600"><X size={14}/></button>
            </div>

            {/* --- FRONT TOOLS --- */}
            <div className="px-2 py-2 flex flex-col gap-3">
                
                {/* Image Upload */}
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-600 flex items-center gap-2"><ImageIcon size={12}/> Image</span>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded text-stone-600 transition-colors"
                    >
                        Upload
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload}/>
                </div>

                {/* Opacity */}
                <div className="flex flex-col gap-1">
                     <span className="text-[10px] text-stone-400">Opacity</span>
                     <input 
                        type="range" min="0.1" max="1" step="0.1" 
                        value={style.opacity}
                        onChange={(e) => updateStyle('opacity', parseFloat(e.target.value))}
                        className="w-full accent-stone-800 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                     />
                </div>

                <div className="h-px bg-stone-100 w-full my-1"></div>

                {/* Text Input */}
                <div className="flex flex-col gap-2">
                     <span className="text-xs font-medium text-stone-600 flex items-center gap-2"><Type size={12}/> Text</span>
                     <input 
                        type="text" 
                        value={card.content.frontText || ""}
                        onChange={(e) => updateCard(card.id, { content: { ...card.content, frontText: e.target.value }})}
                        placeholder="Card Label..."
                        className="text-xs p-1.5 bg-stone-50 border border-stone-200 rounded focus:ring-1 focus:ring-stone-400 outline-none"
                     />
                </div>

                {/* Typography Tools */}
                <div className="grid grid-cols-2 gap-2">
                    {/* Font Size */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-stone-400">Size</span>
                        <input 
                            type="number" value={style.fontSize} 
                            onChange={(e) => updateStyle('fontSize', parseInt(e.target.value))}
                            className="text-xs p-1 bg-stone-50 border border-stone-200 rounded w-full"
                        />
                    </div>
                     {/* Font Style Toggles */}
                    <div className="flex items-end gap-1">
                        <button 
                            onClick={() => updateStyle('fontWeight', style.fontWeight === 'bold' ? 'normal' : 'bold')}
                            className={`p-1.5 rounded border ${style.fontWeight === 'bold' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white border-stone-200 text-stone-600'}`}
                        >
                            <span className="font-bold text-xs">B</span>
                        </button>
                        <button 
                            onClick={() => updateStyle('fontStyle', style.fontStyle === 'italic' ? 'normal' : 'italic')}
                            className={`p-1.5 rounded border ${style.fontStyle === 'italic' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white border-stone-200 text-stone-600'}`}
                        >
                            <span className="italic text-xs">I</span>
                        </button>
                    </div>
                </div>

                {/* Font Family */}
                <select 
                    value={style.fontFamily}
                    onChange={(e) => updateStyle('fontFamily', e.target.value)}
                    className="text-xs p-1.5 bg-stone-50 border border-stone-200 rounded w-full outline-none"
                >
                    <option value="font-serif">Serif (Editorial)</option>
                    <option value="font-sans">Sans (Clean)</option>
                    <option value="font-mono">Mono (Tech)</option>
                </select>
            </div>

            <div className="h-px bg-stone-100 w-full my-1"></div>

            {/* --- BACK TOOLS --- */}
             <div className="px-2 py-1">
                 <button className="w-full text-left text-xs px-2 py-1.5 text-stone-500 hover:bg-stone-50 rounded transition-colors flex items-center justify-between">
                    <span>Choose Template</span>
                    <MoreHorizontal size={12} />
                 </button>
             </div>

             <div className="h-px bg-stone-100 w-full my-1"></div>

            {/* --- DELETE --- */}
            <div className="px-2 pb-2">
                <button 
                    onClick={() => onDelete(card.id)}
                    className="w-full text-left text-xs px-2 py-1.5 text-red-500 hover:bg-red-50 rounded transition-colors flex items-center gap-2"
                >
                    <Trash2 size={12} />
                    Delete Card
                </button>
            </div>

        </div>
    )}
    </>
  );
}