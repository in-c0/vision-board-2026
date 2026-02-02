"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import VisionCard from "./VisionCard";
import HelpModal from "./HelpModal";
import OnboardingModal from "./OnboardingModal"; 
import { CardData } from "@/types/board";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Minus, Loader2, Cloud, CloudOff, X, User, LogIn, History, 
  Layout, Trash2, Menu, Users, Edit2, Check, AlertTriangle,
  Settings, Image as ImageIcon, Type, Square, Youtube, Palette, Shuffle, Lock,
  CheckCircle, AlertCircle, Info // NEW ICONS
} from "lucide-react";

interface HistoryPoint { id: string; createdAt: string; content: any; }
interface BoardMeta { id: string; title: string; updatedAt: string; }
interface Friend { id: string; name: string; image: string; role: string; }

const GUEST_STORAGE_KEY = "vibo_guest_data";
const GUEST_HISTORY_KEY = "vibo_guest_history";
const GUEST_BOARD_ID = "guest-session";

const STARTER_BOARDS = [
  "My 2026 Vision Board",
  "How it went - Dec 2025",
  "My Career Vision",
  "Healing after breakup",
  "Project: The Arcade Gym"
];

export default function Board() {
  const { data: session, status } = useSession();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  
  // Board State
  const [cards, setCards] = useState<CardData[]>([]);
  const [boards, setBoards] = useState<BoardMeta[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Context Menu & Settings
  const [contextMenuPos, setContextMenuPos] = useState<{x: number, y: number} | null>(null);
  const [randomRotation, setRandomRotation] = useState(true);

  // Rename
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");

  // Social
  const [friends, setFriends] = useState<Friend[]>([]);
  const [viewingFriend, setViewingFriend] = useState<Friend | null>(null);
  const [friendBoards, setFriendBoards] = useState<any[]>([]);
  
  // UI
  const [boardBackground, setBoardBackground] = useState<string>("dots"); 
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Sync
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error" | "limit_reached">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [historyList, setHistoryList] = useState<HistoryPoint[]>([]); 
  const [showHistory, setShowHistory] = useState(false);
  
  // NEW: Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastSavedString = useRef<string>("");
  
  // Viewport
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const viewState = view;

  const formatDate = (d: string | Date) => {
      if (!d) return "Unknown";
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return "Just now";
      return dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  // --- TOAST HELPER ---
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToast({ message, type });
      toastTimeoutRef.current = setTimeout(() => setToast(null), 3000); // Auto dismiss after 3s
  };

  // --- API ACTIONS ---
  
  const fetchBoardList = async () => {
      if (status !== 'authenticated') return [];
      const res = await fetch("/api/board/sync"); 
      if (res.ok) {
          const data = await res.json();
          setBoards(data.boards || []);
          return data.boards;
      }
      return [];
  };

  const loadBoard = async (id: string) => {
      if (id === GUEST_BOARD_ID) return;
      
      if (saveStatus === "unsaved" && !viewingFriend) {
          if (!confirm("You have unsaved changes. Leave this page?")) return;
      }

      setIsLoadingBoard(true);
      setSidebarOpen(false); 

      try {
        const res = await fetch(`/api/board/sync?id=${id}`);
        if (res.ok) {
            const data = await res.json();
            const loadedCards = data.content || [];
            setCards(loadedCards);
            setActiveBoardId(id);
            setHistoryList(data.history || []);
            setBoardBackground(data.background || "dots");
            setRandomRotation(data.randomRotation !== undefined ? data.randomRotation : true);
            
            lastSavedString.current = JSON.stringify(loadedCards);
            setSaveStatus("saved");
            
            if (data.updatedAt) setLastSavedTime(formatDate(data.updatedAt));
            
            setViewingFriend(null);
            // TOAST: Success
            showToast("Board loaded successfully", "success");
        } else {
            setSaveStatus("error");
            showToast("Failed to load board", "error");
        }
      } catch (e) { 
          console.error(e); 
          setSaveStatus("error"); 
          showToast("Connection error", "error");
      } 
      finally { setIsLoadingBoard(false); }
  };

  const createBoard = async (title: string, initialCards: CardData[] = []) => {
      setIsLoadingBoard(true); 
      try {
          const res = await fetch("/api/board/sync", {
              method: "POST",
              body: JSON.stringify({ action: "create", title, cards: initialCards, background: boardBackground, randomRotation })
          });
          
          if (res.status === 403) {
              setSaveStatus("limit_reached");
              setShowLimitModal(true);
              setIsLoadingBoard(false);
              return false;
          }
          
          if (res.ok) {
              const newBoard = await res.json();
              await fetchBoardList();
              setActiveBoardId(newBoard.id);
              setCards(initialCards);
              
              lastSavedString.current = JSON.stringify(initialCards);
              setSaveStatus("saved");
              setSidebarOpen(false);
              showToast("New board created", "success");
              return true;
          }
      } catch (e) { console.error(e); showToast("Failed to create board", "error"); }
      setIsLoadingBoard(false);
      return false;
  };

  const syncGuestToCloud = async () => {
      const localData = localStorage.getItem(GUEST_STORAGE_KEY);
      if (!localData) return;

      const guestCards = JSON.parse(localData);
      
      setIsLoadingBoard(true);
      const success = await createBoard("My Guest Board", guestCards);
      
      if (success) {
          localStorage.removeItem(GUEST_STORAGE_KEY);
          localStorage.removeItem(GUEST_HISTORY_KEY);
          setLastSavedTime("Synced to Cloud");
          showToast("Guest data synced to cloud", "success");
      }
      setIsLoadingBoard(false);
  };

  const deleteBoard = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("Are you sure? This board will be deleted forever.")) return;
      const res = await fetch("/api/board/sync", { method: "POST", body: JSON.stringify({ action: "delete", boardId: id }) });
      if (res.ok) {
          const newBoards = await fetchBoardList();
          showToast("Board deleted", "info");
          if (activeBoardId === id) { 
              if (newBoards.length > 0) loadBoard(newBoards[0].id);
              else { setCards([]); setActiveBoardId(null); }
          } else if (saveStatus === 'limit_reached') {
              triggerSave();
          }
      } else {
          showToast("Failed to delete board", "error");
      }
  };

  const startRenaming = (e: React.MouseEvent, board: BoardMeta) => {
      e.stopPropagation(); 
      setEditingBoardId(board.id);
      setEditTitleInput(board.title);
  };

  const saveRename = async (id: string) => {
      if (!editTitleInput.trim()) return setEditingBoardId(null); 
      setBoards(prev => prev.map(b => b.id === id ? { ...b, title: editTitleInput } : b));
      setEditingBoardId(null);
      await fetch("/api/board/sync", { method: "POST", body: JSON.stringify({ action: "rename", boardId: id, title: editTitleInput }) });
      await fetchBoardList(); 
      showToast("Board renamed", "success");
  };

  // --- SOCIAL & FRIENDS ---
  const fetchFriends = async () => {
    const ava = { id: 'ava-dev', name: 'Ava Ji Young Kim', image: '', role: 'DEV' };
    if (status !== 'authenticated') return;
    try {
        const res = await fetch("/api/social");
        if (res.ok) {
            const data = await res.json();
            let list = data.friends || [];
            if (!list.find((f:any) => f.role === 'DEV')) list.unshift(ava);
            setFriends(list);
        } else { setFriends([ava]); }
    } catch (e) { setFriends([ava]); }
  };
  
  const selectFriend = async (friend: Friend) => {
      const res = await fetch(`/api/board/sync?userId=${friend.id}`);
      if (res.ok) {
          const data = await res.json();
          const boards = data.boards || [];
          setFriendBoards(boards);
          setViewingFriend(friend);
          if (boards.length > 0) {
              loadFriendBoard(friend, boards[0].id);
          } else {
              setCards([]); 
              setActiveBoardId(null);
              showToast("Friend has no public boards", "info");
          }
      }
  };

  const loadFriendBoard = async (friend: Friend, boardId: string) => {
      setIsLoadingBoard(true);
      setViewingFriend(friend);
      setSidebarOpen(false); 
      try {
          const res = await fetch(`/api/board/sync?id=${boardId}&userId=${friend.id}`);
          if (res.ok) {
              const data = await res.json();
              setCards(data.content || []);
              setBoardBackground(data.background || "dots");
              setActiveBoardId(boardId);
              setSaveStatus("saved"); 
              showToast(`Viewing ${friend.name}'s board`, "info");
          }
      } catch(e) { console.error(e); showToast("Could not load friend's board", "error"); }
      setIsLoadingBoard(false);
  };

  // --- ACTIONS ---
  const handleBoardContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if ((e.target as HTMLElement).closest('.group')) return;
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowAddMenu(true);
  };

  const bringToFront = (id: string) => {
    setCards(prev => {
        const index = prev.findIndex(c => c.id === id);
        if (index === -1 || index === prev.length - 1) return prev;
        const newCards = [...prev];
        const [moved] = newCards.splice(index, 1);
        newCards.push(moved);
        return newCards;
    });
    setSelectedId(id);
  };

  const findSmartPosition = () => { if (typeof window === 'undefined') return { x: 0, y: 0 }; const cx = (window.innerWidth / 2 - view.x) / view.scale; const cy = (window.innerHeight / 2 - view.y) / view.scale; return { x: cx - 140 + (Math.random() - 0.5) * 100, y: cy - 190 + (Math.random() - 0.5) * 100 }; };

  const addCardOfType = (type: 'text' | 'card' | 'youtube' | 'shape') => {
    let x, y;
    if (contextMenuPos) {
        x = (contextMenuPos.x - viewState.x) / viewState.scale;
        y = (contextMenuPos.y - viewState.y) / viewState.scale;
    } else {
        const pos = findSmartPosition();
        x = pos.x; y = pos.y;
    }

    const defaults = {
        text: { text: "Double click to edit", bg: "transparent", type: 'text' },
        card: { text: "", bg: "#ffffff", type: 'image' },
        youtube: { text: "", bg: "#000000", type: 'youtube' },
        shape: { text: "", bg: "#e5e7eb", type: 'shape' }
    };
    const config = defaults[type];
    const rot = randomRotation ? (Math.random() - 0.5) * 16 : 0;

    const newCard: CardData = {
        id: Math.random().toString(36).substr(2, 9),
        type: config.type as any, 
        x, y, width: 280, height: 380, rotation: rot,
        content: { 
            frontText: config.text, 
            style: { 
                opacity: 1, fontSize: 32, fontFamily: 'font-serif', fontWeight: 'normal', fontStyle: 'italic', textColor: '#292524',
                backgroundColor: config.bg,
                textAlign: 'center', verticalAlign: 'center'
            },
            shapeType: type === 'shape' ? 'circle' : undefined,
            youtubeUrl: "" 
        } as any,
        isFlipped: false
    };
    setCards([...cards, newCard]);
    setSelectedId(newCard.id);
    setSaveStatus("unsaved"); 
    setShowAddMenu(false);
    setContextMenuPos(null);
  };


  // --- SAVE LOGIC ---
  const triggerSave = useCallback(async () => {
    if (!isLoaded || viewingFriend) return;

    // --- GUEST SAVE ---
    if (status === "unauthenticated") {
        setSaveStatus("saving");
        // Simulated Delay for Visual Feedback
        await new Promise(resolve => setTimeout(resolve, 600));

        const newPoint: HistoryPoint = {
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString(),
            content: cards 
        };

        const updatedHistory = [newPoint, ...historyList].slice(0, 10);
        
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(cards));
        localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(updatedHistory));
        
        setHistoryList(updatedHistory);
        setLastSavedTime("Local (Guest)");
        setSaveStatus("saved");
        lastSavedString.current = JSON.stringify(cards);
        
        // TOAST: Guest Save Success
        showToast("Saved locally", "success");
        return;
    }
    
    // --- AUTHENTICATED SAVE ---
    if (!activeBoardId && status === "authenticated") {
        const success = await createBoard("My New Board", cards);
        if (!success) return; 
    }

    if (!activeBoardId) return;

    setSaveStatus("saving");
    try {
        const res = await fetch("/api/board/sync", { 
            method: "POST", 
            body: JSON.stringify({ action: "update", boardId: activeBoardId, cards, background: boardBackground, randomRotation }) 
        });
        
        if (res.status === 403 || res.status === 413) {
            setSaveStatus("limit_reached");
            setShowLimitModal(true);
            return;
        }

        if (res.ok) {
            const data = await res.json();
            setSaveStatus("saved");
            if (data.updatedAt) setLastSavedTime(formatDate(data.updatedAt));
            else setLastSavedTime(formatDate(new Date().toISOString()));
            
            setHistoryList(data.history || []);
            lastSavedString.current = JSON.stringify(cards);
            // Note: We don't toast on auto-save success to avoid spamming the user
        } else {
            setSaveStatus("error");
            showToast("Failed to save changes", "error");
        }
    } catch (e) { 
        setSaveStatus("error"); 
        showToast("Connection failed", "error");
    }
  }, [cards, status, activeBoardId, viewingFriend, boardBackground, randomRotation, isLoaded, historyList]);

  // --- INIT ---
  useEffect(() => {
    async function init() {
      if (status === "authenticated") {
          fetchFriends();
          const remoteBoards = await fetchBoardList() as any || [];
          
          const localGuestData = localStorage.getItem(GUEST_STORAGE_KEY);
          if (localGuestData) {
              await syncGuestToCloud();
              const updatedBoards = await fetchBoardList() as any || [];
              if (updatedBoards.length > 0) await loadBoard(updatedBoards[0].id);
          } else {
              if (remoteBoards.length > 0) await loadBoard(remoteBoards[0].id);
              else await createBoard(STARTER_BOARDS[0]);
          }
      } else {
          // Guest Init
          setIsLoadingBoard(true); 
          await new Promise(resolve => setTimeout(resolve, 800));

          const localData = localStorage.getItem(GUEST_STORAGE_KEY);
          const localHistory = localStorage.getItem(GUEST_HISTORY_KEY);
          
          if (localData) {
              setCards(JSON.parse(localData));
              if (localHistory) setHistoryList(JSON.parse(localHistory)); 
              
              setBoards([{ id: GUEST_BOARD_ID, title: "Guest Session", updatedAt: new Date().toISOString() }]);
              setActiveBoardId(GUEST_BOARD_ID);
              setLastSavedTime("Local");
              lastSavedString.current = localData; 
          } else {
              setActiveBoardId(GUEST_BOARD_ID);
          }
          setIsLoadingBoard(false);
      }
      setIsLoaded(true);
    }
    if (status !== "loading") init();
  }, [status]);

  // Autosave
  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => { 
        if (JSON.stringify(cards) !== lastSavedString.current) triggerSave(); 
    }, 30000); 
    return () => clearInterval(interval);
  }, [cards, triggerSave, isLoaded]);

  // ... (Event Listeners & Utils same as before) ...
  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          if (!viewingFriend && (saveStatus === 'unsaved' || saveStatus === 'limit_reached')) {
              e.preventDefault(); 
              e.returnValue = '';
          }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus, viewingFriend]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); triggerSave(); }};
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSave]);

  const handleWheel = (e: React.WheelEvent) => { if (e.ctrlKey) { e.preventDefault(); const delta = -e.deltaY; const newScale = Math.min(Math.max(0.1, view.scale * (delta > 0 ? 1.1 : 0.9)), 5); setView(p => ({ ...p, scale: newScale })); } };
  const handlePointerDown = (e: React.PointerEvent) => { 
      if (showAddMenu) { setShowAddMenu(false); setContextMenuPos(null); }
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { e.preventDefault(); isPanning.current = true; } 
      setSelectedId(null); 
  };
  const handlePointerMove = (e: React.PointerEvent) => { if (isPanning.current) setView(p => ({ ...p, x: p.x + e.movementX, y: p.y + e.movementY })); };
  const handlePointerUp = () => { isPanning.current = false; };
  const zoomIn = () => setView(p => ({ ...p, scale: Math.min(p.scale * 1.2, 5) }));
  const zoomOut = () => setView(p => ({ ...p, scale: Math.max(p.scale * 0.8, 0.1) }));
  const handleLogin = () => signIn('google');

  const getBackgroundStyle = () => {
      if (boardBackground === 'dots') return { backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' };
      if (boardBackground === 'grid') return { backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)', backgroundSize: '40px 40px' };
      if (boardBackground.startsWith('#')) return { backgroundColor: boardBackground };
      return {}; 
  };

  const updateCard = (id: string, d: Partial<CardData>) => { setCards(p => p.map(c => c.id === id ? { ...c, ...d } : c)); setSaveStatus("unsaved"); };
  
  const deleteCard = (id: string) => {
      setCards(prev => prev.filter(c => c.id !== id));
      if (selectedId === id) setSelectedId(null);
      setSaveStatus("unsaved");
  };
  
  if (!isLoaded) return <div className="w-full h-screen bg-[#F9F8F6] flex items-center justify-center"><Loader2 size={32} className="animate-spin text-stone-300"/></div>;

  function restore(point: HistoryPoint): void {
      if (!Array.isArray(point.content)) return;
      setCards(point.content as CardData[]);
      setSaveStatus("saved"); 
      lastSavedString.current = JSON.stringify(point.content);
      // Removed triggerSave() for explicit history restore
      showToast("Board history restored", "info");
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F9F8F6] cursor-crosshair touch-none" onContextMenu={handleBoardContextMenu} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onWheel={handleWheel}>
      
      <button onClick={() => setSidebarOpen(true)} className="absolute top-6 left-6 z-[60] p-2 bg-white/80 backdrop-blur border border-stone-200 rounded-lg shadow-sm text-stone-600 hover:bg-white hover:text-stone-900 hover:scale-105 transition-all"><Menu size={24} /></button>

      {/* SIDEBAR ... (Same) */}
      <div className={`absolute left-0 top-0 bottom-0 z-[70] flex transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} onPointerDown={e => e.stopPropagation()}>
         <div className="w-72 h-full bg-white border-r border-stone-200 shadow-2xl flex flex-col overflow-hidden">
             <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                 <div className="flex items-center gap-2"><Layout size={16} className="text-stone-700"/><span className="text-sm font-bold text-stone-800">My Boards</span></div>
                 <button onClick={() => setSidebarOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={18}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-3 space-y-1">
                 {boards.map(b => (
                     <div key={b.id} onClick={() => loadBoard(b.id)} className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${activeBoardId === b.id ? 'bg-stone-900 text-white border-stone-900 shadow-md' : 'bg-white border-transparent hover:bg-stone-100 text-stone-600'}`}>
                         {editingBoardId === b.id ? (
                             <div className="flex items-center gap-2 w-full">
                                 <input autoFocus value={editTitleInput} onChange={(e) => setEditTitleInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveRename(b.id)} onClick={(e) => e.stopPropagation()} className="w-full text-xs font-bold p-1 rounded text-stone-900 outline-none ring-2 ring-blue-500"/>
                                 <button onClick={(e) => { e.stopPropagation(); saveRename(b.id); }} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={12}/></button>
                             </div>
                         ) : (
                             <div className="flex flex-col gap-0.5 truncate">
                                 <span className="text-xs font-bold truncate max-w-[150px]">{b.title}</span>
                                 <span className={`text-[10px] font-mono ${activeBoardId === b.id ? 'text-stone-400' : 'text-stone-400'}`}>Updated {formatDate(b.updatedAt)}</span>
                             </div>
                         )}
                         {b.id !== GUEST_BOARD_ID && !editingBoardId && (
                            <div className="hidden group-hover:flex items-center gap-1">
                                <button onClick={(e) => startRenaming(e, b)} className={`p-1.5 rounded ${activeBoardId === b.id ? 'hover:bg-stone-700 text-stone-400 hover:text-white' : 'hover:bg-stone-200 text-stone-400 hover:text-stone-600'}`}><Edit2 size={12}/></button>
                                <button onClick={(e) => deleteBoard(b.id, e)} className={`p-1.5 rounded ${activeBoardId === b.id ? 'hover:bg-red-500/50 text-red-400 hover:text-white' : 'hover:bg-red-500/20 text-red-300 hover:text-red-600'}`}><Trash2 size={12}/></button>
                            </div>
                         )}
                     </div>
                 ))}
                 
                 {/* ... Friends List ... */}
                 <div className="mt-6 mb-2 flex items-center gap-2 px-1 text-stone-400"><Users size={12} /><span className="text-[10px] font-bold uppercase tracking-wider">Friends</span></div>
                 {friends.length === 0 && <div className="px-3 py-2 text-xs text-stone-400 italic bg-stone-50 rounded-lg">No friends yet.</div>}
                 {friends.map(friend => (
                     <div key={friend.id}>
                         <div onClick={() => { if(friend.id === 'ava-dev' || friend.id !== session?.user?.id) selectFriend(friend) }} className={`p-2 rounded-lg cursor-pointer hover:bg-stone-50 flex items-center gap-2 ${viewingFriend?.id === friend.id ? 'bg-blue-50 text-blue-800' : 'text-stone-600'}`}>
                             <img src={friend.image || "/default-avatar.png"} className="w-6 h-6 rounded-full border border-stone-200"/>
                             <span className="text-xs font-bold truncate">{friend.name}</span>
                             {friend.role === 'DEV' && <span className="bg-blue-100 text-blue-700 text-[8px] px-1 rounded font-bold">DEV</span>}
                         </div>
                         {viewingFriend?.id === friend.id && (
                             <div className="ml-8 mt-1 space-y-1 border-l-2 border-blue-100 pl-2">
                                 {friendBoards.length === 0 && <span className="text-[10px] text-stone-400">No public boards</span>}
                                 {friendBoards.map(fb => (
                                     <button key={fb.id} onClick={() => loadFriendBoard(friend, fb.id)} className={`block w-full text-left text-[11px] py-1 px-1 rounded truncate ${activeBoardId === fb.id ? 'font-bold text-blue-600' : 'text-stone-500 hover:text-stone-800'}`}>
                                         {fb.title}
                                     </button>
                                 ))}
                             </div>
                         )}
                     </div>
                 ))}
             </div>
             
             {status === 'authenticated' && (
                 <div className="p-3 border-t border-stone-100 bg-stone-50 flex flex-col gap-2">
                     <button onClick={() => createBoard("New Project")} className="w-full py-2 flex items-center justify-center gap-2 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-all shadow-sm"><Plus size={14}/> New Board</button>
                     <button disabled className="w-full py-2 flex items-center justify-center gap-2 text-stone-400 text-xs font-bold transition-all cursor-not-allowed"><Lock size={12} /> Invite Friend (Soon)</button>
                 </div>
             )}
         </div>
         <div className="w-screen h-full bg-stone-900/20 backdrop-blur-sm cursor-pointer" onClick={() => setSidebarOpen(false)}></div>
      </div>

      {/* LIMIT MODAL ... (Same) */}
      <AnimatePresence>
        {showLimitModal && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setShowLimitModal(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500"><AlertTriangle size={24} /></div>
                    <h2 className="text-lg font-bold text-stone-900 mb-2">Storage Limit Reached</h2>
                    <p className="text-sm text-stone-500 mb-6">You have reached the maximum of 10 boards. Please delete an existing board to save this new one.</p>
                    <div className="flex gap-2 justify-center">
                        <button onClick={() => { setShowLimitModal(false); setSidebarOpen(true); }} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-bold hover:bg-stone-800">Open Board List</button>
                        <button onClick={() => setShowLimitModal(false)} className="px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-bold hover:bg-stone-50">Cancel</button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL ... (Same) */}
      <AnimatePresence>
        {showSettings && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                        <div className="flex items-center gap-2"><Palette size={16} className="text-stone-700"/><span className="font-bold text-stone-800 text-sm">Board Settings</span></div>
                        <button onClick={() => setShowSettings(false)}><X size={18} className="text-stone-400 hover:text-stone-700"/></button>
                    </div>
                    {/* ... Settings Content (Same) ... */}
                    <div className="p-5 flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase text-stone-400 tracking-wider">Background Style</span>
                            <div className="grid grid-cols-5 gap-3">
                                <button onClick={() => setBoardBackground("dots")} className={`w-10 h-10 rounded-full border bg-[radial-gradient(#000_1px,transparent_1px)] bg-[length:6px_6px] ${boardBackground === 'dots' ? 'ring-2 ring-stone-900 border-transparent' : 'border-stone-200'}`} title="Dots"></button>
                                <button onClick={() => setBoardBackground("grid")} className={`w-10 h-10 rounded-full border bg-[linear-gradient(#000_1px,transparent_1px),linear-gradient(90deg,#000_1px,transparent_1px)] bg-[length:10px_10px] ${boardBackground === 'grid' ? 'ring-2 ring-stone-900 border-transparent' : 'border-stone-200'}`} title="Grid"></button>
                                <button onClick={() => setBoardBackground("#fefce8")} className={`w-10 h-10 rounded-full border bg-yellow-50 ${boardBackground === '#fefce8' ? 'ring-2 ring-stone-900 border-transparent' : 'border-stone-200'}`} title="Yellow"></button>
                                <button onClick={() => setBoardBackground("#ecfeff")} className={`w-10 h-10 rounded-full border bg-cyan-50 ${boardBackground === '#ecfeff' ? 'ring-2 ring-stone-900 border-transparent' : 'border-stone-200'}`} title="Cyan"></button>
                                <div className="relative w-10 h-10 rounded-full border border-stone-200 overflow-hidden flex items-center justify-center hover:border-stone-400 transition-colors">
                                    <input type="color" onChange={(e) => setBoardBackground(e.target.value)} className="absolute inset-0 w-[150%] h-[150%] -left-[25%] -top-[25%] p-0 m-0 cursor-pointer border-none" title="Custom Color"/>
                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/20"><Plus size={14} className="text-stone-500"/></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                            <div className="flex items-center gap-2"><Shuffle size={14} className="text-stone-500" /><span className="text-xs font-bold text-stone-700">Random Rotation</span></div>
                            <input type="checkbox" checked={randomRotation} onChange={(e) => setRandomRotation(e.target.checked)} className="accent-stone-900" />
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoadingBoard && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[40] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                <motion.img initial={{ scale: 0.9, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }} src="/logo.png" alt="ViBo Logo" className="w-16 h-16 object-contain"/>
                <div className="flex items-center gap-2 text-stone-500"><Loader2 size={18} className="animate-spin"/><span className="text-xs font-bold uppercase tracking-widest">{viewingFriend ? `Loading ${viewingFriend.name}'s Vision...` : 'Switching Board...'}</span></div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 pointer-events-none origin-top-left -z-10 transition-colors duration-500" style={{ ...getBackgroundStyle(), transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`, opacity: boardBackground.startsWith('url') ? 1 : (boardBackground.startsWith('#') ? 1 : 0.4) }} />
      <motion.div className="absolute top-0 left-0 w-full h-full origin-top-left" style={{ x: viewState.x, y: viewState.y, scale: viewState.scale }} transition={{ type: "tween", ease: "linear", duration: 0 }}>
          {cards.filter(c => c && c.content).map((card) => (
            <VisionCard 
                key={card.id} 
                card={card} 
                isSelected={selectedId === card.id} 
                updateCard={updateCard} 
                onDelete={deleteCard} 
                onSelect={(e) => { e.stopPropagation(); bringToFront(card.id); }} 
            />
          ))}
      </motion.div>

      {/* TOAST NOTIFICATION COMPONENT */}
      <AnimatePresence>
        {toast && (
            <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 20, scale: 0.9 }} 
                className="fixed bottom-6 right-1/2 translate-x-1/2 md:right-6 md:translate-x-0 z-[100] flex items-center gap-3 px-4 py-3 bg-white border border-stone-200 rounded-xl shadow-2xl"
            >
                {toast.type === 'success' && <div className="p-1 rounded-full bg-green-100 text-green-600"><CheckCircle size={16}/></div>}
                {toast.type === 'error' && <div className="p-1 rounded-full bg-red-100 text-red-600"><AlertCircle size={16}/></div>}
                {toast.type === 'info' && <div className="p-1 rounded-full bg-blue-100 text-blue-600"><Info size={16}/></div>}
                <span className={`text-sm font-bold ${toast.type === 'error' ? 'text-red-700' : 'text-stone-800'}`}>{toast.message}</span>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === "unauthenticated" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-stone-900/90 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-xs font-medium">Guest Mode: Login to Sync</span>
                <button onClick={handleLogin} className="text-xs font-bold underline hover:text-orange-200">Log In</button>
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

      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 z-50">
           <AnimatePresence>
               {showAddMenu && contextMenuPos && (
                   <div className="fixed z-[100]" style={{ top: contextMenuPos.y, left: contextMenuPos.x }}>
                       <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-xl shadow-xl border border-stone-200 p-2 flex flex-col gap-1 min-w-[140px]">
                           <button onClick={() => addCardOfType('text')} className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded text-stone-700 text-xs font-bold text-left"><Type size={14}/> Text</button>
                           <button onClick={() => addCardOfType('card')} className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded text-stone-700 text-xs font-bold text-left"><ImageIcon size={14}/> Card</button>
                           <button onClick={() => addCardOfType('youtube')} className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded text-stone-700 text-xs font-bold text-left"><Youtube size={14}/> Video (YT)</button>
                           <button onClick={() => addCardOfType('shape')} className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded text-stone-700 text-xs font-bold text-left"><Square size={14}/> Shape</button>
                       </motion.div>
                   </div>
               )}
               {showAddMenu && !contextMenuPos && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-white rounded-xl shadow-xl border border-stone-200 p-2 flex flex-col gap-1 mb-2 min-w-[140px]">
                       <button onClick={() => addCardOfType('text')} className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded text-stone-700 text-xs font-bold text-left"><Type size={14}/> Text</button>
                       <button onClick={() => addCardOfType('card')} className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded text-stone-700 text-xs font-bold text-left"><ImageIcon size={14}/> Card</button>
                       <button onClick={() => addCardOfType('youtube')} className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded text-stone-700 text-xs font-bold text-left"><Youtube size={14}/> Video (YT)</button>
                       <button onClick={() => addCardOfType('shape')} className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded text-stone-700 text-xs font-bold text-left"><Square size={14}/> Shape</button>
                   </motion.div>
               )}
           </AnimatePresence>
           {!viewingFriend && (
               <button onClick={() => { setShowAddMenu(!showAddMenu); if (!showAddMenu) setContextMenuPos(null); }} className="flex items-center gap-2 bg-stone-900 text-stone-50 px-4 py-3 rounded-full shadow-lg hover:scale-105 transition-transform">
                   {showAddMenu ? <X size={20} /> : <Plus size={20} />}
                   <span className="text-sm font-medium">{showAddMenu ? "Close" : "Add"}</span>
               </button>
           )}
       </div>

      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none select-none pl-[80px]">
        <div className="pointer-events-auto flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif text-stone-800 tracking-tight font-bold">{viewingFriend ? `${viewingFriend.name}'s Vision` : (activeBoardId ? boards.find(b => b.id === activeBoardId)?.title || "ViBo" : "ViBo")}</h1>
                <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full"><Settings size={16}/></button>
            </div>
            
            <div className="relative flex gap-1 mt-1">
                {!viewingFriend && (
                    <button onClick={triggerSave} className={`flex items-center gap-2 text-xs transition-all bg-white/90 px-2 py-1.5 rounded-l-md border border-stone-200/50 hover:bg-white hover:border-stone-300 ${status === 'unauthenticated' ? 'opacity-70' : ''}`}>
                        {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin text-blue-500"/>}
                        {saveStatus === 'saved' && <Cloud size={12} className="text-blue-500"/>}
                        {(saveStatus === 'unsaved' || saveStatus === 'limit_reached') && <CloudOff size={12} className="text-orange-400"/>}
                        {saveStatus === 'error' && <X size={12} className="text-red-500"/>}
                        <span className="font-bold text-stone-900">{status === 'unauthenticated' ? "Guest (Local)" : saveStatus === 'saving' ? "Saving..." : saveStatus === 'limit_reached' ? "Not Saved" : saveStatus === 'unsaved' ? "Unsaved" : `Saved ${lastSavedTime}`}</span>
                    </button>
                )}
                {!viewingFriend && (
                    <button onClick={() => setShowHistory(!showHistory)} className="bg-white/90 px-1.5 py-1.5 rounded-r-md border border-l-0 border-stone-200/50 hover:bg-white hover:border-stone-300 text-stone-500 hover:text-stone-800"><History size={12} /></button>
                )}
                {showHistory && !viewingFriend && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-stone-100 overflow-hidden flex flex-col z-[60]">
                        <div className="px-3 py-2 bg-stone-50 border-b border-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-500 flex justify-between"><span>History</span><span className="text-stone-400">{historyList.length}/10</span></div>
                        <div className="max-h-64 overflow-y-auto">
                            {historyList.map((point) => (
                                <button key={point.id} onClick={() => restore(point)} className="w-full text-left px-3 py-2.5 text-xs text-stone-600 hover:bg-blue-50 hover:text-blue-600 flex justify-between border-b border-stone-50 last:border-0 group">
                                    <span className="font-medium group-hover:translate-x-1 transition-transform">{formatDate(point.createdAt)}</span><span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">{Array.isArray(point.content) ? point.content.length : 0} items</span>
                                </button>
                            ))}
                            {historyList.length === 0 && <div className="p-4 text-center text-xs text-stone-400 italic">No history yet</div>}
                        </div>
                    </div>
                )}
                {viewingFriend && (
                    <div className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2"><Users size={12} /> Spectator Mode</div>
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
                    <button onClick={handleLogin} className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-stone-600 text-xs font-bold hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm"><LogIn size={14} /> Log in</button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}