import { CardData } from "@/types/board";

export interface HistoryPoint {
  id: number;
  timestamp: string;
  cards: CardData[];
}

const STORAGE_KEY = "vision_board_v02_current";
const HISTORY_KEY = "vision_board_v02_history";
const MAX_HISTORY = 20;

export const saveState = (cards: CardData[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));

    const now = new Date();
    // NEW FORMAT: "Jan 08, 2:30 PM"
    const timeString = now.toLocaleString('en-US', {
        month: 'short', 
        day: '2-digit',
        hour: 'numeric', 
        minute: '2-digit'
    });

    const newPoint: HistoryPoint = {
      id: now.getTime(),
      timestamp: timeString,
      cards: cards
    };

    const existingHistory = getHistory();
    const updatedHistory = [newPoint, ...existingHistory].slice(0, MAX_HISTORY);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    
    return newPoint.timestamp;
  } catch (e) {
    console.warn("Storage quota exceeded", e);
    return null;
  }
};

export const loadCurrentState = (): CardData[] | null => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const getHistory = (): HistoryPoint[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
};