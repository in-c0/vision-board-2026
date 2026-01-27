// src/types/board.ts

export interface CardStyle {
  opacity: number;
  fontSize: number;
  fontFamily: 'font-serif' | 'font-sans' | 'font-mono';
  fontWeight: string;
  fontStyle: string;
  textColor: string;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'start' | 'center' | 'end';
  backgroundColor?: string; 
}

export interface CardContent {
  frontText?: string;
  frontUrl?: string;
  frontVideoUrl?: string;
  youtubeUrl?: string;
  shapeType?: 'rectangle' | 'circle' | 'pill' | 'star';
  
  backReflection?: {
    templateId: string;
    identity: string;
    practice: string;
    q1?: string;
    q2?: string;
    q3?: string;
  };
  style: CardStyle;
}

export interface CardData {
  id: string;
  // This line is what fixes your error:
  type: 'text' | 'image' | 'video' | 'shape' | 'youtube'; 
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: CardContent;
  isFlipped: boolean;
}