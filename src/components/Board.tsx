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
    Layout, ChevronLeft, ChevronRight, Trash2, Menu, Users, Edit2, Check, AlertTriangle,
    Settings, Image as ImageIcon, Type, Square, Youtube, Grid, Palette, UserPlus, Send, Mail
} from "lucide-react";

interface HistoryPoint {
  id: string; createdAt: string; content: any;
}
interface BoardMeta {
  id: string; title: string; updatedAt: string;
}
interface Friend {
  id: string; name: string; image: string; role: string;
}

const GUEST_STORAGE_KEY = "vibo_guest_data";
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
  
  // Rename State
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");

  // Social State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [viewingFriend, setViewingFriend] = useState<Friend | null>(null);
  const [friendBoards, setFriendBoards] = useState<any[]>([]);
  
  // Invite State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // Viewport
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);

  // Background & UI state
  const [boardBackground, setBoardBackground] = useState<string>("dots"); 
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Sync State
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error" | "limit_reached">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [historyList, setHistoryList] = useState<HistoryPoint[]>([]); 
  const [showHistory, setShowHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastSavedString = useRef<string>("");

  const formatDate = (d: string | Date) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  // --- API ACTIONS ---
  
  const fetchBoardList = async () => {
      if (status !== 'authenticated') {
          const localData = localStorage.getItem(GUEST_STORAGE_KEY);
          if (localData) {
              const fakeBoard = { id: GUEST_BOARD_ID, title: "Guest Session", updatedAt: new Date().toISOString() };
              setBoards([fakeBoard]);
              return [fakeBoard];
          }
          return [];
      }
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
      if (saveStatus === "unsaved") {
          if (!confirm("You have unsaved changes. Leave this page?")) return;
      }

      setIsLoadingBoard(true);
      setSidebarOpen(false); 

      try {
        const res = await fetch(`/api/board/sync?id=${id}`);
        if (res.ok) {
            const data = await res.json();
            // Artificial delay removed for speed, but kept logic clean
            const loadedCards = data.content || [];
            setCards(loadedCards);
            setActiveBoardId(id);
            setHistoryList(data.history || []);
            setBoardBackground(data.background || "dots");
            lastSavedString.current = JSON.stringify(loadedCards);
            setSaveStatus("saved");
            setLastSavedTime(formatDate(data.updatedAt));
            setViewingFriend(null);
        } else {
            setSaveStatus("error");
        }
      } catch (e) { 
          console.error(e); 
          setSaveStatus("error"); 
      } finally {
          setIsLoadingBoard(false);
      }
  };

  const createBoard = async (title: string, initialCards: CardData[] = []) => {
      setIsLoadingBoard(true); // INSTANT FEEDBACK
      
      try {
          const res = await fetch("/api/board/sync", {
              method: "POST",
              body: JSON.stringify({ action: "create", title, cards: initialCards, background: "dots" })
          });
          
          if (res.status === 403) {
              setIsLoadingBoard(false);
              setErrorMessage("Max number of boards (10) reached on free plan. Please remove an existing board.");
              return null;
          }
          
          if (res.ok) {
              const newBoard = await res.json();
              await fetchBoardList();
              setActiveBoardId(newBoard.id);
              setCards(initialCards);
              setBoardBackground("dots");
              lastSavedString.current = JSON.stringify(initialCards);
              setSaveStatus("saved");
              setIsLoadingBoard(false); // Done
              setSidebarOpen(false);
              return newBoard;
          }
      } catch (e) { console.error(e); }
      setIsLoadingBoard(false);
      return null;
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
      await fetch("/api/board/sync", {
          method: "POST",
          body: JSON.stringify({ action: "rename", boardId: id, title: editTitleInput })
      });
      await fetchBoardList(); 
  };

  const deleteBoard = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("Are you sure? This board will be deleted forever.")) return;
      
      const res = await fetch("/api/board/sync", {
          method: "POST",
          body: JSON.stringify({ action: "delete", boardId: id })
      });

      if (res.ok) {
          const newBoards = await fetchBoardList();
          if (activeBoardId === id) {
             if (newBoards.length > 0) loadBoard(newBoards[0].id);
             else { setCards([]); setActiveBoardId(null); }
          }
      }
  };

  // --- SOCIAL FUNCTIONS ---
  const fetchFriends = async () => {
      if (status !== 'authenticated') return;
      const res = await fetch("/api/social");
      if (res.ok) {
          const data = await res.json();
          setFriends(data.friends || []);
      }
  };

  const sendInvite = async () => {
      if (!inviteEmail) return;
      setInviteStatus('sending');
      try {
          const res = await fetch("/api/social", {
              method: "POST",
              body: JSON.stringify({ action: "invite", targetEmail: inviteEmail })
          });
          if (res.ok) {
              setInviteStatus('success');
              setTimeout(() => { setShowInviteModal(false); setInviteStatus('idle'); setInviteEmail(''); fetchFriends(); }, 1500);
          } else {
              setInviteStatus('error');
          }
      } catch (e) { setInviteStatus('error'); }
  };

  const selectFriend = async (friend: Friend) => {
      const res = await fetch(`/api/board/sync?userId=${friend.id}`);
      if (res.ok) {
          const data = await res.json();
          setFriendBoards(data.boards || []);
          setViewingFriend(friend);
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
          }
      } catch(e) { console.error(e); }
      setIsLoadingBoard(false);
  };

  // --- SAVE LOGIC ---
  const triggerSave = useCallback(async () => {
    if (viewingFriend) return; 

    if (status !== "authenticated") {
        if (typeof window !== "undefined") {
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(cards));
            setSaveStatus("saved");
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setLastSavedTime(time);
            lastSavedString.current = JSON.stringify(cards);
            setBoards([{ id: GUEST_BOARD_ID, title: "Guest Session", updatedAt: new Date().toISOString() }]);
        }
        return;
    }

    if (!activeBoardId) return; 
    if (saveStatus === "saving" || saveStatus === "limit_reached") return;

    setSaveStatus("saving");
    try {
        const res = await fetch("/api/board/sync", { 
            method: "POST", 
            body: JSON.stringify({ action: "update", boardId: activeBoardId, cards, background: boardBackground }) 
        });
        
        if (res.status === 413) {
            setSaveStatus("limit_reached");
            setErrorMessage("Board Size Exceeded (100MB). Remove some images.");
            return;
        }

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
  }, [cards, status, saveStatus, activeBoardId, viewingFriend, boardBackground]);

  // --- INIT LOGIC ---
  useEffect(() => {
    async function init() {
      let guestCards: CardData[] = [];
      const localData = localStorage.getItem(GUEST_STORAGE_KEY);
      if (localData) guestCards = JSON.parse(localData);

      if (status === "authenticated") {
          fetchFriends();
          const remoteBoards = await fetchBoardList();
          
          if (guestCards.length > 0) {
              const success = await createBoard(`Guest Session ${new Date().toLocaleDateString()}`, guestCards);
              if (success) {
                  localStorage.removeItem(GUEST_STORAGE_KEY);
              } else {
                  setCards(guestCards);
                  setActiveBoardId(null);
                  setSaveStatus("limit_reached");
              }
          } 
          else if (remoteBoards.length > 0) {
              loadBoard(remoteBoards[0].id);
          } 
          else {
              await createBoard(STARTER_BOARDS[0]);
              for (let i = 1; i < STARTER_BOARDS.length; i++) {
                 fetch("/api/board/sync", { method: "POST", body: JSON.stringify({ action: "create", title: STARTER_BOARDS[i] }) });
              }
              setTimeout(fetchBoardList, 1000);
          }
      } else {
          if (guestCards.length > 0) {
              setCards(guestCards);
              setBoards([{ id: GUEST_BOARD_ID, title: "Guest Session", updatedAt: new Date().toISOString() }]);
              setActiveBoardId(GUEST_BOARD_ID);
              setLastSavedTime("Local");
          } else {
              setBoards([]);
          }
      }
      setIsLoaded(true);
    }
    if (status !== "loading") init();
  }, [status]);


  // Autosave
  useEffect(() => {
    const interval = setInterval(() => {
        const currentString = JSON.stringify(cards);
        if (currentString !== lastSavedString.current) triggerSave();
    }, 30000); 
    return () => clearInterval(interval);
  }, [cards, triggerSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); triggerSave(); }};
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSave]);

  // Viewport
  const handleWheel = (e: React.WheelEvent) => { if (e.ctrlKey) { e.preventDefault(); const delta = -e.deltaY; const newScale = Math.min(Math.max(0.1, view.scale * (delta > 0 ? 1.1 : 0.9)), 5); setView(p => ({ ...p, scale: newScale })); } };
  const handlePointerDown = (e: React.PointerEvent) => { if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { e.preventDefault(); isPanning.current = true; } };
  const handlePointerMove = (e: React.PointerEvent) => { if (isPanning.current) setView(p => ({ ...p, x: p.x + e.movementX, y: p.y + e.movementY })); };
  const handlePointerUp = () => { isPanning.current = false; };
  const zoomIn = () => setView(p => ({ ...p, scale: Math.min(p.scale * 1.2, 5) }));
  const zoomOut = () => setView(p => ({ ...p, scale: Math.max(p.scale * 0.8, 0.1) }));
  const handleLogin = () => { if (cards.length > 0) localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(cards)); signIn('google'); };

  const findSmartPosition = () => { if (typeof window === 'undefined') return { x: 0, y: 0 }; const cx = (window.innerWidth / 2 - view.x) / view.scale; const cy = (window.innerHeight / 2 - view.y) / view.scale; return { x: cx - 140 + (Math.random() - 0.5) * 100, y: cy - 190 + (Math.random() - 0.5) * 100 }; };
  
  const addCardOfType = (type: 'text' | 'card' | 'youtube' | 'shape') => {
      const { x, y } = findSmartPosition();
      
      // Default configurations per type
      const defaults = {
          text: { text: "Double click to edit", bg: "transparent", type: 'text' },
          card: { text: "New Intention", bg: "#ffffff", type: 'image' },
          youtube: { text: "", bg: "#000000", type: 'youtube' },
          shape: { text: "", bg: "#e5e7eb", type: 'shape' }
      };
      
      const config = defaults[type];

      const newCard: CardData = {
          id: Math.random().toString(36).substr(2, 9),
          type: config.type as any, 
          x, y, width: 280, height: 380, rotation: 0,
          content: { 
              frontText: config.text, 
              style: { 
                  opacity: 1, fontSize: 32, fontFamily: 'font-serif', fontWeight: 'normal', fontStyle: 'italic', textColor: '#292524',
                  backgroundColor: config.bg,
                  textAlign: 'center', verticalAlign: 'center'
              },
              shapeType: type === 'shape' ? 'circle' : undefined,
              youtubeUrl: "" // Empty for now, will prompt user
          } as any,
          isFlipped: false
      };
      setCards([...cards, newCard]);
      setSelectedId(newCard.id);
      setSaveStatus(status === 'authenticated' ? "unsaved" : "saved");
      setShowAddMenu(false);
  };

  const getBackgroundStyle = () => {
      if (boardBackground === 'dots') return { backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' };
      if (boardBackground === 'grid') return { backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)', backgroundSize: '40px 40px' };
      if (boardBackground.startsWith('#')) return { backgroundColor: boardBackground };
      if (boardBackground.startsWith('url')) return { backgroundImage: boardBackground, backgroundSize: 'cover', backgroundPosition: 'center' };
      return {}; 
  };
  
  const updateCard = (id: string, d: Partial<CardData>) => { setCards(p => p.map(c => c.id === id ? { ...c, ...d } : c)); setSaveStatus("unsaved"); };
  const deleteCard = (id: string) => { setCards(p => p.filter(c => c.id !== id)); setSaveStatus("unsaved"); };
  const restore = (pt: HistoryPoint) => { if (confirm(`Revert to ${formatDate(pt.createdAt)}?`)) { setCards(Array.isArray(pt.content) ? pt.content : []); lastSavedString.current = JSON.stringify(pt.content); setShowHistory(false); triggerSave(); }};

  if (!isLoaded) return <div className="w-full h-screen bg-[#F9F8F6] flex items-center justify-center"><Loader2 size={32} className="animate-spin text-stone-300"/></div>;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F9F8F6] cursor-crosshair touch-none" onPointerDown={(e) => { handlePointerDown(e); setSelectedId(null); }} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onWheel={handleWheel}>
      
      {/* HAMBURGER TOGGLE */}
      <button onClick={() => setSidebarOpen(true)} className="absolute top-6 left-6 z-[60] p-2 bg-white/80 backdrop-blur border border-stone-200 rounded-lg shadow-sm text-stone-600 hover:bg-white hover:text-stone-900 hover:scale-105 transition-all">
          <Menu size={24} />
      </button>

      {/* --- UNIFIED LEFT SIDEBAR --- */}
      <div className={`absolute left-0 top-0 bottom-0 z-[70] flex transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} onPointerDown={e => e.stopPropagation()}>
         <div className="w-72 h-full bg-white border-r border-stone-200 shadow-2xl flex flex-col overflow-hidden">
             
             {/* Header */}
             <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                 <div className="flex items-center gap-2"><Layout size={16} className="text-stone-700"/><span className="text-sm font-bold text-stone-800">My Boards</span></div>
                 <button onClick={() => setSidebarOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={18}/></button>
             </div>
             
             {/* Boards List */}
             <div className="flex-1 overflow-y-auto p-3 space-y-1">
                 {status === 'unauthenticated' && boards.length === 0 && <div className="p-4 text-xs text-stone-400 text-center italic">Start adding cards to create a guest session.</div>}
                 
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
                                 <span className={`text-[10px] font-mono ${activeBoardId === b.id ? 'text-stone-400' : 'text-stone-400'}`}>Updated {new Date(b.updatedAt).toLocaleDateString()}</span>
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

                 {/* FRIENDS SECTION */}
                 <div className="mt-6 mb-2 flex items-center gap-2 px-1 text-stone-400">
                     <Users size={12} />
                     <span className="text-[10px] font-bold uppercase tracking-wider">Friends</span>
                 </div>
                 
                 {friends.length === 0 && (
                     <div className="px-3 py-2 text-xs text-stone-400 italic bg-stone-50 rounded-lg">No friends yet.</div>
                 )}

                 {friends.map(friend => (
                     <div key={friend.id}>
                         <div onClick={() => selectFriend(friend)} className={`p-2 rounded-lg cursor-pointer hover:bg-stone-50 flex items-center gap-2 ${viewingFriend?.id === friend.id ? 'bg-blue-50 text-blue-800' : 'text-stone-600'}`}>
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

             {/* Footer Buttons */}
             {status === 'authenticated' && (
                 <div className="p-3 border-t border-stone-100 bg-stone-50 flex flex-col gap-2">
                     <button onClick={() => createBoard("New Project")} className="w-full py-2 flex items-center justify-center gap-2 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-all shadow-sm">
                         <Plus size={14}/> New Board
                     </button>
                     <button onClick={() => setShowInviteModal(true)} className="w-full py-2 flex items-center justify-center gap-2 text-stone-500 hover:text-stone-800 text-xs font-bold transition-all">
                         <UserPlus size={14} /> Invite Friend
                     </button>
                 </div>
             )}
         </div>
         {/* Click outside to close Sidebar */}
         <div className="w-screen h-full bg-stone-900/20 backdrop-blur-sm cursor-pointer" onClick={() => setSidebarOpen(false)}></div>
      </div>

      {/* --- INVITE MODAL --- */}
      <AnimatePresence>
        {showInviteModal && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden p-6 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Mail size={24}/></div>
                        <h3 className="font-bold text-stone-800">Invite a Friend</h3>
                        <p className="text-xs text-stone-500">Enter their email address to connect.</p>
                        
                        <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="friend@example.com" className="w-full text-sm p-3 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-stone-800"/>
                        
                        <button onClick={sendInvite} disabled={inviteStatus === 'sending'} className="w-full py-2.5 bg-stone-900 text-white rounded-lg font-bold text-xs hover:bg-stone-800 transition-all flex items-center justify-center gap-2">
                            {inviteStatus === 'sending' ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                            {inviteStatus === 'sending' ? 'Sending...' : 'Send Invite'}
                        </button>
                        
                        {inviteStatus === 'success' && <p className="text-xs text-green-600 font-bold">Invite sent successfully!</p>}
                        {inviteStatus === 'error' && <p className="text-xs text-red-500 font-bold">Failed to find user.</p>}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* --- BOARD SETTINGS MODAL --- */}
      <AnimatePresence>
        {showSettings && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                        <div className="flex items-center gap-2"><Palette size={16} className="text-stone-700"/><span className="font-bold text-stone-800 text-sm">Board Settings</span></div>
                        <button onClick={() => setShowSettings(false)}><X size={18} className="text-stone-400 hover:text-stone-700"/></button>
                    </div>
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
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* --- LOADING OVERLAY --- */}
      <AnimatePresence>
        {isLoadingBoard && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[40] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                <motion.img initial={{ scale: 0.9, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }} src="/logo.png" alt="ViBo Logo" className="w-16 h-16 object-contain"/>
                <div className="flex items-center gap-2 text-stone-500"><Loader2 size={18} className="animate-spin"/><span className="text-xs font-bold uppercase tracking-widest">{viewingFriend ? `Loading ${viewingFriend.name}'s Vision...` : 'Switching Board...'}</span></div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* ERROR MODAL */}
      <AnimatePresence>
          {errorMessage && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/20 backdrop-blur-sm px-4">
                  <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full border border-red-100">
                      <div className="flex items-center gap-3 text-red-600 mb-2"><AlertTriangle size={24} /><h3 className="font-bold">Limit Reached</h3></div>
                      <p className="text-sm text-stone-600 mb-4 leading-relaxed">{errorMessage}</p>
                      <button onClick={() => setErrorMessage(null)} className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold">Understood</button>
                  </div>
              </div>
          )}
      </AnimatePresence>

      {/* DYNAMIC BACKGROUND LAYER */}
      <div className="absolute inset-0 pointer-events-none origin-top-left -z-10 transition-colors duration-500" style={{ ...getBackgroundStyle(), transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, opacity: boardBackground.startsWith('url') ? 1 : (boardBackground.startsWith('#') ? 1 : 0.4) }} />

      <motion.div className="absolute top-0 left-0 w-full h-full origin-top-left" style={{ x: view.x, y: view.y, scale: view.scale }} transition={{ type: "tween", ease: "linear", duration: 0 }}>
          {cards.filter(c => c && c.content).map((card) => (
            <VisionCard key={card.id} card={card} isSelected={selectedId === card.id} updateCard={updateCard} onDelete={deleteCard} onSelect={(e) => { e.stopPropagation(); setSelectedId(card.id); }} />
          ))}
      </motion.div>

      {/* GUEST BANNER */}
      <AnimatePresence>
        {status === "unauthenticated" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-stone-900/90 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-xs font-medium">Guest Mode: Login to Sync</span>
                <button onClick={handleLogin} className="text-xs font-bold underline hover:text-orange-200">Log In</button>
            </motion.div>
        )}
      </AnimatePresence>

      {/* ZOOM CONTROLS */}
      <div className="absolute bottom-6 left-6 flex gap-2 z-50">
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
            <button onClick={zoomIn} className="p-2 hover:bg-stone-50 text-stone-600 border-b border-stone-100"><Plus size={16}/></button>
            <button onClick={zoomOut} className="p-2 hover:bg-stone-50 text-stone-600"><Minus size={16}/></button>
        </div>
        <div className="bg-white/80 backdrop-blur border border-stone-200 rounded-lg px-3 flex items-center text-xs font-mono font-bold text-stone-500 shadow-sm">{Math.round(view.scale * 100)}%</div>
      </div>

      <OnboardingModal />

      {/* UPDATED BOTTOM BAR (ADD MENU) */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 z-50">
           <AnimatePresence>
               {showAddMenu && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-white rounded-xl shadow-xl border border-stone-200 p-2 flex flex-col gap-1 mb-2 min-w-[140px]">
                       <button onClick={() => addCardOfType('text')} className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded text-stone-700 text-xs font-bold text-left"><Type size={14}/> Text</button>
                       <button onClick={() => addCardOfType('card')} className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded text-stone-700 text-xs font-bold text-left"><ImageIcon size={14}/> Card</button>
                       <button onClick={() => addCardOfType('youtube')} className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded text-stone-700 text-xs font-bold text-left"><Youtube size={14}/> Video (YT)</button>
                       <button onClick={() => addCardOfType('shape')} className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded text-stone-700 text-xs font-bold text-left"><Square size={14}/> Shape</button>
                   </motion.div>
               )}
           </AnimatePresence>
           
           {!viewingFriend && (
               <button onClick={() => setShowAddMenu(!showAddMenu)} className="flex items-center gap-2 bg-stone-900 text-stone-50 px-4 py-3 rounded-full shadow-lg hover:scale-105 transition-transform">
                   {showAddMenu ? <X size={20} /> : <Plus size={20} />}
                   <span className="text-sm font-medium">{showAddMenu ? "Close" : "Add"}</span>
               </button>
           )}
       </div>

      {/* TOP BAR */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none select-none pl-[80px]">
        <div className="pointer-events-auto flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif text-stone-800 tracking-tight font-bold">{viewingFriend ? `${viewingFriend.name}'s Vision` : (activeBoardId ? boards.find(b => b.id === activeBoardId)?.title || "ViBo" : "ViBo")}</h1>
                <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full"><Settings size={16}/></button>
            </div>
            
            <div className="relative flex gap-1 mt-1">
                {!viewingFriend && (
                    <button onClick={triggerSave} className={`flex items-center gap-2 text-xs transition-all bg-white/50 px-2 py-1.5 rounded-l-md border border-stone-200/50 hover:bg-white hover:border-stone-300 ${status === 'unauthenticated' ? 'opacity-70' : ''}`}>
                        {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin text-blue-500"/>}
                        {saveStatus === 'saved' && <Cloud size={12} className="text-blue-500"/>}
                        {(saveStatus === 'unsaved' || saveStatus === 'limit_reached') && <CloudOff size={12} className="text-orange-400"/>}
                        {saveStatus === 'error' && <X size={12} className="text-red-500"/>}
                        <span className="font-medium">{status === 'unauthenticated' ? "Guest (Local)" : saveStatus === 'saving' ? "Saving..." : saveStatus === 'limit_reached' ? "Not Saved" : saveStatus === 'unsaved' ? "Unsaved" : `Saved ${lastSavedTime}`}</span>
                    </button>
                )}
                {!viewingFriend && (
                    <button onClick={() => setShowHistory(!showHistory)} className="bg-white/50 px-1.5 py-1.5 rounded-r-md border border-l-0 border-stone-200/50 hover:bg-white hover:border-stone-300 text-stone-500 hover:text-stone-800"><History size={12} /></button>
                )}
                {showHistory && !viewingFriend && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-stone-100 overflow-hidden flex flex-col z-[60]">
                        <div className="px-3 py-2 bg-stone-50 border-b border-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-500 flex justify-between"><span>History</span><span className="text-stone-400">{historyList.length}/10</span></div>
                        <div className="max-h-64 overflow-y-auto">
                            {status === 'authenticated' && historyList.map((point) => (
                                <button key={point.id} onClick={() => restore(point)} className="w-full text-left px-3 py-2.5 text-xs text-stone-600 hover:bg-blue-50 hover:text-blue-600 flex justify-between border-b border-stone-50 last:border-0 group">
                                    <span className="font-medium group-hover:translate-x-1 transition-transform">{formatDate(point.createdAt)}</span><span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">{Array.isArray(point.content) ? point.content.length : 0} items</span>
                                </button>
                            ))}
                            {status === 'unauthenticated' && <div className="p-4 text-center text-xs text-stone-400 italic">Cloud history not available in guest mode</div>}
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