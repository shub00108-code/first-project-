import React, { useState, useEffect } from 'react';
import { AvatarId, AvatarMood, EmotionTag, AvatarVisualMode } from '../types';
import { Saathi2DAvatar } from './avatar2d/Saathi2DAvatar';
import {
  AVATAR_FRIENDS,
  getAvatarVisualMode,
  getCompanionEffectivePicture,
} from '../utils/avatarFriends';
import { Smile, Heart, Sparkles, AlertCircle } from 'lucide-react';

interface AvatarCharacterProps {
  avatarId: AvatarId;
  mood?: AvatarMood;
  emotion?: EmotionTag;
  isTalking?: boolean;
  isListening?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  showRing?: boolean;
  visualMode?: AvatarVisualMode;
  customImageUrl?: string;
}

const sizeClasses: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero', string> = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-lg',
  xl: 'w-28 h-28 text-xl',
  hero: 'w-36 h-36 sm:w-44 sm:h-44 text-2xl',
};

const ringColors: Record<AvatarId, { border: string; glow: string; shadow: string }> = {
  raj: {
    border: 'border-blue-400',
    glow: 'rgba(59, 130, 246, 0.45)',
    shadow: 'shadow-blue-500/25',
  },
  aneet: {
    border: 'border-rose-400',
    glow: 'rgba(244, 63, 94, 0.45)',
    shadow: 'shadow-rose-500/25',
  },
  mira: {
    border: 'border-indigo-400',
    glow: 'rgba(99, 102, 241, 0.45)',
    shadow: 'shadow-indigo-500/25',
  },
  ren: {
    border: 'border-slate-400',
    glow: 'rgba(148, 163, 184, 0.45)',
    shadow: 'shadow-slate-500/25',
  },
};

export const AvatarCharacter: React.FC<AvatarCharacterProps> = ({
  avatarId,
  mood = 'smiling',
  emotion,
  isTalking = false,
  isListening = false,
  size = 'md',
  className = '',
  showRing = true,
  visualMode,
  customImageUrl,
}) => {
  const [imageError, setImageError] = useState(false);
  const [activeVisualMode, setActiveVisualMode] = useState<AvatarVisualMode>(() =>
    visualMode || getAvatarVisualMode()
  );
  const [currentPicUrl, setCurrentPicUrl] = useState<string>(() =>
    customImageUrl || getCompanionEffectivePicture(avatarId)
  );

  useEffect(() => {
    if (visualMode) {
      setActiveVisualMode(visualMode);
    } else {
      setActiveVisualMode(getAvatarVisualMode());
    }
  }, [visualMode]);

  useEffect(() => {
    setImageError(false);
    setCurrentPicUrl(customImageUrl || getCompanionEffectivePicture(avatarId));
  }, [avatarId, customImageUrl]);

  // Listen for local custom picture updates
  useEffect(() => {
    const handleStorage = () => {
      setCurrentPicUrl(customImageUrl || getCompanionEffectivePicture(avatarId));
      if (!visualMode) {
        setActiveVisualMode(getAvatarVisualMode());
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('saathi_avatar_pic_updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('saathi_avatar_pic_updated', handleStorage);
    };
  }, [avatarId, customImageUrl, visualMode]);

  const friend = AVATAR_FRIENDS[avatarId] || AVATAR_FRIENDS.raj;
  const colors = ringColors[avatarId] || ringColors.raj;

  const effectiveEmotion: EmotionTag =
    emotion ||
    (mood === 'concerned'
      ? 'serious'
      : mood === 'laughing'
      ? 'happy'
      : mood === 'caring'
      ? 'caring'
      : 'calm');

  // If user selected 2D illustration or portrait image failed, use SVG character
  if (activeVisualMode === 'illustration' || imageError) {
    return (
      <Saathi2DAvatar
        characterId={avatarId}
        size={size}
        emotion={effectiveEmotion}
        isSpeaking={isTalking}
        isListening={isListening}
        className={className}
      />
    );
  }

  // Realistic Studio Portrait Mode
  const isLarge = size === 'lg' || size === 'xl' || size === 'hero';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${sizeClasses[size]} ${className}`}
    >
      {/* Speaking Voice Glow Animation */}
      {isTalking && (
        <span
          className="absolute -inset-1.5 sm:-inset-2 rounded-full animate-ping opacity-35"
          style={{ backgroundColor: colors.glow }}
        />
      )}

      {/* Listening Halo Animation */}
      {isListening && (
        <span className="absolute -inset-1 sm:-inset-1.5 rounded-full ring-2 ring-teal-400 ring-offset-2 ring-offset-transparent animate-pulse" />
      )}

      {/* Main Portrait Frame */}
      <div
        className={`w-full h-full rounded-full overflow-hidden relative shadow-md transition-all duration-300 ${
          showRing ? `border-2 sm:border-3 ${colors.border}` : ''
        } ${isTalking ? 'scale-105 shadow-xl' : 'scale-100'} ${colors.shadow}`}
        style={{
          boxShadow: isTalking
            ? `0 10px 25px -5px ${colors.glow}`
            : isListening
            ? `0 0 16px rgba(45, 212, 191, 0.6)`
            : undefined,
        }}
      >
        <img
          src={currentPicUrl}
          alt={friend.name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-top select-none transition-transform duration-500 hover:scale-105"
          loading="eager"
        />

        {/* Subtle speaking soundwave overlay badge for hero view */}
        {isTalking && isLarge && (
          <div className="absolute inset-x-0 bottom-1 flex items-center justify-center gap-0.5 bg-black/40 backdrop-blur-xs py-0.5 px-2 rounded-full mx-auto w-fit">
            <span className="w-1 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-3.5 rounded-full bg-teal-300 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-2 rounded-full bg-teal-400 animate-bounce" />
          </div>
        )}
      </div>

      {/* Emotion / Mood badge in corner for medium/large viewports */}
      {isLarge && (
        <div
          className={`absolute bottom-0 right-0 p-1 rounded-full shadow-md border border-white text-white ${
            effectiveEmotion === 'serious' || effectiveEmotion === 'worried'
              ? 'bg-amber-600'
              : effectiveEmotion === 'caring' || effectiveEmotion === 'comforting'
              ? 'bg-rose-500'
              : effectiveEmotion === 'happy' || effectiveEmotion === 'excited'
              ? 'bg-emerald-500'
              : 'bg-teal-600'
          }`}
          title={`Mood: ${effectiveEmotion}`}
        >
          {effectiveEmotion === 'serious' || effectiveEmotion === 'worried' ? (
            <AlertCircle className="w-3.5 h-3.5" />
          ) : effectiveEmotion === 'caring' || effectiveEmotion === 'comforting' ? (
            <Heart className="w-3.5 h-3.5" />
          ) : effectiveEmotion === 'happy' || effectiveEmotion === 'excited' ? (
            <Sparkles className="w-3.5 h-3.5" />
          ) : (
            <Smile className="w-3.5 h-3.5" />
          )}
        </div>
      )}
    </div>
  );
};
