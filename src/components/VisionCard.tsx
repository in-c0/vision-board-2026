"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useDragControls } from "framer-motion"; // <--- Imported useDragControls
import { CardData } from "@/types/board";
import { 
    RefreshCw, RotateCw, Maximize2, Trash2, 
    Image as ImageIcon, X, Video, Film, Loader2, 
    Link as LinkIcon, GripHorizontal, Type, Upload
} from "lucide-react";

interface VisionCardProps {
  card: CardData;
  isSelected: boolean;
  onSelect: (e: React.PointerEvent) => void;
  updateCard: (id: string, newData: Partial<CardData>) => void;
  onDelete: (id: string) => void;
}

export default function VisionCard({ card, isSelected, onSelect, updateCard, onDelete }: VisionCardProps) {
  const isInteracting = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [showMenu, setShowMenu] = useState(false);
  const dragControls = useDragControls(); // <--- Initialize Drag Controls
  
  // Menu Workflow States
  const [menuMode, setMenuMode] = useState<'main' | 'input' | 'loading' | 'choice'>('main');
  const [urlInput, setUrlInput] = useState("");
  const [pendingMedia, setPendingMedia] = useState<{ img?: string, video?: string } | null>(null);

  // Safe Defaults
  const style = card.content.style || {
    opacity: 1, fontSize: 32, fontFamily: 'font-serif', 
    fontWeight: 'normal', fontStyle: 'italic', textColor: '#292524'
  };

  // --- 1. LOCAL UPLOAD LOGIC ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const objectUrl = URL.createObjectURL(file);
        updateCard(card.id, { 
            type: 'image',
            content: { 
                ...card.content, 
                frontUrl: objectUrl, 
                frontVideoUrl: undefined,
            } 
        });
        e.target.value = '';
    }
  };

  // --- 2. ROBUST DRAG HANDLER (CARD) ---
  const handleDragStart = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.stop-drag')) return;
    
    e.preventDefault();
    onSelect(e);
    
    isInteracting.current = true;
    document.body.style.userSelect = 'none'; 
    
    const startMouseX = e.clientX; const startMouseY = e.clientY;
    const startCardX = card.x; const startCardY = card.y;

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;
      updateCard(card.id, { x: startCardX + deltaX, y: startCardY + deltaY });
    };

    const onUp = () => {
      isInteracting.current = false;
      document.body.style.userSelect = 'auto'; 
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // --- 3. FETCH LOGIC ---
  const handleFetch = async () => {
    if (!urlInput) return;
    setMenuMode('loading');

    try {
        const res = await fetch('/api/unfurl', {
            method: 'POST',
            body: JSON.stringify({ url: urlInput })
        });
        const data = await res.json();

        if (data.url && data.videoUrl) {
            setPendingMedia({ img: data.url, video: data.videoUrl });
            setMenuMode('choice');
            return;
        }
        if (data.videoUrl) {
            applyMedia(data.url, data.videoUrl);
            return;
        }
        if (data.url) {
            applyMedia(data.url, null);
            return;
        }
        alert("No media found.");
        setMenuMode('input');
    } catch (e) {
        console.error(e);
        alert("Failed to fetch.");
        setMenuMode('input');
    }
  };

  const applyMedia = (img: string | null, video: string | null) => {
      updateCard(card.id, { 
          type: 'image',
          content: { 
              ...card.content, 
              frontUrl: img || card.content.frontUrl, 
              frontVideoUrl: video || undefined,
          } 
      });
      setShowMenu(false);
      setMenuMode('main');
      setUrlInput("");
  };

  // --- 4. ROTATE/RESIZE LOGIC ---
  const rotatePoint = (x: number, y: number, radians: number) => {
    return { x: x * Math.cos(radians) - y * Math.sin(radians), y: x * Math.sin(radians) + y * Math.cos(radians) };
  };
  const handleRotateStart = (e: React.PointerEvent) => {
      e.stopPropagation(); isInteracting.current = true;
      const centerX = card.x; const centerY = card.y;
      const startMouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const startCardRotation = card.rotation;
      const onMove = (moveEvent: PointerEvent) => {
        const currentMouseAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
        updateCard(card.id, { rotation: startCardRotation + (currentMouseAngle - startMouseAngle) * (180/Math.PI) });
      };
      const onUp = () => { isInteracting.current = false; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
      window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  };
  const handleResizeStart = (e: React.PointerEvent) => {
      e.stopPropagation(); isInteracting.current = true;
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
      const onUp = () => { setTimeout(() => isInteracting.current = false, 100); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
      window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  };

  return (
    <>
    {/* --- THE CARD --- */}
    <motion.div
      style={{
        width: card.width, height: card.height,
        left: card.x, top: card.y,
        x: "-50%", y: "-50%",
        rotate: card.rotation,
        zIndex: showMenu ? 40 : (isSelected || isInteracting.current ? 30 : 10), 
        position: 'absolute',
      }}
      onPointerDown={handleDragStart} 
      onContextMenu={(e) => {
        e.preventDefault(); e.stopPropagation(); setShowMenu(true);
        if (!isSelected) onSelect(e as unknown as React.PointerEvent);
      }}
      initial={false}
      className={`group cursor-grab active:cursor-grabbing perspective-1000 select-none`}
    >
        {/* Controls */}
        {isSelected && (
            <>
                <div className="absolute -inset-3 border-2 border-blue-400/50 rounded-3xl pointer-events-none z-0" />
                {/* DARK ICONS (text-stone-900) */}
                <div onPointerDown={handleRotateStart} className="stop-drag absolute -top-14 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-stone-300 shadow-md rounded-full flex items-center justify-center cursor-alias z-50 text-stone-900 hover:bg-stone-50">
                    <RotateCw size={14} /> 
                </div>
                 <div onPointerDown={handleResizeStart} className="stop-drag absolute -bottom-6 -right-6 w-8 h-8 bg-white border border-stone-300 shadow-md rounded-full flex items-center justify-center cursor-nwse-resize z-50 text-stone-900 hover:bg-stone-50">
                    <Maximize2 size={14} />
                </div>
            </>
        )}

        {/* --- CARD FLIPPER --- */}
        <motion.div
          className="w-full h-full relative preserve-3d"
          animate={{ rotateY: card.isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (isInteracting.current) return;
            if ((e.target as HTMLElement).closest('.stop-drag')) return;
            updateCard(card.id, { isFlipped: !card.isFlipped });
          }}
        >
          {/* --- FRONT SIDE --- */}
          <div className="absolute inset-0 backface-hidden w-full h-full bg-stone-50 rounded-2xl shadow-xl overflow-hidden border border-stone-200 flex flex-col select-none">
            
            {/* LAYER 1: MEDIA (Z-0) */}
            {card.content.frontVideoUrl ? (
                <video 
                    src={card.content.frontVideoUrl} poster={card.content.frontUrl}
                    autoPlay loop muted playsInline
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
                    style={{ opacity: style.opacity }}
                />
            ) : card.content.frontUrl ? (
              <img 
                src={card.content.frontUrl} alt="Vision" 
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0" 
                style={{ opacity: style.opacity }}
              />
            ) : null}

            {/* LAYER 2: TEXT (Z-20) */}
            <div className="relative w-full h-full flex items-center justify-center p-6 z-20 pointer-events-none">
                 <span style={{ 
                        fontSize: `${style.fontSize}px`, 
                        fontFamily: style.fontFamily === 'font-serif' ? 'serif' : style.fontFamily === 'font-mono' ? 'monospace' : 'sans-serif', 
                        color: style.textColor, fontStyle: style.fontStyle, fontWeight: style.fontWeight,
                        textShadow: '0px 1px 3px rgba(0,0,0,0.15)',
                        lineHeight: 1.2
                    }}>
                  {card.content.frontText}
                 </span>
             </div>
          </div>

          {/* --- BACK SIDE --- */}
          <div 
            className="absolute inset-0 backface-hidden w-full h-full bg-white rounded-2xl shadow-inner border-2 border-stone-100 p-6 flex flex-col"
            style={{ transform: "rotateY(180deg)" }}
          >
             <div 
                className="flex-1 overflow-y-auto flex flex-col gap-4 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent pr-1 cursor-text select-text stop-drag"
                onPointerDown={(e) => { e.stopPropagation(); }}
             >
                <div className="flex flex-col gap-1 mt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-900 select-none">Identity</label>
                  <textarea
                    placeholder="In 2026, I am becoming..."
                    className="w-full bg-stone-50 p-3 rounded-lg text-sm text-stone-900 border border-stone-200 resize-none focus:outline-none focus:ring-2 focus:ring-stone-800 placeholder:text-stone-400 min-h-[80px]"
                    onChange={(e) => updateCard(card.id, { content: { ...card.content, backReflection: { ...card.content.backReflection, identity: e.target.value }} })}
                    defaultValue={card.content.backReflection.identity}
                  />
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-xs font-bold uppercase tracking-wider text-stone-900 select-none">Practice</label>
                  <textarea
                    placeholder="I will support this by..."
                    className="w-full bg-stone-50 p-3 rounded-lg text-sm text-stone-900 border border-stone-200 resize-none focus:outline-none focus:ring-2 focus:ring-stone-800 placeholder:text-stone-400 min-h-[80px]"
                    onChange={(e) => updateCard(card.id, { content: { ...card.content, backReflection: { ...card.content.backReflection, practice: e.target.value }} })}
                    defaultValue={card.content.backReflection.practice}
                  />
                </div>
                 <div className="h-4 shrink-0"></div>
            </div>
          </div>
        </motion.div>
    </motion.div>

    {/* --- THE DRAGGABLE MENU --- */}
    {showMenu && (
        <motion.div 
            drag
            dragListener={false} // CRITICAL FIX: Disables dragging on the body
            dragControls={dragControls} // Enable dragging only via controls
            dragMomentum={false}
            onPointerDown={(e) => e.stopPropagation()} 
            className="stop-drag fixed z-[999] bg-white border border-stone-200 shadow-2xl rounded-xl w-72 flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ left: card.x + card.width/2 + 20, top: card.y - 100 }}
        >
             {/* Header - This is the ONLY handle for dragging */}
             <div 
                className="flex justify-between items-center px-3 py-2 bg-stone-50 border-b border-stone-200 cursor-move"
                onPointerDown={(e) => dragControls.start(e)} // Start drag here
             >
                <div className="flex items-center gap-2 text-stone-500">
                    <GripHorizontal size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Edit Card
                    </span>
                </div>
                <button 
                    // Stop propagation so clicking X doesn't start drag
                    onPointerDown={(e) => e.stopPropagation()} 
                    onClick={() => { setShowMenu(false); setMenuMode('main'); }} 
                    className="text-stone-400 hover:text-stone-700"
                >
                    <X size={16}/>
                </button>
            </div>

            {/* --- MODE: MAIN --- */}
            {menuMode === 'main' && (
                <div className="px-3 py-3 flex flex-col gap-4 bg-white">
                    {/* Media Actions */}
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setMenuMode('input')}
                            className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 px-2 py-2 rounded-lg transition-colors border border-stone-200"
                        >
                           <LinkIcon size={12} /> Link
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 px-2 py-2 rounded-lg transition-colors border border-stone-200"
                        >
                           <Upload size={12} /> Upload
                        </button>
                        <input 
                            type="file" ref={fileInputRef} className="hidden" 
                            accept="image/*" onChange={handleFileUpload} 
                        />
                    </div>
                    
                    <div className="h-px bg-stone-100 w-full"></div>

                    {/* Text Label */}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-stone-800 flex items-center gap-1"><Type size={10}/> Label</span>
                        <input 
                            type="text"
                            value={card.content.frontText || ""}
                            onChange={(e) => updateCard(card.id, { content: { ...card.content, frontText: e.target.value }})}
                            placeholder="Add text overlay..."
                            className="text-xs p-2 bg-stone-50 border border-stone-200 rounded focus:border-stone-400 outline-none text-stone-900 font-medium"
                        />
                    </div>

                    {/* Font Settings (Size & Color) */}
                    <div className="flex gap-2">
                         <div className="flex-1 flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-stone-900">Size (px)</span>
                             <input 
                                type="number" min="12" max="120"
                                value={style.fontSize}
                                onChange={(e) => updateCard(card.id, { content: { ...card.content, style: { ...style, fontSize: parseInt(e.target.value) } } })}
                                className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded font-medium text-stone-900"
                             />
                         </div>
                         <div className="flex-1 flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-stone-900">Color</span>
                             <div className="flex items-center gap-2">
                                 {/* Color Preview / Trigger */}
                                 <div className="relative w-full h-[26px] bg-stone-50 border border-stone-200 rounded overflow-hidden">
                                     <input 
                                        type="color" 
                                        value={style.textColor}
                                        onChange={(e) => updateCard(card.id, { content: { ...card.content, style: { ...style, textColor: e.target.value } } })}
                                        className="absolute -top-2 -left-2 w-[200%] h-[200%] cursor-pointer p-0 m-0"
                                     />
                                 </div>
                             </div>
                         </div>
                    </div>

                    {/* Font Family */}
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => updateCard(card.id, { content: { ...card.content, style: { ...style, fontFamily: 'font-serif' } } })} className={`text-[10px] py-1 border rounded ${style.fontFamily === 'font-serif' ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 border-stone-200'}`}>Serif</button>
                        <button onClick={() => updateCard(card.id, { content: { ...card.content, style: { ...style, fontFamily: 'font-sans' } } })} className={`text-[10px] py-1 border rounded ${style.fontFamily === 'font-sans' ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 border-stone-200'}`}>Sans</button>
                        <button onClick={() => updateCard(card.id, { content: { ...card.content, style: { ...style, fontFamily: 'font-mono' } } })} className={`text-[10px] py-1 border rounded ${style.fontFamily === 'font-mono' ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 border-stone-200'}`}>Mono</button>
                    </div>

                    <div className="h-px bg-stone-100 w-full"></div>
                    
                    {/* Opacity Slider */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between">
                            <span className="text-[11px] font-bold text-stone-800">Image Opacity</span>
                            <span className="text-[10px] text-stone-500">{Math.round(style.opacity * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.1" value={style.opacity}
                            onChange={(e) => updateCard(card.id, { content: { ...card.content, style: { ...style, opacity: parseFloat(e.target.value) } } })}
                            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                        />
                    </div>

                     <button onClick={() => onDelete(card.id)} className="w-full text-center text-xs px-2 py-2 text-red-600 hover:bg-red-50 font-medium rounded border border-transparent hover:border-red-100 flex items-center justify-center gap-2 mt-1"><Trash2 size={14} /> Delete Card</button>
                </div>
            )}

            {/* ... INPUT / LOADING / CHOICE modes remain same ... */}
            {menuMode === 'input' && (
                <div className="px-3 py-3 flex flex-col gap-3 bg-white">
                    <span className="text-xs font-bold text-stone-800">Paste Pinterest/Image Link</span>
                    <input 
                        autoFocus
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://pinterest.com/pin/..."
                        className="text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
                        onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                    />
                    <div className="flex gap-2">
                        <button onClick={() => setMenuMode('main')} className="flex-1 text-xs py-2 text-stone-600 hover:bg-stone-100 rounded font-medium border border-stone-200">Back</button>
                        <button onClick={handleFetch} className="flex-1 text-xs py-2 bg-stone-900 text-white hover:bg-stone-800 rounded-lg font-bold flex items-center justify-center gap-1">Fetch</button>
                    </div>
                </div>
            )}
            
             {menuMode === 'loading' && (
                 <div className="px-3 py-8 flex flex-col items-center justify-center gap-3 text-stone-500 bg-white">
                    <Loader2 size={24} className="animate-spin text-stone-900" />
                    <span className="text-xs font-medium">Fetching Media...</span>
                 </div>
            )}

            {menuMode === 'choice' && pendingMedia && (
                <div className="px-3 py-3 flex flex-col gap-3 bg-white">
                    <p className="text-[10px] uppercase font-bold text-stone-500">Found 2 Formats</p>
                    <button 
                        onClick={() => applyMedia(pendingMedia.img || null, pendingMedia.video || null)}
                        className="flex items-center gap-3 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-900 px-3 py-3 rounded-lg transition-colors text-left"
                    >
                        <div className="bg-white p-1.5 rounded-md shadow-sm text-blue-600"><Film size={16}/></div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">Use Video</span>
                            <span className="text-[10px] opacity-70">Looping MP4</span>
                        </div>
                    </button>
                    <button 
                        onClick={() => applyMedia(pendingMedia.img || null, null)}
                        className="flex items-center gap-3 text-xs bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-900 px-3 py-3 rounded-lg transition-colors text-left"
                    >
                         <div className="bg-white p-1.5 rounded-md shadow-sm text-stone-600"><ImageIcon size={16}/></div>
                        <div className="flex flex-col">
                             <span className="font-bold text-sm">Use Image</span>
                             <span className="text-[10px] opacity-70">Static JPG</span>
                        </div>
                    </button>
                </div>
            )}
        </motion.div>
    )}
    </>
  );
}