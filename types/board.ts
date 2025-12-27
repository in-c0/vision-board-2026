// types/board.ts

export type CardType = 'image' | 'text';

export interface CardData {
  id: string;
  type: CardType;
  x: number;
  y: number;
  content: {
    frontUrl?: string; // For images
    frontText?: string; // For word cards
    backReflection: {
      identity: string; // "I am becoming..."
      practice: string; // "I will practice..."
    };
  };
  rotation: number; // Random slight rotation for natural feel
  isFlipped: boolean;
}