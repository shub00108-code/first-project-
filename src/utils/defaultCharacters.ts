import { HumanCharacter, AvatarCustomOptions, ExpressionType } from '../types/avatarHuman';

export const HAIR_COLORS = [
  'Dark Espresso',
  'Jet Black',
  'Warm Chestnut',
  'Honey Brown',
  'Natural Auburn',
  'Silver Ash',
];

export const HAIR_STYLES = [
  'Long silky straight with gentle layers',
  'Textured wavy hair with curtain bangs',
  'Slightly messy tousled waves',
  'Neat shoulder-length bob',
  'Casual low ponytail',
  'Messy modern cut with fringe',
];

export const EYE_COLORS = [
  'Deep Espresso Brown',
  'Warm Amber Hazel',
  'Dark Obsidian',
  'Muted Slate Blue',
  'Soft Grey Green',
];

export const SKIN_TONES = [
  'Fair with neutral undertones',
  'Natural warm beige',
  'Golden wheatish tone',
  'Warm sunkissed tan',
  'Rich warm bronze',
];

export const OUTFIT_OPTIONS: { id: string; label: string; desc: string }[] = [
  { id: 'casual', label: 'Casual', desc: 'Neat casual layered jacket and t-shirt' },
  { id: 'hoodie', label: 'Hoodie', desc: 'Relaxed oversized soft fleece hoodie' },
  { id: 'formal', label: 'Formal', desc: 'Sharp modern tailored blazer and clean collar' },
  { id: 'traditional', label: 'Traditional', desc: 'Classic elegant cultural attire with embroidery' },
];

export const BACKGROUND_OPTIONS: { id: string; label: string; desc: string }[] = [
  { id: 'classroom', label: 'Classroom', desc: 'Sunlit modern classroom by window with soft chalkboard blur' },
  { id: 'rooftop', label: 'Rooftop', desc: 'Urban sunset rooftop overlooking skyline with golden hour glow' },
  { id: 'cafe', label: 'Cafe', desc: 'Cozy indie coffee shop with warm ambient wooden tones' },
  { id: 'city at night', label: 'City at Night', desc: 'Vibrant neon city street at night with cinematic bokeh' },
];

export const EXPRESSION_OPTIONS: { id: ExpressionType; label: string; emoji: string }[] = [
  { id: 'neutral', label: 'Neutral', emoji: '😐' },
  { id: 'smile', label: 'Smile', emoji: '😊' },
  { id: 'blushing', label: 'Blushing', emoji: '😳' },
  { id: 'annoyed', label: 'Annoyed', emoji: '😒' },
  { id: 'sad', label: 'Sad', emoji: '🥺' },
  { id: 'surprised', label: 'Surprised', emoji: '😲' },
];

export const DEFAULT_MIRA_OPTIONS: AvatarCustomOptions = {
  hairColor: 'Dark Espresso',
  hairStyle: 'Long silky straight with gentle layers',
  eyeColor: 'Deep Espresso Brown',
  skinTone: 'Fair with neutral undertones',
  outfit: 'Neat school-style navy cardigan over white collar',
  background: 'Sunlit modern classroom by window with soft chalkboard blur',
  expression: 'neutral',
};

export const DEFAULT_REN_OPTIONS: AvatarCustomOptions = {
  hairColor: 'Jet Black',
  hairStyle: 'Slightly messy tousled waves',
  eyeColor: 'Warm Amber Hazel',
  skinTone: 'Natural warm beige',
  outfit: 'Relaxed oversized soft fleece hoodie',
  background: 'Urban sunset rooftop overlooking skyline with golden hour glow',
  expression: 'neutral',
};

export const DEFAULT_CHARACTERS: HumanCharacter[] = [
  {
    id: 'mira',
    name: 'Mira',
    age: 18,
    gender: 'female',
    tagline: 'Cool & composed on outside, secretly bashful',
    lookDescription: 'Photorealistic 18yo young woman, long dark hair, expressive dark eyes, natural skin texture, neat navy cardigan over white collar.',
    personality: 'Cool, dignified, and composed on the surface, but hides her true feelings. When embarrassed or happy, she gets flustered, looks away, or says the opposite of what she means. Mutters honest feelings softly in brackets.',
    speakingStyle: 'Polite, slightly formal, with tsundere flustered bracketed whispers.',
    initialPortraitUrl: '/avatars/mira_neutral.jpg',
    currentImageUrl: '/avatars/mira_neutral.jpg',
    customOptions: { ...DEFAULT_MIRA_OPTIONS },
  },
  {
    id: 'ren',
    name: 'Ren',
    age: 18,
    gender: 'male',
    tagline: 'Laid-back slacker exterior, sharp & observant',
    lookDescription: 'Photorealistic 18yo young man, slightly messy dark hair, relaxed half-lidded eyes, casual loose grey hoodie, lazy warm half-smile.',
    personality: 'Laid-back, humorous, and seemingly unmotivated, but remarkably smart, observant, and quietly caring. Teases Mira lightly and notices whenever she is hiding something.',
    speakingStyle: 'Relaxed, informal, witty, with casual banter and quiet warmth.',
    initialPortraitUrl: '/avatars/ren_neutral.jpg',
    currentImageUrl: '/avatars/ren_neutral.jpg',
    customOptions: { ...DEFAULT_REN_OPTIONS },
  },
];
