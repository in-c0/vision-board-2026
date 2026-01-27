"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useDragControls } from "framer-motion";
import { CardData } from "@/types/board";
import { 
    RotateCw, Maximize2, Trash2, Image as ImageIcon, X, Film, Loader2, 
    Link as LinkIcon, GripHorizontal, Type, Upload, 
    LayoutTemplate, Lock,
    AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical
} from "lucide-react";

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
  if (!card || !card.content) return null;

  const isInteracting = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [showMenu, setShowMenu] = useState(false);
  const dragControls = useDragControls();
  
  const [menuTab, setMenuTab] = useState<'visuals' | 'backside'>('visuals');
  const [menuMode, setMenuMode] = useState<'main' | 'input' | 'loading' | 'choice'>('main');
  const [urlInput, setUrlInput] = useState("");
  const [pendingMedia, setPendingMedia] = useState<{ img?: string, video?: string } | null>(null);

  const style: any = { 
      opacity: 1, fontSize: 32, fontFamily: 'font-serif', fontWeight: 'normal', fontStyle: 'italic', textColor: '#292524',
      textAlign: 'center', verticalAlign: 'center', backgroundColor: 'transparent',
      ...card.content.style 
  };
  
  const backData = {
      templateId: (card.content.backReflection as any)?.templateId || 'default',
      q1: (card.content.backReflection as any)?.q1 || card.content.backReflection?.identity || "",
      q2: (card.content.backReflection as any)?.q2 || card.content.backReflection?.practice || "",
      q3: (card.content.backReflection as any)?.q3 || ""
  };
  const currentTemplate = TEMPLATES[backData.templateId as TemplateId] || TEMPLATES.default;

  // --- REACTIVE BEHAVIORS ---
  useEffect(() => {
    if (!isSelected) { setShowMenu(false); setMenuMode('main'); }
  }, [isSelected]);

  useEffect(() => {
      setMenuTab(card.isFlipped ? 'backside' : 'visuals');
  }, [card.isFlipped]);

  // Auto-open Link Input for new YouTube cards
  useEffect(() => {
      const c = card as any;
      if (isSelected && c.type === 'youtube' && !c.content.youtubeUrl && !showMenu) {
          setShowMenu(true);
          setMenuMode('input');
      }
  }, [card, isSelected]);

  // --- HANDLERS ---
  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation(); 
      setShowMenu(true);
      setMenuTab(card.isFlipped ? 'backside' : 'visuals');
      if (!isSelected) onSelect(e as unknown as React.PointerEvent);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) { alert("Image too large (Max 2MB)"); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            updateCard(card.id, { isFlipped: false, type: 'image', content: { ...card.content, frontUrl: reader.result as string, frontVideoUrl: undefined } } as any);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }
  };

  const getYoutubeEmbed = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleFetch = async () => {
    if (!urlInput) return;
    
    const ytId = getYoutubeEmbed(urlInput);
    if (ytId) {
        updateCard(card.id, { 
            type: 'youtube', 
            content: { ...card.content, youtubeUrl: ytId, frontUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` } 
        } as any);
        setShowMenu(false); setMenuMode('main'); setUrlInput("");
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
      updateCard(card.id, { isFlipped: false, type: 'image', content: { ...card.content, frontUrl: img || undefined, frontVideoUrl: video || undefined } } as any);
      setShowMenu(false); setMenuMode('main'); setUrlInput("");
  };

  const updateBackField = (field: 'q1'|'q2'|'q3', value: string) => updateCard(card.id, { content: { ...card.content, backReflection: { ...card.content.backReflection, [field]: value } } } as any);
  const updateTemplate = (tId: TemplateId) => updateCard(card.id, { isFlipped: true, content: { ...card.content, backReflection: { ...card.content.backReflection, templateId: tId, q1: backData.q1, q2: backData.q2, q3: backData.q3 } } } as any);

  const rotatePoint = (x: number, y: number, radians: number) => ({ x: x * Math.cos(radians) - y * Math.sin(radians), y: x * Math.sin(radians) + y * Math.cos(radians) });
  
  const handleDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.stop-drag')) return;
    e.preventDefault(); onSelect(e); isInteracting.current = true; document.body.style.userSelect = 'none'; 
    const startMouseX = e.clientX; const startMouseY = e.clientY; const startCardX = card.x; const startCardY = card.y;
    const onMove = (moveEvent: PointerEvent) => updateCard(card.id, { x: startCardX + (moveEvent.clientX - startMouseX), y: startCardY + (moveEvent.clientY - startMouseY) });
    const onUp = () => { isInteracting.current = false; document.body.style.userSelect = 'auto'; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  };
  
  const handleRotateStart = (e: React.PointerEvent) => { e.stopPropagation(); isInteracting.current = true; const centerX = card.x; const centerY = card.y; const startMouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX); const startCardRotation = card.rotation; const onMove = (moveEvent: PointerEvent) => { const currentMouseAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX); updateCard(card.id, { rotation: startCardRotation + (currentMouseAngle - startMouseAngle) * (180/Math.PI) }); }; const onUp = () => { isInteracting.current = false; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); }; window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); };
  const handleResizeStart = (e: React.PointerEvent) => { e.stopPropagation(); isInteracting.current = true; const startMouseX = e.clientX; const startMouseY = e.clientY; const startWidth = card.width; const startHeight = card.height; const startX = card.x; const startY = card.y; const rotationRad = card.rotation * (Math.PI / 180); const onMove = (moveEvent: PointerEvent) => { const globalDeltaX = moveEvent.clientX - startMouseX; const globalDeltaY = moveEvent.clientY - startMouseY; const localDelta = rotatePoint(globalDeltaX, globalDeltaY, -rotationRad); const newWidth = Math.max(150, startWidth + localDelta.x); const newHeight = Math.max(150, startHeight + localDelta.y); const widthGrowth = newWidth - startWidth; const heightGrowth = newHeight - startHeight; const localCenterShift = { x: widthGrowth / 2, y: heightGrowth / 2 }; const globalCenterShift = rotatePoint(localCenterShift.x, localCenterShift.y, rotationRad); updateCard(card.id, { width: newWidth, height: newHeight, x: startX + globalCenterShift.x, y: startY + globalCenterShift.y }); }; const onUp = () => { setTimeout(() => isInteracting.current = false, 100); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); }; window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); };

  const renderBackground = () => {
      const c = card as any;
      const content = card.content as any;

      if (c.type === 'shape') {
          const shapeClass = content.shapeType === 'circle' ? 'rounded-full' : 'rounded-2xl';
          return <div className={`absolute inset-0 w-full h-full ${shapeClass}`} style={{ backgroundColor: style.backgroundColor || '#e7e5e4', opacity: style.opacity }} />;
      }
      if (c.type === 'youtube') {
           if (!content.youtubeUrl) return <div className="absolute inset-0 w-full h-full bg-stone-900 rounded-2xl flex items-center justify-center text-white/50 font-bold tracking-widest"><Film size={32} className="opacity-50"/></div>;
           return (
               <iframe className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl" src={`https://www.youtube.com/embed/${content.youtubeUrl}?controls=0&showinfo=0&rel=0&autoplay=1&mute=1&loop=1&playlist=${content.youtubeUrl}`} title="YouTube" frameBorder="0" />
           );
      }
      if (card.content.frontVideoUrl) {
          return <video src={card.content.frontVideoUrl} poster={card.content.frontUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 rounded-2xl" style={{ opacity: style.opacity }} />;
      }
      if (card.content.frontUrl) {
          return <img src={card.content.frontUrl} alt="Vision" className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 rounded-2xl" style={{ opacity: style.opacity }} />;
      }
      return <div className="absolute inset-0 w-full h-full bg-stone-50 rounded-2xl" style={{ backgroundColor: style.backgroundColor, opacity: style.opacity }} />;
  };

  const isMediaCard = (card as any).type === 'image';
  const isYoutube = (card as any).type === 'youtube';
  const isText = (card as any).type === 'text';

  return (
    <>
    <motion.div
      style={{ width: card.width || 300, height: card.height || 400, left: card.x, top: card.y, x: "-50%", y: "-50%", rotate: card.rotation, zIndex: showMenu ? 40 : (isSelected || isInteracting.current ? 30 : 10), position: 'absolute' }}
      onPointerDown={handleDragStart} 
      onContextMenu={handleContextMenu}
      initial={false}
      className={`group cursor-grab active:cursor-grabbing perspective-1000 select-none`}
    >
        {isSelected && (
            <>
                <div className="absolute -inset-3 border-2 border-blue-400/50 rounded-3xl pointer-events-none z-0" />
                <div onPointerDown={handleRotateStart} className="stop-drag absolute -top-14 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-stone-300 shadow-md rounded-full flex items-center justify-center cursor-alias z-50 text-stone-900 hover:bg-stone-50"><RotateCw size={14} /></div>
                <div onPointerDown={handleResizeStart} className="stop-drag absolute -bottom-6 -right-6 w-8 h-8 bg-white border border-stone-300 shadow-md rounded-full flex items-center justify-center cursor-nwse-resize z-50 text-stone-900 hover:bg-stone-50"><Maximize2 size={14} /></div>
            </>
        )}

        <motion.div
          className="w-full h-full relative [transform-style:preserve-3d]"
          animate={{ rotateY: card.isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          onDoubleClick={(e) => { e.stopPropagation(); updateCard(card.id, { isFlipped: !card.isFlipped }); }}
        >
          {/* FRONT */}
          <div className={`absolute inset-0 [backface-visibility:hidden] w-full h-full shadow-xl overflow-hidden border border-stone-200 flex flex-col select-none ${(card as any).type === 'shape' && (card.content as any).shapeType === 'circle' ? 'rounded-full' : 'rounded-2xl'}`}>
            {renderBackground()}
            <div className={`relative w-full h-full flex p-6 z-20 pointer-events-none ${style.verticalAlign === 'start' ? 'items-start' : style.verticalAlign === 'end' ? 'items-end' : 'items-center'} ${style.textAlign === 'left' ? 'justify-start' : style.textAlign === 'right' ? 'justify-end' : 'justify-center'}`}>
                 <span style={{ fontSize: `${style.fontSize}px`, fontFamily: style.fontFamily === 'font-serif' ? 'serif' : style.fontFamily === 'font-mono' ? 'monospace' : 'sans-serif', color: style.textColor, fontStyle: style.fontStyle, fontWeight: style.fontWeight, textAlign: style.textAlign, whiteSpace: 'pre-wrap', textShadow: isMediaCard || isYoutube ? '0px 1px 3px rgba(0,0,0,0.5)' : 'none', lineHeight: 1.2 }}>
                  {card.content.frontText}
                 </span>
             </div>
          </div>

          {/* BACK */}
          <div className="absolute inset-0 [backface-visibility:hidden] w-full h-full bg-white rounded-2xl shadow-inner border-2 border-stone-100 p-5 flex flex-col" style={{ transform: "rotateY(180deg)" }}>
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
        </motion.div>
    </motion.div>

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
                <div className="flex items-center gap-2 text-stone-500"><GripHorizontal size={14} /><span className="text-xs font-bold uppercase tracking-wider text-stone-700">Edit Card</span></div>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => { setShowMenu(false); setMenuMode('main'); }} className="text-stone-400 hover:text-stone-700"><X size={16}/></button>
            </div>

            {menuMode === 'main' && (
                <div className="flex border-b border-stone-100">
                    <button onClick={() => setMenuTab('visuals')} className={`flex-1 py-2 text-xs font-bold transition-colors ${menuTab === 'visuals' ? 'text-stone-900 border-b-2 border-stone-900 bg-white' : 'text-stone-400 bg-stone-50 hover:bg-stone-100'}`}>Visuals</button>
                    <button onClick={() => setMenuTab('backside')} className={`flex-1 py-2 text-xs font-bold transition-colors ${menuTab === 'backside' ? 'text-stone-900 border-b-2 border-stone-900 bg-white' : 'text-stone-400 bg-stone-50 hover:bg-stone-100'}`}>Backside</button>
                </div>
            )}

            {menuMode === 'main' && menuTab === 'visuals' && (
                <div className="px-3 py-3 flex flex-col gap-4 bg-white">
                    {/* HIDE MEDIA CONTROLS FOR TEXT ONLY CARDS */}
                    {!isText && (
                        <>
                            <div className="flex gap-2">
                                <button onClick={() => setMenuMode('input')} className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 px-2 py-2 rounded-lg transition-colors border border-stone-200"><LinkIcon size={12} /> Link</button>
                                {/* Hide Upload for YouTube cards */}
                                {!isYoutube && (
                                    <>
                                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 px-2 py-2 rounded-lg transition-colors border border-stone-200"><Upload size={12} /> Upload</button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </>
                                )}
                            </div>
                            <div className="h-px bg-stone-100 w-full"></div>
                        </>
                    )}
                    
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-stone-800 flex items-center gap-1"><Type size={10}/> Content</span>
                        <textarea rows={2} value={card.content.frontText || ""} onChange={(e) => updateCard(card.id, { isFlipped: false, content: { ...card.content, frontText: e.target.value }})} placeholder="Add text overlay..." className="text-xs p-2 bg-stone-50 border border-stone-200 rounded focus:border-stone-400 outline-none text-stone-900 font-medium resize-none"/>
                        <div className="flex gap-2">
                             <div className="flex bg-stone-100 rounded p-1 gap-1 flex-1 justify-between">
                                {['left', 'center', 'right'].map((align) => (
                                    <button key={align} onClick={() => updateCard(card.id, { content: { ...card.content, style: { ...style, textAlign: align as any } } } as any)} className={`p-1 rounded ${style.textAlign === align ? 'bg-white shadow text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}>
                                        {align === 'left' ? <AlignLeft size={12}/> : align === 'center' ? <AlignCenter size={12}/> : <AlignRight size={12}/>}
                                    </button>
                                ))}
                            </div>
                            <div className="flex bg-stone-100 rounded p-1 gap-1 flex-1 justify-between">
                                {['start', 'center', 'end'].map((align) => (
                                    <button key={align} onClick={() => updateCard(card.id, { content: { ...card.content, style: { ...style, verticalAlign: align as any } } } as any)} className={`p-1 rounded ${style.verticalAlign === align ? 'bg-white shadow text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}>
                                        {align === 'start' ? <AlignStartVertical size={12}/> : align === 'center' ? <AlignCenterVertical size={12}/> : <AlignEndVertical size={12}/>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                         <div className="flex-1 flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-stone-900">Size</span>
                             <input type="number" min="12" max="120" value={style.fontSize} onChange={(e) => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, fontSize: parseInt(e.target.value) } } } as any)} className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded font-medium text-stone-900" />
                         </div>
                         <div className="flex-1 flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-stone-900">Text</span>
                             <div className="relative w-full h-[26px] bg-stone-50 border border-stone-200 rounded overflow-hidden">
                                 <input type="color" value={style.textColor} onChange={(e) => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, textColor: e.target.value } } } as any)} className="absolute -top-2 -left-2 w-[200%] h-[200%] cursor-pointer p-0 m-0" />
                             </div>
                         </div>
                         <div className="flex-1 flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-stone-900">Fill</span>
                             <div className="relative w-full h-[26px] bg-stone-50 border border-stone-200 rounded overflow-hidden">
                                 <input type="color" value={style.backgroundColor || "#ffffff"} onChange={(e) => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, backgroundColor: e.target.value } } } as any)} className="absolute -top-2 -left-2 w-[200%] h-[200%] cursor-pointer p-0 m-0" />
                             </div>
                         </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, fontFamily: 'font-serif' } } } as any)} className={`text-[10px] py-1 border rounded ${style.fontFamily === 'font-serif' ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 border-stone-200'}`}>Serif</button>
                        <button onClick={() => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, fontFamily: 'font-sans' } } } as any)} className={`text-[10px] py-1 border rounded ${style.fontFamily === 'font-sans' ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 border-stone-200'}`}>Sans</button>
                        <button onClick={() => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, fontFamily: 'font-mono' } } } as any)} className={`text-[10px] py-1 border rounded ${style.fontFamily === 'font-mono' ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 border-stone-200'}`}>Mono</button>
                    </div>

                    <div className="h-px bg-stone-100 w-full"></div>
                    <div className="flex flex-col gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
                        <div className="flex justify-between">
                            <span className="text-[11px] font-bold text-stone-800">Opacity</span>
                            <span className="text-[10px] text-stone-500">{Math.round(style.opacity * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.1" value={style.opacity} onChange={(e) => updateCard(card.id, { isFlipped: false, content: { ...card.content, style: { ...style, opacity: parseFloat(e.target.value) } } } as any)} className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"/>
                    </div>
                     <button onClick={() => onDelete(card.id)} className="w-full text-center text-xs px-2 py-2 text-red-600 hover:bg-red-50 font-medium rounded border border-transparent hover:border-red-100 flex items-center justify-center gap-2 mt-1"><Trash2 size={14} /> Delete Card</button>
                </div>
            )}

            {menuMode === 'main' && menuTab === 'backside' && (
                <div className="px-3 py-3 flex flex-col gap-3 bg-white h-full overflow-y-auto max-h-[400px]">
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                            <button key={key} onClick={() => updateTemplate(key as TemplateId)} className={`flex flex-col gap-1 p-2 rounded-lg border text-left transition-all ${backData.templateId === key ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900' : 'border-stone-200 hover:border-stone-400'}`}>
                                <span className={`text-xs font-bold ${backData.templateId === key ? 'text-stone-900' : 'text-stone-600'}`}>{tmpl.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-2 px-1 text-center"><p className="font-serif text-lg italic text-stone-500 leading-relaxed">"{currentTemplate.quote}"</p></div>
                </div>
            )}

            {menuMode === 'input' && (
                <div className="px-3 py-3 flex flex-col gap-3 bg-white">
                    <span className="text-xs font-bold text-stone-800">Paste Link (YouTube, Pinterest, Image)</span>
                    <input autoFocus value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://..." className="text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900" onKeyDown={(e) => e.key === 'Enter' && handleFetch()} />
                    <div className="flex gap-2">
                        <button onClick={() => setMenuMode('main')} className="flex-1 text-xs py-2 text-stone-600 hover:bg-stone-100 rounded font-medium border border-stone-200">Back</button>
                        <button onClick={handleFetch} className="flex-1 text-xs py-2 bg-stone-900 text-white hover:bg-stone-800 rounded-lg font-bold flex items-center justify-center gap-1">Fetch</button>
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