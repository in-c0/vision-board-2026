"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useDragControls } from "framer-motion";
import { CardData } from "@/types/board";
import { 
    RefreshCw, RotateCw, Maximize2, Trash2, 
    Image as ImageIcon, X, Video, Film, Loader2, 
    Link as LinkIcon, GripHorizontal, Type, Upload, Palette,
    LayoutTemplate, Lock, Youtube, Square, Circle
} from "lucide-react";

// --- TEMPLATES (Unchanged) ---
const TEMPLATES = {
  default: { label: "Identity", quote: "The world will ask who you are, and if you do not know, the world will tell you.", q1: "What this represents", q2: "Why this matters", q3: "How I'll support this" },
  environment: { label: "Environment", quote: "You don't rise to the level of your goals. You fall to the level of your systems.", q1: "This thrives when...", q2: "I'll remove friction by...", q3: "I'll add support by..." },
  community: { label: "Community", quote: "You are the average of the five people you spend the most time with.", q1: "I'm surrounded by people who...", q2: "The version of me here is...", q3: "I contribute by..." },
  habit: { label: "Habit", quote: "We become what we repeatedly do.", q1: "The habit", q2: "When / Where", q3: "Why it matters" }
};

type TemplateId = keyof typeof TEMPLATES;

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
  const dragControls = useDragControls();
  
  // Menu Workflow States
  const [menuTab, setMenuTab] = useState<'visuals' | 'backside'>('visuals');
  const [menuMode, setMenuMode] = useState<'main' | 'input' | 'loading' | 'choice'>('main');
  const [urlInput, setUrlInput] = useState("");
  const [pendingMedia, setPendingMedia] = useState<{ img?: string, video?: string } | null>(null);

  // Defaults
  const style = card.content.style || { opacity: 1, fontSize: 32, fontFamily: 'font-serif', fontWeight: 'normal', fontStyle: 'italic', textColor: '#292524' };
  const backData = {
      templateId: (card.content.backReflection as any)?.templateId || 'default',
      q1: (card.content.backReflection as any)?.q1 || card.content.backReflection?.identity || "",
      q2: (card.content.backReflection as any)?.q2 || card.content.backReflection?.practice || "",
      q3: (card.content.backReflection as any)?.q3 || ""
  };
  const currentTemplate = TEMPLATES[backData.templateId as TemplateId] || TEMPLATES.default;

  // --- NEW: REACTIVE BEHAVIORS ---

  // 1. Auto-Close Menu when deselected
  useEffect(() => {
    if (!isSelected) { setShowMenu(false); setMenuMode('main'); }
  }, [isSelected]);

  // 2. Auto-Switch Tab when card flips
  useEffect(() => {
      setMenuTab(card.isFlipped ? 'backside' : 'visuals');
  }, [card.isFlipped]);


  // --- HANDLERS ---
  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation(); 
      setShowMenu(true); 
      // Text cards don't have backside, always force visuals
      setMenuTab(card.type === 'text' ? 'visuals' : (card.isFlipped ? 'backside' : 'visuals'));
      if (!isSelected) onSelect(e as unknown as React.PointerEvent);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) { alert("Image too large (Max 2MB)"); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            updateCard(card.id, { isFlipped: false, type: 'image', content: { ...card.content, frontUrl: reader.result as string, frontVideoUrl: undefined } });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }
  };

  const handleDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.stop-drag')) return;
    e.preventDefault(); onSelect(e); isInteracting.current = true; document.body.style.userSelect = 'none'; 
    const startMouseX = e.clientX; const startMouseY = e.clientY; const startCardX = card.x; const startCardY = card.y;
    const onMove = (moveEvent: PointerEvent) => updateCard(card.id, { x: startCardX + (moveEvent.clientX - startMouseX), y: startCardY + (moveEvent.clientY - startMouseY) });
    const onUp = () => { isInteracting.current = false; document.body.style.userSelect = 'auto'; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  };

  // --- YOUTUBE HELPER ---
  const getYoutubeEmbed = (url: string) => {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      const id = (match && match[2].length === 11) ? match[2] : null;
      return id ? `https://www.youtube.com/embed/${id}?autoplay=0` : null;
  };

  // --- ACTIONS ---
  const handleFetch = async () => {
    if (!urlInput) return;
    if (card.type === 'youtube' && (urlInput.includes('youtube') || urlInput.includes('youtu.be'))) {
        updateCard(card.id, { content: { ...card.content, youtubeUrl: urlInput } });
        setShowMenu(false); setUrlInput("");
        return;
    }
    setMenuMode('loading');
    try {
        const res = await fetch('/api/unfurl', { method: 'POST', body: JSON.stringify({ url: urlInput }) });
        const data = await res.json();
        if (data.url && data.videoUrl) { setPendingMedia({ img: data.url, video: data.videoUrl }); setMenuMode('choice'); return; }
        if (data.videoUrl) { applyMedia(data.url, data.videoUrl); return; }
        if (data.url) { applyMedia(data.url, null); return; }
        alert("No media found."); setMenuMode('input');
    } catch (e) { console.error(e); alert("Failed to fetch."); setMenuMode('input'); }
  };

  const applyMedia = (img: string | null, video: string | null) => {
      updateCard(card.id, { isFlipped: false, type: 'image', content: { ...card.content, frontUrl: img || card.content.frontUrl, frontVideoUrl: video || undefined } });
      setShowMenu(false); setMenuMode('main'); setUrlInput("");
  };

  const updateTemplate = (tId: TemplateId) => updateCard(card.id, { isFlipped: true, content: { ...card.content, backReflection: { ...card.content.backReflection, templateId: tId, q1: backData.q1, q2: backData.q2, q3: backData.q3 } } });
  const updateBackField = (field: 'q1'|'q2'|'q3', value: string) => updateCard(card.id, { content: { ...card.content, backReflection: { ...card.content.backReflection, [field]: value } } });

  const rotatePoint = (x: number, y: number, radians: number) => ({ x: x * Math.cos(radians) - y * Math.sin(radians), y: x * Math.sin(radians) + y * Math.cos(radians) });
  const handleRotateStart = (e: React.PointerEvent) => { 
      e.stopPropagation(); isInteracting.current = true; 
      const centerX = card.x; const centerY = card.y; 
      const startMouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX); 
      const startCardRotation = card.rotation; 
      const onMove = (moveEvent: PointerEvent) => { 
          const currentMouseAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX); 
          let newRotation = startCardRotation + (currentMouseAngle - startMouseAngle) * (180/Math.PI);
          if (moveEvent.shiftKey) newRotation = Math.round(newRotation / 15) * 15;
          updateCard(card.id, { rotation: newRotation }); 
      }; 
      const onUp = () => { isInteracting.current = false; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); }; 
      window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); 
  };

  const handleResizeStart = (e: React.PointerEvent) => { e.stopPropagation(); isInteracting.current = true; const startMouseX = e.clientX; const startMouseY = e.clientY; const startWidth = card.width; const startHeight = card.height; const startX = card.x; const startY = card.y; const rotationRad = card.rotation * (Math.PI / 180); const onMove = (moveEvent: PointerEvent) => { const globalDeltaX = moveEvent.clientX - startMouseX; const globalDeltaY = moveEvent.clientY - startMouseY; const localDelta = rotatePoint(globalDeltaX, globalDeltaY, -rotationRad); const newWidth = Math.max(150, startWidth + localDelta.x); const newHeight = Math.max(100, startHeight + localDelta.y); const widthGrowth = newWidth - startWidth; const heightGrowth = newHeight - startHeight; const localCenterShift = { x: widthGrowth / 2, y: heightGrowth / 2 }; const globalCenterShift = rotatePoint(localCenterShift.x, localCenterShift.y, rotationRad); updateCard(card.id, { width: newWidth, height: newHeight, x: startX + globalCenterShift.x, y: startY + globalCenterShift.y }); }; const onUp = () => { setTimeout(() => isInteracting.current = false, 100); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); }; window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); };

  // --- STYLING HELPERS ---
  const getContainerStyles = () => {
      // TEXT Type: No border, no shadow, transparent by default (unless user set color)
      if (card.type === 'text') {
          return {
              className: 'absolute inset-0 w-full h-full flex flex-col select-none',
              style: { backgroundColor: style.backgroundColor || 'transparent' }
          };
      }
      
      // SHAPE Type
      if (card.type === 'shape') {
          const shapeClass = card.content.shapeType === 'circle' ? 'rounded-full' : 'rounded-none';
          return {
              className: `absolute inset-0 w-full h-full bg-stone-50 shadow-xl overflow-hidden border border-stone-200 flex flex-col select-none ${shapeClass}`,
              style: { backgroundColor: style.backgroundColor || '#fafaf9' }
          };
      }

      // DEFAULT (Image/Youtube/Card)
      return {
          className: 'absolute inset-0 [backface-visibility:hidden] w-full h-full bg-stone-50 rounded-2xl shadow-xl overflow-hidden border border-stone-200 flex flex-col select-none',
          style: { backgroundColor: style.backgroundColor || '#fafaf9' }
      };
  };

  const containerProps = getContainerStyles();

  return (
    <>
    <motion.div
      style={{ 
        width: card.width || 300, 
        height: card.height || (card.type === 'text' ? 150 : 400), 
        left: card.x, top: card.y, 
        x: "-50%", y: "-50%", 
        rotate: card.rotation, 
        zIndex: showMenu ? 40 : (isSelected || isInteracting.current ? 30 : 10), 
        position: 'absolute' 
      }}
      onPointerDown={handleDragStart} 
      onContextMenu={handleContextMenu}
      initial={false}
      className={`group cursor-grab active:cursor-grabbing perspective-1000 select-none`}
    >
        {isSelected && (
            <>
                <div className={`absolute -inset-3 border-2 border-blue-400/50 pointer-events-none z-0 ${card.type === 'shape' && card.content.shapeType === 'circle' ? 'rounded-full' : (card.type === 'text' ? 'rounded-lg' : 'rounded-2xl')}`} />
                <div onPointerDown={handleRotateStart} className="stop-drag absolute -top-14 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-stone-300 shadow-md rounded-full flex items-center justify-center cursor-alias z-50 text-stone-900 hover:bg-stone-50"><RotateCw size={14} /></div>
                <div onPointerDown={handleResizeStart} className="stop-drag absolute -bottom-6 -right-6 w-8 h-8 bg-white border border-stone-300 shadow-md rounded-full flex items-center justify-center cursor-nwse-resize z-50 text-stone-900 hover:bg-stone-50"><Maximize2 size={14} /></div>
            </>
        )}

        <motion.div
          className="w-full h-full relative [transform-style:preserve-3d]"
          animate={{ rotateY: card.isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (isInteracting.current || (e.target as HTMLElement).closest('.stop-drag')) return;
            // DISABLE FLIP FOR TEXT
            if (card.type === 'text') return;
            updateCard(card.id, { isFlipped: !card.isFlipped });
          }}
        >
          {/* --- FRONT OF CARD --- */}
          <div className={containerProps.className} style={containerProps.style}>
            
            {/* 1. YOUTUBE TYPE */}
            {card.type === 'youtube' && (
                <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center pointer-events-auto">
                    {card.content.youtubeUrl && getYoutubeEmbed(card.content.youtubeUrl) ? (
                        <iframe 
                            src={getYoutubeEmbed(card.content.youtubeUrl)!} 
                            className="w-full h-full" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-stone-500 cursor-pointer hover:text-white transition-colors" onClick={() => { setShowMenu(true); setMenuMode('input'); }}>
                            <Youtube size={48} className="opacity-50" />
                            <span className="text-xs font-bold uppercase tracking-wider">Paste Link</span>
                        </div>
                    )}
                </div>
            )}

            {/* 2. IMAGE TYPE */}
            {card.type === 'image' && (
                <>
                    {card.content.frontVideoUrl ? (
                        <video src={card.content.frontVideoUrl} poster={card.content.frontUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0" style={{ opacity: style.opacity }} />
                    ) : card.content.frontUrl ? (
                        <img src={card.content.frontUrl} alt="Vision" className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0" style={{ opacity: style.opacity }} />
                    ) : null}
                </>
            )}

            {/* 3. CONTENT OVERLAY */}
            <div className={`relative w-full h-full flex items-center justify-center ${card.type === 'text' ? 'p-2' : 'p-6'} z-20 pointer-events-none`}>
                 <span style={{ fontSize: `${style.fontSize}px`, fontFamily: style.fontFamily === 'font-serif' ? 'serif' : style.fontFamily === 'font-mono' ? 'monospace' : 'sans-serif', color: style.textColor, fontStyle: style.fontStyle, fontWeight: style.fontWeight, textShadow: (card.type === 'image' || card.type === 'youtube') ? '0px 1px 3px rgba(0,0,0,0.5)' : 'none', lineHeight: 1.2 }}>
                  {card.content.frontText}
                 </span>
             </div>
          </div>

          {/* --- BACK OF CARD (Hidden for Text) --- */}
          {card.type !== 'text' && (
              <div className={`absolute inset-0 [backface-visibility:hidden] w-full h-full bg-white rounded-2xl shadow-inner border-2 border-stone-100 p-5 flex flex-col`} style={{ transform: "rotateY(180deg)" }}>
                 <div className="flex-1 overflow-y-auto flex flex-col gap-3 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent pr-1 cursor-text select-text stop-drag" onPointerDown={(e) => { e.stopPropagation(); }}>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-900 select-none">{currentTemplate.q1}</label>
                      <textarea className="w-full bg-stone-50 p-2 rounded-md text-xs text-stone-900 border border-stone-200 resize-none focus:outline-none focus:ring-1 focus:ring-stone-800 placeholder:text-stone-300 min-h-[40px]" onChange={(e) => updateBackField('q1', e.target.value)} value={backData.q1} />
                    </div>
                    <div className="flex flex-col gap-1">
                       <label className="text-[10px] font-bold uppercase tracking-wider text-stone-900 select-none">{currentTemplate.q2}</label>
                      <textarea className="w-full bg-stone-50 p-2 rounded-md text-xs text-stone-900 border border-stone-200 resize-none focus:outline-none focus:ring-1 focus:ring-stone-800 placeholder:text-stone-300 min-h-[40px]" onChange={(e) => updateBackField('q2', e.target.value)} value={backData.q2} />
                    </div>
                    <div className="flex flex-col gap-1">
                       <label className="text-[10px] font-bold uppercase tracking-wider text-stone-900 select-none">{currentTemplate.q3}</label>
                      <textarea className="w-full bg-stone-50 p-2 rounded-md text-xs text-stone-900 border border-stone-200 resize-none focus:outline-none focus:ring-1 focus:ring-stone-800 placeholder:text-stone-300 min-h-[40px]" onChange={(e) => updateBackField('q3', e.target.value)} value={backData.q3} />
                    </div>
                    <div className="h-4 shrink-0"></div>
                </div>
              </div>
          )}
        </motion.div>
    </motion.div>

    {/* --- CONTEXT MENU --- */}
    {showMenu && (
        <motion.div 
            drag dragListener={false} dragControls={dragControls} dragMomentum={false}
            onPointerDown={(e) => e.stopPropagation()} 
            className="stop-drag fixed z-[999] bg-white border border-stone-200 shadow-2xl rounded-xl w-72 flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ left: card.x + card.width/2 + 20, top: card.y - 100 }}
        >
             <div className="flex justify-between items-center px-3 py-2 bg-stone-50 border-b border-stone-200 cursor-move" onPointerDown={(e) => dragControls.start(e)}>
                <div className="flex items-center gap-2 text-stone-500">
                    <GripHorizontal size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Edit {card.type === 'text' ? 'Text' : card.type}
                    </span>
                </div>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => { setShowMenu(false); setMenuMode('main'); }} className="text-stone-400 hover:text-stone-700"><X size={16}/></button>
            </div>

            {/* TAB SWITCHER: Show for everything EXCEPT 'text' */}
            {menuMode === 'main' && card.type !== 'text' && (
                <div className="flex border-b border-stone-100">
                    <button onClick={() => setMenuTab('visuals')} className={`flex-1 py-2 text-xs font-bold transition-colors ${menuTab === 'visuals' ? 'text-stone-900 border-b-2 border-stone-900 bg-white' : 'text-stone-400 bg-stone-50 hover:bg-stone-100'}`}>Visuals</button>
                    <button onClick={() => setMenuTab('backside')} className={`flex-1 py-2 text-xs font-bold transition-colors ${menuTab === 'backside' ? 'text-stone-900 border-b-2 border-stone-900 bg-white' : 'text-stone-400 bg-stone-50 hover:bg-stone-100'}`}>Backside</button>
                </div>
            )}

            {menuMode === 'main' && menuTab === 'visuals' && (
                <div className="px-3 py-3 flex flex-col gap-4 bg-white">
                    {/* TYPE SPECIFIC CONTROLS */}
                    {card.type === 'shape' && (
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => updateCard(card.id, { content: { ...card.content, shapeType: 'square' }})} className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 text-xs font-bold ${card.content.shapeType !== 'circle' ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-600'}`}><Square size={12}/> Square</button>
                            <button onClick={() => updateCard(card.id, { content: { ...card.content, shapeType: 'circle' }})} className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 text-xs font-bold ${card.content.shapeType === 'circle' ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-600'}`}><Circle size={12}/> Circle</button>
                        </div>
                    )}

                    {card.type === 'youtube' && (
                         <button onClick={() => setMenuMode('input')} className="w-full flex items-center justify-center gap-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 px-2 py-2 rounded-lg transition-colors"><Youtube size={14} /> Change Video Link</button>
                    )}

                    {/* STANDARD CONTROLS (Link/Upload only for Image) */}
                    {card.type === 'image' && (
                        <div className="flex gap-2">
                            <button onClick={() => setMenuMode('input')} className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 px-2 py-2 rounded-lg transition-colors border border-stone-200"><LinkIcon size={12} /> Link</button>
                            <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 px-2 py-2 rounded-lg transition-colors border border-stone-200"><Upload size={12} /> Upload</button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </div>
                    )}
                    
                    <div className="h-px bg-stone-100 w-full"></div>
                    
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-stone-800 flex items-center gap-1"><Type size={10}/> Label</span>
                        <input type="text" value={card.content.frontText || ""} onChange={(e) => updateCard(card.id, { isFlipped: false, content: { ...card.content, frontText: e.target.value }})} placeholder="Add text overlay..." className="text-xs p-2 bg-stone-50 border border-stone-200 rounded focus:border-stone-400 outline-none text-stone-900 font-medium"/>
                    </div>
                    
                    <div className="flex gap-2">
                         <div className="flex-1 flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-stone-900">Size (px)</span>
                             <input type="number" min="12" max="120" value={style.fontSize} onChange={(e) => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, fontSize: parseInt(e.target.value) } } })} className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded font-medium text-stone-900" />
                         </div>
                         <div className="flex-1 flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-stone-900">Color/Bg</span>
                             <div className="relative w-full h-[26px] bg-stone-50 border border-stone-200 rounded overflow-hidden flex">
                                 <input type="color" value={style.textColor} onChange={(e) => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, textColor: e.target.value } } })} className="flex-1 cursor-pointer h-full p-0 border-0" title="Text Color"/>
                                 {card.type !== 'image' && <input type="color" value={style.backgroundColor || (card.type === 'text' ? 'transparent' : '#ffffff')} onChange={(e) => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, backgroundColor: e.target.value } } })} className="flex-1 cursor-pointer h-full p-0 border-0" title="Background Color"/>}
                             </div>
                         </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, fontFamily: 'font-serif' } } })} className={`text-[10px] py-1 border rounded ${style.fontFamily === 'font-serif' ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 border-stone-200'}`}>Serif</button>
                        <button onClick={() => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, fontFamily: 'font-sans' } } })} className={`text-[10px] py-1 border rounded ${style.fontFamily === 'font-sans' ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 border-stone-200'}`}>Sans</button>
                        <button onClick={() => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, fontFamily: 'font-mono' } } })} className={`text-[10px] py-1 border rounded ${style.fontFamily === 'font-mono' ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 border-stone-200'}`}>Mono</button>
                    </div>

                    <div className="h-px bg-stone-100 w-full"></div>
                    <button onClick={() => onDelete(card.id)} className="w-full text-center text-xs px-2 py-2 text-red-600 hover:bg-red-50 font-medium rounded border border-transparent hover:border-red-100 flex items-center justify-center gap-2 mt-1"><Trash2 size={14} /> Delete Card</button>
                </div>
            )}

            {/* ... (Backside, Input, Loading, Choice - Same as before) ... */}
            {menuMode === 'input' && (
                <div className="px-3 py-3 flex flex-col gap-3 bg-white">
                    <span className="text-xs font-bold text-stone-800">Paste Link</span>
                    <input autoFocus value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder={card.type === 'youtube' ? "https://youtube.com/..." : "https://..."} className="text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900" onKeyDown={(e) => e.key === 'Enter' && handleFetch()} />
                    <div className="flex gap-2">
                        <button onClick={() => setMenuMode('main')} className="flex-1 text-xs py-2 text-stone-600 hover:bg-stone-100 rounded font-medium border border-stone-200">Back</button>
                        <button onClick={handleFetch} className="flex-1 text-xs py-2 bg-stone-900 text-white hover:bg-stone-800 rounded-lg font-bold flex items-center justify-center gap-1">Fetch</button>
                    </div>
                </div>
            )}
            
           
            {/* BACKSIDE TAB: Where the Templates live */}
            {menuMode === 'main' && menuTab === 'backside' && card.type !== 'text' && (
                <div className="px-3 py-3 flex flex-col gap-3 bg-white h-full overflow-y-auto max-h-[400px]">
                    <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wide">Built-in Templates</span>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                            <button key={key} onClick={() => updateTemplate(key as TemplateId)} className={`flex flex-col gap-1 p-2 rounded-lg border text-left transition-all ${backData.templateId === key ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900' : 'border-stone-200 hover:border-stone-400'}`}>
                                <div className="flex items-center gap-1.5"><LayoutTemplate size={12} className={backData.templateId === key ? 'text-stone-900' : 'text-stone-400'} /><span className={`text-xs font-bold ${backData.templateId === key ? 'text-stone-900' : 'text-stone-600'}`}>{tmpl.label}</span></div>
                            </button>
                        ))}
                    </div>
                    
                    <div className="mt-2 px-1 text-center"><p className="font-serif text-lg italic text-stone-500 leading-relaxed">"{currentTemplate.quote}"</p></div>
                    <div className="h-px bg-stone-100 w-full my-1"></div>
                    
                    {/* Marketplace Placeholder */}
                    <div className="flex flex-col gap-2 opacity-60">
                         <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">Community Marketplace</span>
                         <div className="p-3 border border-dashed border-stone-200 rounded-lg flex items-center justify-center gap-2 bg-stone-50"><Lock size={12} className="text-stone-400"/><span className="text-[10px] font-bold text-stone-400">Coming Soon</span></div>
                    </div>
                </div>
            )}
            
            {menuMode === 'loading' && (
                 <div className="px-3 py-8 flex flex-col items-center justify-center gap-3 text-stone-500 bg-white"><Loader2 size={24} className="animate-spin text-stone-900" /><span className="text-xs font-medium">Fetching Media...</span></div>
            )}
            {menuMode === 'choice' && pendingMedia && (
                <div className="px-3 py-3 flex flex-col gap-3 bg-white">
                    <p className="text-[10px] uppercase font-bold text-stone-500">Found 2 Formats</p>
                    <button onClick={() => applyMedia(pendingMedia.img || null, pendingMedia.video || null)} className="flex items-center gap-3 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-900 px-3 py-3 rounded-lg transition-colors text-left">
                        <div className="bg-white p-1.5 rounded-md shadow-sm text-blue-600"><Film size={16}/></div><div className="flex flex-col"><span className="font-bold text-sm">Use Video</span><span className="text-[10px] opacity-70">Looping MP4</span></div>
                    </button>
                    <button onClick={() => applyMedia(pendingMedia.img || null, null)} className="flex items-center gap-3 text-xs bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-900 px-3 py-3 rounded-lg transition-colors text-left">
                         <div className="bg-white p-1.5 rounded-md shadow-sm text-stone-600"><ImageIcon size={16}/></div><div className="flex flex-col"><span className="font-bold text-sm">Use Image</span><span className="text-[10px] opacity-70">Static JPG</span></div>
                    </button>
                </div>
            )}
        </motion.div>
    )}
    </>
  );
}