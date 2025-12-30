import { CardData } from "@/types/board";

export interface HistoryPoint {
  id: number;
  timestamp: string;
  cards: CardData[];
}

const STORAGE_KEY = "vision_board_v02_current";
const HISTORY_KEY = "vision_board_v02_history";
const MAX_HISTORY = 20; // Prevent QuotaExceededError

export const saveState = (cards: CardData[]) => {
  try {
    // 1. Save Current State (Source of Truth)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));

    // 2. Add to History Stack
    const now = new Date();
    const newPoint: HistoryPoint = {
      id: now.getTime(),
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cards: cards
    };

    const existingHistory = getHistory();
    // Add new to front, slice to max
    const updatedHistory = [newPoint, ...existingHistory].slice(0, MAX_HISTORY);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    
    return newPoint.timestamp;
  } catch (e) {
    console.warn("Storage quota exceeded or disabled", e);
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