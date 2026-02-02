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
  type: 'text' | 'image' | 'youtube' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isFlipped: boolean;
  content: {
    frontText?: string;
    frontUrl?: string;      // For uploaded images/videos
    frontVideoUrl?: string; // For uploaded video files
    
    youtubeUrl?: string;    // For YouTube Embeds
    shapeType?: 'square' | 'circle'; // For Shapes
    
    style: {
      opacity: number;
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
      fontStyle: string;
      textColor: string;
      backgroundColor?: string; 
      textAlign?: string;
      verticalAlign?: string;
    };
    backReflection: {
      templateId?: string;
      identity?: string; 
      practice?: string;
      q1?: string;
      q2?: string;
      q3?: string;
    };
  };
}