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
    Layout, ChevronLeft, ChevronRight, Trash2, Menu, Users, Edit2, Check, AlertTriangle
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
  
  // --- NEW: RENAME STATE ---
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");

  // Social State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [viewingFriend, setViewingFriend] = useState<Friend | null>(null);
  const [friendBoards, setFriendBoards] = useState<any[]>([]);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  // Viewport
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);

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
            // Artificial delay for UX
            await new Promise(r => setTimeout(r, 500)); 
            
            setCards(data.content || []);
            setActiveBoardId(id);
            setHistoryList(data.history || []);
            lastSavedString.current = JSON.stringify(data.content || []);
            setSaveStatus("saved");
            setLastSavedTime(formatDate(data.updatedAt));
            
            // Exit spectator mode if we were viewing a friend
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
      const res = await fetch("/api/board/sync", {
          method: "POST",
          body: JSON.stringify({ action: "create", title, cards: initialCards })
      });
      
      if (res.status === 403) {
          setErrorMessage("Max number of boards (10) reached on free plan. Please remove an existing board.");
          return null;
      }
      
      if (res.ok) {
          const newBoard = await res.json();
          await fetchBoardList();
          setActiveBoardId(newBoard.id);
          setCards(initialCards);
          lastSavedString.current = JSON.stringify(initialCards);
          setSaveStatus("saved");
          return newBoard;
      }
      return null;
  };

  // --- NEW: RENAME FUNCTION ---
  const startRenaming = (e: React.MouseEvent, board: BoardMeta) => {
      e.stopPropagation(); // Don't load the board when clicking edit
      setEditingBoardId(board.id);
      setEditTitleInput(board.title);
  };

  const saveRename = async (id: string) => {
      if (!editTitleInput.trim()) return setEditingBoardId(null); // Cancel if empty

      // Optimistic Update
      setBoards(prev => prev.map(b => b.id === id ? { ...b, title: editTitleInput } : b));
      setEditingBoardId(null);

      await fetch("/api/board/sync", {
          method: "POST",
          body: JSON.stringify({ action: "rename", boardId: id, title: editTitleInput })
      });
      await fetchBoardList(); // Refresh to be sure
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

  const selectFriend = async (friend: Friend) => {
      const res = await fetch(`/api/board/sync?userId=${friend.id}`);
      if (res.ok) {
          const data = await res.json();
          setFriendBoards(data.boards || []);
          setViewingFriend(friend);
          setRightSidebarOpen(true);
      }
  };

  const loadFriendBoard = async (friend: Friend, boardId: string) => {
      setIsLoadingBoard(true);
      setViewingFriend(friend);
      try {
          const res = await fetch(`/api/board/sync?id=${boardId}&userId=${friend.id}`);
          if (res.ok) {
              const data = await res.json();
              setCards(data.content || []);
              setActiveBoardId(boardId);
              // Hide History/Save status for spectators
              setSaveStatus("saved"); 
          }
      } catch(e) { console.error(e); }
      setIsLoadingBoard(false);
  };

  // --- SAVE LOGIC ---
  const triggerSave = useCallback(async () => {
    if (viewingFriend) return; // Don't save if watching a friend's board

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
            body: JSON.stringify({ action: "update", boardId: activeBoardId, cards }) 
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
  }, [cards, status, saveStatus, activeBoardId, viewingFriend]);

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


  // Autosave & Keys
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

  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          if (saveStatus === 'unsaved' || saveStatus === 'limit_reached') {
              e.preventDefault(); e.returnValue = '';
          }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Viewport & Actions
  const handleWheel = (e: React.WheelEvent) => { if (e.ctrlKey) { e.preventDefault(); const delta = -e.deltaY; const newScale = Math.min(Math.max(0.1, view.scale * (delta > 0 ? 1.1 : 0.9)), 5); setView(p => ({ ...p, scale: newScale })); } };
  const handlePointerDown = (e: React.PointerEvent) => { if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { e.preventDefault(); isPanning.current = true; } };
  const handlePointerMove = (e: React.PointerEvent) => { if (isPanning.current) setView(p => ({ ...p, x: p.x + e.movementX, y: p.y + e.movementY })); };
  const handlePointerUp = () => { isPanning.current = false; };
  const zoomIn = () => setView(p => ({ ...p, scale: Math.min(p.scale * 1.2, 5) }));
  const zoomOut = () => setView(p => ({ ...p, scale: Math.max(p.scale * 0.8, 0.1) }));
  const handleLogin = () => { if (cards.length > 0) localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(cards)); signIn('google'); };

  const findSmartPosition = () => { if (typeof window === 'undefined') return { x: 0, y: 0 }; const cx = (window.innerWidth / 2 - view.x) / view.scale; const cy = (window.innerHeight / 2 - view.y) / view.scale; return { x: cx - 140 + (Math.random() - 0.5) * 100, y: cy - 190 + (Math.random() - 0.5) * 100 }; };
  const addCard = () => { const { x, y } = findSmartPosition(); setCards([...cards, { id: Math.random().toString(36).substr(2, 9), type: "text", x, y, width: 280, height: 380, rotation: (Math.random() - 0.5) * 16, content: { frontText: "", backReflection: { identity: "", practice: "" }, style: { opacity: 1, fontSize: 32, fontFamily: 'font-serif', fontWeight: 'normal', fontStyle: 'italic', textColor: '#292524' } }, isFlipped: false }]); setSaveStatus(status === 'authenticated' ? "unsaved" : "saved"); };
  const updateCard = (id: string, d: Partial<CardData>) => { setCards(p => p.map(c => c.id === id ? { ...c, ...d } : c)); setSaveStatus("unsaved"); };
  const deleteCard = (id: string) => { setCards(p => p.filter(c => c.id !== id)); setSaveStatus("unsaved"); };
  const restore = (pt: HistoryPoint) => { if (confirm(`Revert to ${formatDate(pt.createdAt)}?`)) { setCards(Array.isArray(pt.content) ? pt.content : []); lastSavedString.current = JSON.stringify(pt.content); setShowHistory(false); triggerSave(); }};

  if (!isLoaded) return <div className="w-full h-screen bg-[#F9F8F6] flex items-center justify-center"><Loader2 size={32} className="animate-spin text-stone-300"/></div>;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F9F8F6] cursor-crosshair touch-none" onPointerDown={(e) => { handlePointerDown(e); setSelectedId(null); }} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onWheel={handleWheel}>
      
      {/* HAMBURGER TOGGLE */}
      <button 
        onClick={() => setSidebarOpen(true)} 
        className="absolute top-6 left-6 z-[60] p-2 bg-white/80 backdrop-blur border border-stone-200 rounded-lg shadow-sm text-stone-600 hover:bg-white hover:text-stone-900 hover:scale-105 transition-all"
      >
          <Menu size={24} />
      </button>

      {/* --- LEFT SIDEBAR (BOARDS) --- */}
      <div className={`absolute left-0 top-0 bottom-0 z-[70] flex transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} onPointerDown={e => e.stopPropagation()}>
         <div className="w-72 h-full bg-white border-r border-stone-200 shadow-2xl flex flex-col overflow-hidden">
             {/* Header */}
             <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                 <div className="flex items-center gap-2">
                     <Layout size={16} className="text-stone-700"/>
                     <span className="text-sm font-bold text-stone-800">My Boards</span>
                 </div>
                 <button onClick={() => setSidebarOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={18}/></button>
             </div>
             
             {/* List */}
             <div className="flex-1 overflow-y-auto p-3 space-y-1">
                 {status === 'unauthenticated' && boards.length === 0 && <div className="p-4 text-xs text-stone-400 text-center italic">Start adding cards to create a guest session.</div>}
                 
                 {boards.map(b => (
                     <div key={b.id} onClick={() => loadBoard(b.id)} className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${activeBoardId === b.id ? 'bg-stone-900 text-white border-stone-900 shadow-md' : 'bg-white border-transparent hover:bg-stone-100 text-stone-600'}`}>
                         
                         {/* TITLE AREA - Swaps between Text and Input */}
                         {editingBoardId === b.id ? (
                             <div className="flex items-center gap-2 w-full">
                                 <input 
                                    autoFocus
                                    value={editTitleInput}
                                    onChange={(e) => setEditTitleInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && saveRename(b.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-xs font-bold p-1 rounded text-stone-900 outline-none ring-2 ring-blue-500"
                                 />
                                 <button onClick={(e) => { e.stopPropagation(); saveRename(b.id); }} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={12}/></button>
                             </div>
                         ) : (
                             <div className="flex flex-col gap-0.5 truncate">
                                 <span className="text-xs font-bold truncate max-w-[150px]">{b.title}</span>
                                 <span className={`text-[10px] font-mono ${activeBoardId === b.id ? 'text-stone-400' : 'text-stone-400'}`}>Updated {new Date(b.updatedAt).toLocaleDateString()}</span>
                             </div>
                         )}

                         {/* ACTION BUTTONS (Edit / Delete) */}
                         {b.id !== GUEST_BOARD_ID && !editingBoardId && (
                            <div className="hidden group-hover:flex items-center gap-1">
                                <button onClick={(e) => startRenaming(e, b)} className={`p-1.5 rounded ${activeBoardId === b.id ? 'hover:bg-stone-700 text-stone-400 hover:text-white' : 'hover:bg-stone-200 text-stone-400 hover:text-stone-600'}`}><Edit2 size={12}/></button>
                                <button onClick={(e) => deleteBoard(b.id, e)} className={`p-1.5 rounded ${activeBoardId === b.id ? 'hover:bg-red-500/50 text-red-400 hover:text-white' : 'hover:bg-red-500/20 text-red-300 hover:text-red-600'}`}><Trash2 size={12}/></button>
                            </div>
                         )}
                     </div>
                 ))}
             </div>

             {/* Add Button */}
             {status === 'authenticated' && (
                 <div className="p-4 border-t border-stone-100 bg-stone-50">
                     <div className="flex justify-between text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-2">
                        <span>Usage</span>
                        <span>{boards.length}/10 Boards</span>
                     </div>
                     <button onClick={() => createBoard("New Project")} className="w-full py-2.5 flex items-center justify-center gap-2 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-all shadow-sm">
                         <Plus size={14}/> Create New Board
                     </button>
                 </div>
             )}
         </div>
         {/* Click outside to close */}
         <div className="w-screen h-full bg-stone-900/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
      </div>

      {/* --- RIGHT SIDEBAR (FRIENDS) --- */}
      <div className={`absolute right-0 top-0 bottom-0 z-[60] flex transition-transform duration-300 ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="w-72 h-full bg-white border-l border-stone-200 shadow-2xl flex flex-col">
              <div className="p-4 border-b border-stone-100 flex justify-between bg-stone-50">
                  <span className="font-bold text-stone-800 flex items-center gap-2"><Users size={16}/> Community</span>
                  <button onClick={() => setRightSidebarOpen(false)}><X size={18}/></button>
              </div>

              {/* Friend List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {friends.length === 0 && <div className="p-4 text-xs text-stone-400 text-center italic">No friends yet. Invite people to collaborate!</div>}
                  {friends.map(friend => (
                      <div key={friend.id} onClick={() => selectFriend(friend)} className="p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 flex items-center gap-3">
                           <img src={friend.image || "/default-avatar.png"} className="w-8 h-8 rounded-full border border-stone-200"/>
                           <div className="flex flex-col">
                               <div className="flex items-center gap-1">
                                   <span className="text-sm font-bold text-stone-700">{friend.name}</span>
                                   {friend.role === 'DEV' && <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold">DEV</span>}
                               </div>
                               <span className="text-[10px] text-stone-400">View Boards</span>
                           </div>
                      </div>
                  ))}
              </div>
              
              {/* Viewing Friend's Boards */}
              {viewingFriend && (
                  <div className="border-t border-stone-200 p-3 bg-blue-50">
                      <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">{viewingFriend.name}'s Boards</p>
                      {friendBoards.length === 0 && <span className="text-xs text-stone-400 italic">No public boards found.</span>}
                      {friendBoards.map(b => (
                          <button key={b.id} onClick={() => loadFriendBoard(viewingFriend, b.id)} className="w-full text-left text-xs py-1.5 px-2 hover:bg-white rounded text-stone-600 truncate transition-colors">
                              {b.title}
                          </button>
                      ))}
                  </div>
              )}
          </div>
      </div>

      {/* Toggle Button for Right Sidebar (Friends) */}
      <button onClick={() => setRightSidebarOpen(true)} className="absolute top-20 right-6 z-50 p-2 bg-white rounded-full shadow-md text-stone-500 hover:text-stone-900 transition-transform hover:scale-105">
          <Users size={20} />
      </button>

      {/* --- BOARD LOADING OVERLAY --- */}
      <AnimatePresence>
        {isLoadingBoard && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-[40] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center gap-4"
            >
                <motion.img 
                    initial={{ scale: 0.9, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} 
                    transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }}
                    src="/logo.png" alt="ViBo Logo" className="w-16 h-16 object-contain"
                />
                <div className="flex items-center gap-2 text-stone-500">
                    <Loader2 size={18} className="animate-spin"/>
                    <span className="text-xs font-bold uppercase tracking-widest">
                        {viewingFriend ? `Loading ${viewingFriend.name}'s Vision...` : 'Switching Board...'}
                    </span>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* ERROR MODAL */}
      <AnimatePresence>
          {errorMessage && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/20 backdrop-blur-sm px-4">
                  <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full border border-red-100">
                      <div className="flex items-center gap-3 text-red-600 mb-2">
                          <AlertTriangle size={24} />
                          <h3 className="font-bold">Limit Reached</h3>
                      </div>
                      <p className="text-sm text-stone-600 mb-4 leading-relaxed">{errorMessage}</p>
                      <button onClick={() => setErrorMessage(null)} className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold">Understood</button>
                  </div>
              </div>
          )}
      </AnimatePresence>

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none origin-top-left" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px', transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} />

      <motion.div className="absolute top-0 left-0 w-full h-full origin-top-left" style={{ x: view.x, y: view.y, scale: view.scale }} transition={{ type: "tween", ease: "linear", duration: 0 }}>
          {cards.map((card) => (
            <VisionCard key={card.id} card={card} isSelected={selectedId === card.id} updateCard={updateCard} onDelete={deleteCard} onSelect={(e) => { e.stopPropagation(); setSelectedId(card.id); }} />
          ))}
      </motion.div>

      {/* Guest Banner */}
      <AnimatePresence>
        {status === "unauthenticated" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-stone-900/90 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-xs font-medium">Guest Mode: Login to Sync</span>
                <button onClick={handleLogin} className="text-xs font-bold underline hover:text-orange-200">Log In</button>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom Controls */}
      <div className="absolute bottom-6 left-6 flex gap-2 z-50">
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
            <button onClick={zoomIn} className="p-2 hover:bg-stone-50 text-stone-600 border-b border-stone-100"><Plus size={16}/></button>
            <button onClick={zoomOut} className="p-2 hover:bg-stone-50 text-stone-600"><Minus size={16}/></button>
        </div>
        <div className="bg-white/80 backdrop-blur border border-stone-200 rounded-lg px-3 flex items-center text-xs font-mono font-bold text-stone-500 shadow-sm">{Math.round(view.scale * 100)}%</div>
      </div>

      <OnboardingModal />

      {/* TOP BAR */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none select-none pl-[80px]">
        <div className="pointer-events-auto flex flex-col items-start gap-1">
            <h1 className="text-xl font-serif text-stone-800 tracking-tight font-bold">
                {/* Dynamically show board title or ViBo default */}
                {viewingFriend ? `${viewingFriend.name}'s Vision` : (activeBoardId ? boards.find(b => b.id === activeBoardId)?.title || "ViBo" : "ViBo")}
            </h1>
            <div className="relative flex gap-1">
                {/* Hide Save Status if Viewing Friend */}
                {!viewingFriend && (
                    <button onClick={triggerSave} className={`flex items-center gap-2 text-xs transition-all bg-white/50 px-2 py-1.5 rounded-l-md border border-stone-200/50 hover:bg-white hover:border-stone-300 ${status === 'unauthenticated' ? 'opacity-70' : ''}`}>
                        {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin text-blue-500"/>}
                        {saveStatus === 'saved' && <Cloud size={12} className="text-blue-500"/>}
                        {(saveStatus === 'unsaved' || saveStatus === 'limit_reached') && <CloudOff size={12} className="text-orange-400"/>}
                        {saveStatus === 'error' && <X size={12} className="text-red-500"/>}
                        <span className="font-medium">{status === 'unauthenticated' ? "Guest (Local)" : saveStatus === 'saving' ? "Saving..." : saveStatus === 'limit_reached' ? "Not Saved" : saveStatus === 'unsaved' ? "Unsaved" : `Saved ${lastSavedTime}`}</span>
                    </button>
                )}
                {/* History Button (Only for owner) */}
                {!viewingFriend && (
                    <button onClick={() => setShowHistory(!showHistory)} className="bg-white/50 px-1.5 py-1.5 rounded-r-md border border-l-0 border-stone-200/50 hover:bg-white hover:border-stone-300 text-stone-500 hover:text-stone-800">
                        <History size={12} />
                    </button>
                )}
                {showHistory && !viewingFriend && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-stone-100 overflow-hidden flex flex-col z-[60]">
                        <div className="px-3 py-2 bg-stone-50 border-b border-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-500 flex justify-between">
                            <span>History</span>
                            <span className="text-stone-400">{historyList.length}/10</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {status === 'authenticated' && historyList.map((point) => (
                                <button key={point.id} onClick={() => restore(point)} className="w-full text-left px-3 py-2.5 text-xs text-stone-600 hover:bg-blue-50 hover:text-blue-600 flex justify-between border-b border-stone-50 last:border-0 group">
                                    <span className="font-medium group-hover:translate-x-1 transition-transform">{formatDate(point.createdAt)}</span>
                                    <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">{Array.isArray(point.content) ? point.content.length : 0} items</span>
                                </button>
                            ))}
                            {status === 'unauthenticated' && <div className="p-4 text-center text-xs text-stone-400 italic">Cloud history not available in guest mode</div>}
                        </div>
                    </div>
                )}
                
                {/* Spectator Mode Indicator */}
                {viewingFriend && (
                    <div className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2">
                        <Users size={12} /> Spectator Mode
                    </div>
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
            <div className="h-6 w-px bg-stone-200 mx-1"></div>
            {/* Disable Add Card if Viewing Friend */}
            {!viewingFriend ? (
                <button onClick={addCard} className="flex items-center gap-2 bg-stone-900 text-stone-50 px-4 py-2 rounded-full shadow-lg hover:scale-105 transition-transform">
                    <Plus size={16} /> <span className="text-sm font-medium">Add</span>
                </button>
            ) : (
                <button disabled className="flex items-center gap-2 bg-stone-100 text-stone-400 px-4 py-2 rounded-full cursor-not-allowed">
                    <Plus size={16} /> <span className="text-sm font-medium">Add</span>
                </button>
            )}
        </div>
      </div>
    </div>
  );
}