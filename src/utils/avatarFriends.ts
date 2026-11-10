import { AvatarFriend, AvatarId, AvatarMood, AvatarVisualMode } from '../types';

export const AVATAR_FRIENDS: Record<AvatarId, AvatarFriend> = {
  raj: {
    id: 'raj',
    name: 'Raj',
    age: 30,
    gender: 'male',
    personality: 'Calm, grounded & practical advice with a caring big-brother warmth and gentle humor.',
    headline: 'Supportive Big Brother',
    cardDescription: 'Calm, grounded & practical advice with a caring big-brother warmth and gentle humor.',
    defaultGreeting: "Hey! Raj here. Glad you checked in. How's your day treating you so far?",
    accentBg: 'from-blue-600 to-indigo-700',
    cardGradient: 'from-blue-600/15 via-blue-50/80 to-indigo-100/60',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    themeColor: 'blue',
    vrmModelPath: 'models/raj.vrm',
    avatarImageUrl: '/avatars/raj_portrait.jpg',
    voiceDefaults: {
      gender: 'male',
      pitch: 0.85,
      rate: 0.92,
    },
    geminiVoice: 'Charon',
    geminiVoiceOptions: ['Charon', 'Fenrir', 'Orus', 'Puck'],
    vachanaVoice: 'Vikrant',
    vachanaVoiceOptions: ['Vikrant', 'Deepak'],
    movementStyle: 'raj_steady_nods',
    enabled: true,
  },
  aneet: {
    id: 'aneet',
    name: 'Aneet',
    age: 30,
    gender: 'female',
    personality: 'Warm, deeply patient listener who offers unconditional empathy and comforting presence.',
    headline: 'Patient & Caring Elder Sister',
    cardDescription: 'Warm, deeply patient listener who offers unconditional empathy and comforting presence.',
    defaultGreeting: "Hello! Aneet here. Take a gentle breath—I'm right here to listen. What's on your heart today?",
    accentBg: 'from-rose-500 to-amber-600',
    cardGradient: 'from-orange-500/15 via-rose-50/80 to-amber-100/60',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    themeColor: 'rose',
    vrmModelPath: 'models/aneet.vrm',
    avatarImageUrl: '/avatars/aneet_portrait.jpg',
    voiceDefaults: {
      gender: 'female',
      pitch: 1.0,
      rate: 0.85,
    },
    geminiVoice: 'Aoede',
    geminiVoiceOptions: ['Aoede', 'Kore', 'Leda'],
    vachanaVoice: 'Nalini',
    vachanaVoiceOptions: ['Nalini', 'Bhavna'],
    movementStyle: 'aneet_gentle_tilts',
    enabled: true,
  },
  mira: {
    id: 'mira',
    name: 'Mira',
    age: 18,
    gender: 'female',
    personality: 'Cool, dignified, and composed on the surface, but easily flustered when complimented. Mutters honest true feelings in brackets.',
    headline: 'Cool & Secretly Bashful',
    cardDescription: 'Cool & composed on outside, secretly bashful with bracketed honest whispers.',
    defaultGreeting: "H-hello... Did you need something from me? (...I was secretly hoping you would stop by).",
    accentBg: 'from-indigo-600 to-violet-700',
    cardGradient: 'from-indigo-600/15 via-violet-50/80 to-purple-100/60',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    themeColor: 'indigo',
    vrmModelPath: 'models/mira.vrm',
    avatarImageUrl: '/avatars/mira_neutral.jpg',
    voiceDefaults: {
      gender: 'female',
      pitch: 1.05,
      rate: 0.95,
    },
    geminiVoice: 'Aoede',
    geminiVoiceOptions: ['Aoede', 'Kore', 'Leda'],
    vachanaVoice: 'Nalini',
    vachanaVoiceOptions: ['Nalini', 'Bhavna'],
    movementStyle: 'aneet_gentle_tilts',
    enabled: true,
  },
  ren: {
    id: 'ren',
    name: 'Ren',
    age: 18,
    gender: 'male',
    personality: 'Laid-back slacker exterior with observant, witty banter and quiet caring.',
    headline: 'Laid-back & Observant Buddy',
    cardDescription: 'Laid-back slacker exterior with observant, witty banter and quiet caring.',
    defaultGreeting: "Yo. Was just about to take a quick nap, but I can spare a few minutes. What's up?",
    accentBg: 'from-slate-700 to-indigo-900',
    cardGradient: 'from-slate-600/15 via-slate-50/80 to-indigo-100/60',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    themeColor: 'slate',
    vrmModelPath: 'models/ren.vrm',
    avatarImageUrl: '/avatars/ren_neutral.jpg',
    voiceDefaults: {
      gender: 'male',
      pitch: 0.9,
      rate: 0.95,
    },
    geminiVoice: 'Puck',
    geminiVoiceOptions: ['Puck', 'Zephyr', 'Orus'],
    vachanaVoice: 'Kavin',
    vachanaVoiceOptions: ['Kavin', 'Vikrant'],
    movementStyle: 'raj_steady_nods',
    enabled: true,
  },
};

