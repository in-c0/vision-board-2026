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
  type: 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isFlipped: boolean;
  content: {
    frontText?: string;
    frontUrl?: string;
    frontVideoUrl?: string; // Support for MP4s
    style?: {
      opacity: number;
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
      fontStyle: string;
      textColor: string;
    };
    backReflection: {
      identity: string;     // Legacy field (kept for safety)
      practice: string;     // Legacy field (kept for safety)
      
      // New Template System Fields
      templateId?: string; 
      q1?: string;
      q2?: string;
      q3?: string;
    };
  };
}