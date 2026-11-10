export type ExpressionType = 'neutral' | 'smile' | 'blushing' | 'annoyed' | 'sad' | 'surprised';

export type OutfitType = 'casual' | 'hoodie' | 'formal' | 'traditional';

export type BackgroundType = 'classroom' | 'rooftop' | 'cafe' | 'city at night';

export interface AvatarCustomOptions {
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  skinTone: string;
  outfit: string;
  background: string;
  expression: ExpressionType;
}

export interface HumanCharacter {
  id: string;
  name: string;
  age: number;
  gender: 'female' | 'male' | 'non-binary';
  tagline: string;
  lookDescription: string;
  personality: string;
  speakingStyle: string;
  initialPortraitUrl: string;
  currentImageUrl: string;
  baseReferenceImage?: string;
  customOptions: AvatarCustomOptions;
  isCustom?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'avatar';
  characterId: string;
  text: string;
  whisper?: string;
  expression?: ExpressionType;
  timestamp: number;
}
