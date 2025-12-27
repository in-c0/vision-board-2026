// types/board.ts

export type CardType = 'image' | 'text';

export interface CardStyle {
  opacity: number;       // 0 to 1
  fontSize: number;      // px
  fontFamily: string;    // 'serif', 'sans', 'mono'
  fontWeight: string;    // 'normal', 'bold'
  fontStyle: string;     // 'normal', 'italic'
  textColor: string;     // Hex code
}

export interface CardData {
  id: string;
  type: CardType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: {
    frontUrl?: string;
    frontText?: string;
    backReflection: {
      identity: string;
      practice: string;
    };
    style: CardStyle; // <--- New styling object
  };
  isFlipped: boolean;
}