export const AVATAR_LIST: AvatarFriend[] = Object.values(AVATAR_FRIENDS);

export const LAST_CHOSEN_AVATAR_KEY = 'saathi_last_chosen_avatar_id';

export function getLastChosenAvatarId(): AvatarId {
  try {
    const saved = localStorage.getItem(LAST_CHOSEN_AVATAR_KEY);
    if (saved && (saved === 'raj' || saved === 'aneet' || saved === 'mira' || saved === 'ren')) {
      return saved as AvatarId;
    }
  } catch {}
  return 'raj';
}

export function saveLastChosenAvatarId(id: AvatarId): void {
  try {
    localStorage.setItem(LAST_CHOSEN_AVATAR_KEY, id);
  } catch {}
}

/**
 * Detect the emotion/mood of the message to dynamically update the Avatar's facial expression.
 */
export function detectReplyMood(text: string, isWaiting = false): AvatarMood {
  if (isWaiting) return 'caring';
  const lower = text.toLowerCase();

  // Urgent/Crisis or deep pain keywords -> concerned
  if (
    lower.includes('helpline') ||
    lower.includes('tele-manas') ||
    lower.includes('14416') ||
    lower.includes('112') ||
    lower.includes('danger') ||
    lower.includes('hurting') ||
    lower.includes('sad') ||
    lower.includes('crying') ||
    lower.includes('pain') ||
    lower.includes('tough') ||
    lower.includes('scared') ||
    lower.includes('lonely') ||
    lower.includes('sorry to hear')
  ) {
    return 'concerned';
  }

  // Playful / laughs / jokes / excited -> laughing
  if (
    lower.includes('haha') ||
    lower.includes('lol') ||
    lower.includes('hehe') ||
    lower.includes('funny') ||
    lower.includes('cricket') ||
    lower.includes('match') ||
    lower.includes('awesome') ||
    lower.includes('yay') ||
    lower.includes('silly') ||
    lower.includes('cartoon') ||
    lower.includes('game') ||
    lower.includes('😂') ||
    lower.includes('😄') ||
    lower.includes('🏏')
  ) {
    return 'laughing';
  }

  // Soft comfort / validation / holding space -> caring
  if (
    lower.includes('breathe') ||
    lower.includes('i hear you') ||
    lower.includes('here for you') ||
    lower.includes('gentle') ||
    lower.includes('listen') ||
    lower.includes('glad you told me') ||
    lower.includes('rest') ||
    lower.includes('water') ||
    lower.includes('you matter') ||
    lower.includes('heart') ||
    lower.includes('hug')
  ) {
    return 'caring';
  }

  return 'smiling';
}

export const AVATAR_VISUAL_MODE_KEY = 'saathi_avatar_visual_mode';
export const CUSTOM_AVATAR_PIC_PREFIX = 'saathi_custom_avatar_pic_';

export function getAvatarVisualMode(): AvatarVisualMode {
  try {
    const saved = localStorage.getItem(AVATAR_VISUAL_MODE_KEY);
    if (saved === '3d' || saved === 'portrait' || saved === 'illustration') {
      return saved as AvatarVisualMode;
    }
  } catch {}
  return '3d';
}

export function setAvatarVisualMode(mode: AvatarVisualMode): void {
  try {
    localStorage.setItem(AVATAR_VISUAL_MODE_KEY, mode);
  } catch {}
}

export function getCompanionEffectivePicture(id: AvatarId): string {
  try {
    const custom = localStorage.getItem(`${CUSTOM_AVATAR_PIC_PREFIX}${id}`);
    if (custom) return custom;
  } catch {}
  return AVATAR_FRIENDS[id]?.avatarImageUrl || `/avatars/${id}_portrait.jpg`;
}

export function setCompanionCustomPicture(id: AvatarId, urlOrData: string): void {
  try {
    localStorage.setItem(`${CUSTOM_AVATAR_PIC_PREFIX}${id}`, urlOrData);
  } catch {}
}

export function resetCompanionPicture(id: AvatarId): void {
  try {
    localStorage.removeItem(`${CUSTOM_AVATAR_PIC_PREFIX}${id}`);
  } catch {}
}
