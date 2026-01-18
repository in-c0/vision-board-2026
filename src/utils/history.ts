import { CardData } from "@/types/board";

export interface HistoryPoint {
  id: number;
  timestamp: string;
  cards: CardData[];
}

const STORAGE_KEY = "vision_board_v02_current";
const HISTORY_KEY = "vision_board_v02_history";
const MAX_HISTORY = 5; 

export const saveState = (cards: CardData[]): { timestamp: string; history: HistoryPoint[] } | null => {
  if (!cards) return null;

  try {
    const payload = JSON.stringify(cards);
    if (!payload) return null;

    // Safety: 3MB limit
    if (payload.length > 3000000) { 
        localStorage.setItem(STORAGE_KEY, payload);
        return { timestamp: new Date().toLocaleTimeString(), history: getHistory() };
    }

    // --- NEW: DUPLICATE GUARD ---
    // 1. Get existing history first
    let existingHistory = getHistory();
    
    // 2. Check if the latest history entry is identical to what we are trying to save now
    if (existingHistory.length > 0) {
        const lastEntry = existingHistory[0];
        const lastPayload = JSON.stringify(lastEntry.cards);
        
        if (lastPayload === payload) {
            // It's a duplicate! Don't add a new entry.
            // Just return the current time (so UI says "Saved") and the existing list.
            const now = new Date();
            const timeString = now.toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
            });
            return { timestamp: timeString, history: existingHistory };
        }
    }
    // -----------------------------

    // 3. Save Current (if not duplicate or if first time)
    localStorage.setItem(STORAGE_KEY, payload);

    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });

    const newPoint: HistoryPoint = {
      id: now.getTime(),
      timestamp: timeString,
      cards: cards
    };

    // 4. Update History
    const updatedHistory = [newPoint, ...existingHistory].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    
    return { timestamp: newPoint.timestamp, history: updatedHistory };

  } catch (e) {
    console.warn("Storage warning:", e);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)); } catch (err) {}
    return null;
  }
};

// ... loadCurrentState and getHistory remain the same as the previous safe version
export const loadCurrentState = (): CardData[] | null => {
  if (typeof window === "undefined") return null;
  try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : null;
  } catch (e) { return null; }
};

export const getHistory = (): HistoryPoint[] => {
  if (typeof window === "undefined") return [];
  try {
      const data = localStorage.getItem(HISTORY_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
};