import React, { useEffect, useState, useMemo } from 'react';
import { AvatarId, EmotionTag } from '../../types';
import { VisemeShape } from '../../utils/speechSynthesisService';

export type AvatarMouthShape = 'closed' | 'small_open' | 'wide_open' | 'oo' | 'smile';

export interface Saathi2DAvatarProps {
  characterId: AvatarId | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  emotion?: EmotionTag;
  isSpeaking?: boolean;
  isListening?: boolean;
  isThinking?: boolean;
  viseme?: VisemeShape;
  mouthShape?: AvatarMouthShape;
  showGlow?: boolean;
  className?: string;
  forceReducedMotion?: boolean;
}

export const Saathi2DAvatar: React.FC<Saathi2DAvatarProps> = ({
  characterId,
  size = 'md',
  emotion = 'calm',
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  viseme,
  mouthShape: customMouthShape,
  showGlow = true,
  className = '',
  forceReducedMotion = false,
}) => {
  // Respect system prefers-reduced-motion
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setSystemReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  const reducedMotion = forceReducedMotion || systemReducedMotion;

  // Blinking state: every 3 to 5 seconds
  const [isBlinking, setIsBlinking] = useState(false);
  useEffect(() => {
    if (reducedMotion) return;

    let timeoutId: any;
    let blinkDurationId: any;

    const scheduleNextBlink = () => {
      // Character specific blink cadence
      const delay = characterId === 'aneet'
        ? 4500 + Math.random() * 2000 // Aneet: slow warm blinks
        : characterId === 'mira'
        ? 3800 + Math.random() * 1500 // Mira: composed blinks
        : characterId === 'ren'
        ? 4800 + Math.random() * 2000 // Ren: relaxed blinks
        : 3500 + Math.random() * 2000;

      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        blinkDurationId = setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 160);
      }, delay);
    };

    scheduleNextBlink();
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(blinkDurationId);
    };
  }, [reducedMotion, characterId]);

  // Speaking mouth shape animation
  const [speechMouthStep, setSpeechMouthStep] = useState<AvatarMouthShape>('closed');
  useEffect(() => {
    if (!isSpeaking) {
      setSpeechMouthStep('closed');
      return;
    }

    if (customMouthShape) {
      setSpeechMouthStep(customMouthShape);
      return;
    }

    // Map viseme to mouth shape if provided
    if (viseme) {
      switch (viseme) {
        case 'aa':
          setSpeechMouthStep('wide_open');
          return;
        case 'oh':
          setSpeechMouthStep('small_open');
          return;
        case 'ou':
          setSpeechMouthStep('oo');
          return;
        case 'ee':
        case 'ih':
          setSpeechMouthStep('smile');
          return;
        case 'closed':
        default:
          setSpeechMouthStep('small_open');
          return;
      }
    }

    // Speech amplitude / cadence simulator when speaking without explicit viseme
    const shapes: AvatarMouthShape[] = ['small_open', 'wide_open', 'smile', 'oo', 'small_open', 'closed'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % shapes.length;
      setSpeechMouthStep(shapes[idx]);
    }, 130);

    return () => clearInterval(interval);
  }, [isSpeaking, viseme, customMouthShape]);

  // Effective mouth shape
  const effectiveMouth: AvatarMouthShape = useMemo(() => {
    if (isSpeaking) {
      return speechMouthStep;
    }
    if (emotion === 'happy') return 'smile';
    return 'closed';
  }, [isSpeaking, speechMouthStep, emotion]);

  // Dimensions
  const sizeMap = {
    xs: 'w-10 h-10',
    sm: 'w-14 h-14',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36',
    hero: 'w-44 h-44 sm:w-52 sm:h-52',
  };

  // Character specific styling & background glow
  const theme = useMemo(() => {
    switch (characterId) {
      case 'raj':
        return {
          glowColor: 'rgba(59, 130, 246, 0.35)',
          bgGradientStart: '#2563EB',
          bgGradientEnd: '#1D4ED8',
          accentBg: 'from-blue-600 to-indigo-700',
          clothMain: '#1E3A8A', // Calm blue shirt
          clothCollar: '#3B82F6',
          clothAccent: '#93C5FD',
          hair: '#1E1B18',
          skinBase: '#F0B78B',
          skinShadow: '#D8986B',
          blush: '#E5987E',
          eyeColor: '#2B2520',
          badgeText: 'Supportive Big Brother',
        };
      case 'aneet':
        return {
          glowColor: 'rgba(251, 146, 60, 0.38)',
          bgGradientStart: '#EA580C',
          bgGradientEnd: '#DB2777',
          accentBg: 'from-rose-500 to-amber-600',
          clothMain: '#E11D48', // Warm peach / rose kurta
          clothCollar: '#FDA4AF',
          clothAccent: '#F59E0B',
          hair: '#171412',
          skinBase: '#F5C29E',
          skinShadow: '#DE9F75',
          blush: '#F472B6',
          eyeColor: '#231F20',
          badgeText: 'Patient & Caring Elder Sister',
        };
      case 'mira':
        return {
          glowColor: 'rgba(129, 140, 248, 0.45)',
          bgGradientStart: '#4F46E5',
          bgGradientEnd: '#9333EA',
          accentBg: 'from-indigo-600 to-purple-600',
          clothMain: '#312E81',
          clothCollar: '#A5B4FC',
          clothAccent: '#C084FC',
          hair: '#111827',
          skinBase: '#FBE4D8',
          skinShadow: '#E3B7A0',
          blush: '#F472B6',
          eyeColor: '#1E1B4B',
          badgeText: 'Cool & Secretly Caring Friend',
        };
      case 'ren':
        return {
          glowColor: 'rgba(99, 102, 241, 0.40)',
          bgGradientStart: '#334155',
          bgGradientEnd: '#475569',
          accentBg: 'from-slate-700 to-indigo-800',
          clothMain: '#1E293B',
          clothCollar: '#64748B',
          clothAccent: '#38BDF8',
          hair: '#1F2937',
          skinBase: '#F6C39F',
          skinShadow: '#DE9F77',
          blush: '#FDA4AF',
          eyeColor: '#0F172A',
          badgeText: 'Laid-Back Observant Buddy',
        };
      default:
        return {
          glowColor: 'rgba(20, 184, 166, 0.35)',
          bgGradientStart: '#0D9488',
          bgGradientEnd: '#059669',
          accentBg: 'from-teal-600 to-emerald-700',
          clothMain: '#0F766E',
          clothCollar: '#2DD4BF',
          clothAccent: '#99F6E4',
          hair: '#1E1B18',
          skinBase: '#F2B98E',
          skinShadow: '#D8986B',
          blush: '#E5987E',
          eyeColor: '#231F20',
          badgeText: 'Listening Companion',
        };
    }
  }, [characterId]);

  // CSS classes for character-specific movement personality
  const movementClass = useMemo(() => {
    if (reducedMotion) return '';
    if (isListening) return 'animate-avatar-listen-nod';
    if (isThinking) return 'animate-avatar-raj-steady';
    switch (characterId) {
      case 'raj':
        return 'animate-avatar-raj-steady';
      case 'aneet':
        return 'animate-avatar-aneet-tilt';
      case 'mira':
        return 'animate-avatar-aneet-tilt';
      case 'ren':
        return 'animate-avatar-raj-steady';
      default:
        return 'animate-avatar-raj-steady';
    }
  }, [characterId, reducedMotion, isListening, isThinking]);

  // Breathing movement class on the body layer
  const breathingClass = reducedMotion ? '' : 'animate-avatar-breathing';

  // Eyebrow vertical and tilt adjustments based on emotion & thinking
  const eyebrowTransform = useMemo(() => {
    if (isThinking) return 'translate(0, -1.2) rotate(-2, 100, 75)';
    switch (emotion) {
      case 'caring':
      case 'comforting':
        return 'translate(0, -1.8) rotate(3.2, 100, 75)'; // Soft warm raised inner corners
      case 'encouraging':
      case 'proud':
        return 'translate(0, -3.2) rotate(-2, 100, 75)'; // Arched high, enthusiastic
      case 'serious':
        return 'translate(0, 1.8) rotate(-3, 100, 75)'; // Lowered concerned
      case 'happy':
      case 'excited':
        return 'translate(0, -2.8)'; // High smiling arches
      case 'playful':
      case 'gentle-laughing':
        return 'translate(0, -2.2) rotate(1.5, 100, 75)';
      case 'curious':
      case 'surprised':
        return 'translate(0, -3.6) rotate(-1, 100, 75)';
      case 'thoughtful':
        return 'translate(0, -1.0) rotate(-2, 100, 75)';
      case 'worried':
      case 'sad-empathetic':
        return 'translate(0, 1.5) rotate(4, 100, 75)';
      case 'calm':
      default:
        return 'translate(0, 0)';
    }
  }, [emotion, isThinking]);

  // Head tilt based on emotion, listening, and thinking
  const headTransform = useMemo(() => {
    if (reducedMotion) return '';
    if (isListening) return 'rotate(1.5 100 100) translate(0 1.5)';
    if (isThinking) return 'rotate(2.2 100 100) translate(0 0.5)';
    switch (emotion) {
      case 'caring':
      case 'comforting':
        return 'rotate(2 100 100)';
      case 'happy':
      case 'excited':
        return 'rotate(-2 100 100) translate(0 -1)';
      case 'playful':
      case 'gentle-laughing':
        return 'rotate(2.8 100 100) translate(0 -0.8)';
      case 'encouraging':
      case 'proud':
        return 'rotate(1 100 100) translate(0 -1.5)';
      case 'curious':
      case 'surprised':
        return 'rotate(-2.5 100 100) translate(0 -1)';
      case 'thoughtful':
        return 'rotate(2 100 100) translate(0 0.5)';
      case 'worried':
      case 'sad-empathetic':
        return 'rotate(2.2 100 100) translate(0 1.0)';
      case 'serious':
        return 'rotate(0 100 100)';
      case 'calm':
      default:
        return 'rotate(0 100 100)';
    }
  }, [emotion, isListening, isThinking, reducedMotion]);

  // Eyes rendering depending on blinking, emotion, listening, and thinking
  const renderEyes = () => {
    if (isBlinking) {
      return (
        <g stroke="#1F2937" strokeWidth="2.8" strokeLinecap="round" fill="none">
          <path d="M 80 88 Q 88 92 96 88" />
          <path d="M 104 88 Q 112 92 120 88" />
        </g>
      );
    }

    const isJoyful = ['happy', 'excited', 'playful', 'gentle-laughing', 'proud'].includes(emotion);
    if (isJoyful && !isListening && !isThinking) {
      return (
        <g stroke="#1F2937" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M 78 89 Q 88 79 98 89" />
          <path d="M 102 89 Q 112 79 122 89" />
          {characterId === 'aneet' && (
            <>
              <path d="M 98 89 L 100 87" strokeWidth="2" />
              <path d="M 122 89 L 124 87" strokeWidth="2" />
            </>
          )}
        </g>
      );
    }

    // Open eyes with pupil and catchlight
    const eyeRadiusX = characterId === 'ren' ? 7.2 : 6.8;
    const eyeRadiusY = characterId === 'ren' ? 6.2 : 6.8; // Ren has slightly relaxed half-lidded eyes
    const pupilRadius = 4.6;

    return (
      <g>
        {/* Left eye sclera */}
        <ellipse cx="88" cy="87" rx={eyeRadiusX} ry={eyeRadiusY} fill="#FFFFFF" />
        {/* Right eye sclera */}
        <ellipse cx="112" cy="87" rx={eyeRadiusX} ry={eyeRadiusY} fill="#FFFFFF" />

        {/* Iris / Pupils */}
        <circle
          cx={isListening ? 88.5 : isThinking ? 87.5 : 88}
          cy={isListening ? 87.5 : isThinking ? 85.8 : 87}
          r={pupilRadius}
          fill={theme.eyeColor}
        />
        <circle
          cx={isListening ? 112.5 : isThinking ? 111.5 : 112}
          cy={isListening ? 87.5 : isThinking ? 85.8 : 87}
          r={pupilRadius}
          fill={theme.eyeColor}
        />

        {/* Shiny Catchlights */}
        <circle cx={isThinking ? 86.5 : 86} cy={isThinking ? 84.0 : 84.5} r="2" fill="#FFFFFF" />
        <circle cx={isThinking ? 110.5 : 110} cy={isThinking ? 84.0 : 84.5} r="2" fill="#FFFFFF" />

        {/* Eyelash line for female characters */}
        {(characterId === 'aneet' || characterId === 'mira') && (
          <g stroke="#1F2937" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M 80 85 Q 88 80 96 85" />
            <path d="M 104 85 Q 112 80 120 85" />
          </g>
        )}
      </g>
    );
  };

  // Mouth rendering based on mouth shape
  const renderMouth = () => {
    switch (effectiveMouth) {
      case 'wide_open':
        return (
          <g>
            <path d="M 91 113 Q 100 131 109 113 Z" fill="#DC2626" stroke="#B91C1C" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M 94 113 Q 100 117 106 113" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <ellipse cx="100" cy="123" rx="4.5" ry="2.5" fill="#EF4444" />
          </g>
        );

      case 'small_open':
        return (
          <g>
            <ellipse cx="100" cy="116" rx="5.5" ry="4" fill="#B91C1C" stroke="#991B1B" strokeWidth="1.2" />
            <ellipse cx="100" cy="117.5" rx="3.2" ry="1.8" fill="#F87171" />
          </g>
        );

      case 'oo':
        return (
          <g>
            <circle cx="100" cy="116" r="4.2" fill="#991B1B" stroke="#7F1D1D" strokeWidth="1.2" />
            <circle cx="100" cy="116" r="2.2" fill="#F87171" />
          </g>
        );

      case 'smile':
        return (
          <g>
            <path d="M 90 113 Q 100 125 110 113" stroke="#991B1B" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Dimple accents */}
            <path d="M 88 112 L 89 114" stroke="#B91C1C" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 112 112 L 111 114" stroke="#B91C1C" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );

      case 'closed':
      default:
        if (emotion === 'serious') {
          return (
            <path d="M 93 116 Q 100 112 107 116" stroke="#9A3412" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          );
        }
        return (
          <path d="M 92 114 Q 100 120 108 114" stroke="#991B1B" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        );
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${sizeMap[size]} ${className}`}
      style={{
        filter: showGlow ? `drop-shadow(0 6px 16px ${theme.glowColor})` : undefined,
      }}
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full overflow-hidden rounded-full shadow-inner select-none transition-transform duration-300"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Radial glow background gradient */}
          <radialGradient id={`glow-${characterId}`} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="60%" stopColor={theme.bgGradientStart} stopOpacity="0.9" />
            <stop offset="100%" stopColor={theme.bgGradientEnd} stopOpacity="1" />
          </radialGradient>

          {/* Skin linear gradients */}
          <linearGradient id={`skin-${characterId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.skinBase} />
            <stop offset="100%" stopColor={theme.skinShadow} />
          </linearGradient>

          {/* Hair gradients */}
          <linearGradient id={`hair-${characterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#37322F" />
            <stop offset="100%" stopColor={theme.hair} />
          </linearGradient>
        </defs>

        {/* ======================================================== */}
        {/* LAYER 1: BACKGROUND GLOW & DISC                          */}
        {/* ======================================================== */}
        <circle cx="100" cy="100" r="100" fill={`url(#glow-${characterId})`} />
        {/* Subtle decorative inner soft ring */}
        <circle cx="100" cy="100" r="95" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />

        {/* ======================================================== */}
        {/* LAYER 5: HAIR BACK (Aneet's long hair, Rani's braids)    */}
        {/* ======================================================== */}
        {characterId === 'aneet' && (
          <g id="hair-back-aneet">
            <path d="M 52 75 Q 40 135 50 195 L 75 198 Q 60 145 66 105 Z" fill="#171412" />
            <path d="M 148 75 Q 160 135 150 195 L 125 198 Q 140 145 134 105 Z" fill="#171412" />
          </g>
        )}

        {characterId === 'mira' && (
          <g id="hair-back-mira">
            {/* Long sleek dark hair cascading behind shoulders */}
            <path d="M 50 72 Q 36 128 42 196 L 72 198 Q 58 138 64 98 Z" fill="#111827" />
            <path d="M 150 72 Q 164 128 158 196 L 128 198 Q 142 138 136 98 Z" fill="#111827" />
          </g>
        )}

        {/* ======================================================== */}
        {/* LAYER 2: BODY & CLOTHES (Subtle breathing movement)      */}
        {/* ======================================================== */}
        <g id="body-clothes-group" className={breathingClass} style={{ transformOrigin: '100px 180px' }}>
          {/* RAJ: Adult male shoulders, relaxed posture, casual blue shirt */}
          {characterId === 'raj' && (
            <g id="raj-clothes">
              {/* Broad relaxed shoulders */}
              <path d="M 32 200 L 32 186 Q 58 152 82 144 L 100 156 L 118 144 Q 142 152 168 186 L 168 200 Z" fill={theme.clothMain} />
              {/* V-neck collar & folds */}
              <path d="M 76 144 L 100 178 L 92 142 Z" fill="#2563EB" />
              <path d="M 124 144 L 100 178 L 108 142 Z" fill="#3B82F6" />
              {/* Inner comfortable shirt */}
              <path d="M 93 158 Q 100 162 107 158 L 105 174 L 95 174 Z" fill="#93C5FD" />
            </g>
          )}

          {/* ANEET: Adult female shoulders, warm peach / coral kurta */}
          {characterId === 'aneet' && (
            <g id="aneet-clothes">
              <path d="M 36 200 Q 56 154 84 144 L 100 166 L 116 144 Q 144 154 164 200 Z" fill={theme.clothMain} />
              {/* Elegant embroidered neckline */}
              <path d="M 84 144 Q 100 166 116 144" stroke="#FDE047" strokeWidth="3" fill="none" />
              <circle cx="100" cy="155" r="2.5" fill="#FACC15" />
              <circle cx="100" cy="168" r="2.2" fill="#FDE047" />
              {/* Subtle gold necklace */}
              <path d="M 88 135 Q 100 148 112 135" stroke="#FBBF24" strokeWidth="1.8" fill="none" />
            </g>
          )}

          {/* MIRA: 18-year-old young woman, neat casual/school style outfit with subtle ribbon pin */}
          {characterId === 'mira' && (
            <g id="mira-clothes">
              <path d="M 36 200 Q 58 152 85 144 L 100 166 L 115 144 Q 142 152 164 200 Z" fill={theme.clothMain} />
              {/* Crisp stylish collar */}
              <path d="M 85 144 L 100 166 L 115 144" stroke="#A5B4FC" strokeWidth="2.5" fill="none" />
              {/* Cute neat ribbon tie */}
              <circle cx="100" cy="154" r="3" fill="#C084FC" />
              <path d="M 97 156 L 94 166 M 103 156 L 106 166" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}

          {/* REN: 18-year-old young man, casual loose clothing/hoodie */}
          {characterId === 'ren' && (
            <g id="ren-clothes">
              <path d="M 32 200 Q 54 150 82 142 L 100 164 L 118 142 Q 146 150 168 200 Z" fill={theme.clothMain} />
              {/* Loose hoodie collar & strings */}
              <path d="M 82 142 Q 100 164 118 142" stroke="#475569" strokeWidth="4" fill="none" />
              <line x1="94" y1="158" x2="94" y2="176" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
              <line x1="106" y1="158" x2="106" y2="174" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}
        </g>

        {/* ======================================================== */}
        {/* LAYER 3: NECK & HEAD GROUP (With Sway / Tilt / Nod Engine)*/}
        {/* ======================================================== */}
        <g id="head-neck-group" className={movementClass} style={{ transformOrigin: '100px 140px', transform: headTransform }}>
          
          {/* NECK */}
          <path
            d={
              characterId === 'raj'
                ? 'M 82 116 L 82 148 L 118 148 L 118 116 Z'
                : characterId === 'aneet'
                ? 'M 85 112 L 85 145 L 115 145 L 115 112 Z'
                : 'M 88 122 L 88 150 L 112 150 L 112 122 Z'
            }
            fill={`url(#skin-${characterId})`}
          />
          {/* Neck shadow under chin */}
          <ellipse cx="100" cy="120" rx="14" ry="4" fill={theme.skinShadow} opacity="0.6" />

          {/* HEAD / FACE SHAPE */}
          {characterId === 'raj' && (
            <g id="head-raj">
              {/* Adult defined jawline */}
              <path d="M 68 85 Q 68 136 100 138 Q 132 136 132 85 Q 132 46 100 46 Q 68 46 68 85 Z" fill={`url(#skin-${characterId})`} />
              {/* Light 5-o'clock stubble along jaw */}
              <path d="M 72 98 Q 72 135 100 137 Q 128 135 128 98 Q 120 120 100 123 Q 80 120 72 98 Z" fill="#884C32" opacity="0.25" />
              {/* Ears */}
              <circle cx="67" cy="90" r="8.5" fill={theme.skinShadow} />
              <circle cx="133" cy="90" r="8.5" fill={theme.skinShadow} />
            </g>
          )}

          {characterId === 'aneet' && (
            <g id="head-aneet">
              {/* Elegant oval face */}
              <path d="M 70 82 Q 70 134 100 136 Q 130 134 130 82 Q 130 45 100 45 Q 70 45 70 82 Z" fill={`url(#skin-${characterId})`} />
              {/* Delicate ears with gold studs */}
              <circle cx="68" cy="91" r="7.5" fill={theme.skinShadow} />
              <circle cx="132" cy="91" r="7.5" fill={theme.skinShadow} />
              <circle cx="68" cy="94" r="2.5" fill="#FACC15" />
              <circle cx="132" cy="94" r="2.5" fill="#FACC15" />
              {/* Small traditional red bindi */}
              <circle cx="100" cy="68" r="2.2" fill="#991B1B" />
            </g>
          )}

          {characterId === 'mira' && (
            <g id="head-mira">
              {/* Composed 18-year-old face with bashful blush */}
              <circle cx="100" cy="94" r="37" fill={`url(#skin-${characterId})`} />
              {/* Secret bashful blush */}
              <circle cx="76" cy="103" r="8.5" fill={theme.blush} opacity="0.45" />
              <circle cx="124" cy="103" r="8.5" fill={theme.blush} opacity="0.45" />
              {/* Neat ears */}
              <circle cx="62" cy="95" r="8" fill={theme.skinShadow} />
              <circle cx="138" cy="95" r="8" fill={theme.skinShadow} />
            </g>
          )}

          {characterId === 'ren' && (
            <g id="head-ren">
              {/* Relaxed young man face */}
              <circle cx="100" cy="94" r="38" fill={`url(#skin-${characterId})`} />
              <circle cx="78" cy="104" r="7" fill={theme.blush} opacity="0.25" />
              <circle cx="122" cy="104" r="7" fill={theme.blush} opacity="0.25" />
              {/* Ears */}
              <circle cx="61" cy="95" r="8.5" fill={theme.skinShadow} />
              <circle cx="139" cy="95" r="8.5" fill={theme.skinShadow} />
            </g>
          )}

          {/* ======================================================== */}
          {/* LAYER 7: EYEBROWS (React to Gemini emotion tags)         */}
          {/* ======================================================== */}
          <g id="eyebrows-group" style={{ transform: eyebrowTransform, transformOrigin: '100px 75px' }}>
            {characterId === 'raj' && (
              <g stroke="#18181B" strokeWidth="3.2" strokeLinecap="round" fill="none">
                <path d="M 76 72 Q 86 68 95 72" />
                <path d="M 124 72 Q 114 68 105 72" />
              </g>
            )}

            {characterId === 'aneet' && (
              <g stroke="#1C1917" strokeWidth="2.4" strokeLinecap="round" fill="none">
                <path d="M 78 70 Q 87 65 95 70" />
                <path d="M 122 70 Q 113 65 105 70" />
              </g>
            )}

            {characterId === 'mira' && (
              <g stroke="#111827" strokeWidth="2.2" strokeLinecap="round" fill="none">
                <path d="M 78 71 Q 87 66 95 71" />
                <path d="M 122 71 Q 113 66 105 71" />
              </g>
            )}

            {characterId === 'ren' && (
              <g stroke="#1F2937" strokeWidth="2.8" strokeLinecap="round" fill="none">
                <path d="M 76 73 Q 86 69 94 73" />
                <path d="M 124 73 Q 114 69 106 73" />
              </g>
            )}
          </g>

          {/* ======================================================== */}
          {/* LAYER 8: EYES & BLINKING                                 */}
          {/* ======================================================== */}
          <g id="eyes-group">{renderEyes()}</g>

          {/* ======================================================== */}
          {/* LAYER 9: NOSE                                            */}
          {/* ======================================================== */}
          {characterId === 'raj' && (
            <path d="M 98 84 Q 102 94 97 96 L 103 96" stroke="#B46E47" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          )}
          {characterId === 'aneet' && (
            <path d="M 99 82 Q 101 92 97 94 L 102 94" stroke="#B46E47" strokeWidth="2" strokeLinecap="round" fill="none" />
          )}
          {characterId === 'mira' && (
            <path d="M 99 83 Q 101 92 98 94 L 102 94" stroke="#D8986B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          )}
          {characterId === 'ren' && (
            <path d="M 98 84 Q 102 93 97 95 L 103 95" stroke="#B46E47" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          )}

          {/* ======================================================== */}
          {/* LAYER 10: MOUTH & SPEECH LIP SYNC                        */}
          {/* ======================================================== */}
          <g id="mouth-group">{renderMouth()}</g>

          {/* ======================================================== */}
          {/* LAYER 6: HAIR FRONT (Neat sweep, bangs, locks)          */}
          {/* ======================================================== */}
          {characterId === 'raj' && (
            <g id="hair-front-raj">
              {/* Short neat adult hair */}
              <path d="M 64 80 Q 64 38 100 34 Q 136 38 136 80 Q 132 58 125 48 Q 105 44 80 47 Q 67 58 64 80 Z" fill={`url(#hair-${characterId})`} />
              {/* Side sweep texture */}
              <path d="M 74 48 Q 96 38 124 44 Q 112 48 94 48 Z" fill="#3F3F46" />
            </g>
          )}

          {characterId === 'aneet' && (
            <g id="hair-front-aneet">
              {/* Soft flowing hair framing face */}
              <path d="M 64 78 Q 62 38 100 35 Q 138 38 136 78 Q 128 54 118 46 Q 100 44 82 46 Q 72 54 64 78 Z" fill={`url(#hair-${characterId})`} />
              {/* Face-framing locks */}
              <path d="M 66 74 Q 68 114 74 134 Q 70 114 70 78 Z" fill="#292524" />
              <path d="M 134 74 Q 132 114 126 134 Q 130 114 130 78 Z" fill="#292524" />
            </g>
          )}

          {characterId === 'mira' && (
            <g id="hair-front-mira">
              {/* Long straight dark hair framing face with neat bangs */}
              <path d="M 62 82 Q 58 38 100 34 Q 142 38 138 82 Q 130 54 118 46 Q 100 44 82 46 Q 70 54 62 82 Z" fill={`url(#hair-${characterId})`} />
              <path d="M 64 76 Q 66 118 72 138 Q 68 116 68 76 Z" fill="#111827" />
              <path d="M 136 76 Q 134 118 128 138 Q 132 116 132 76 Z" fill="#111827" />
            </g>
          )}

          {characterId === 'ren' && (
            <g id="hair-front-ren">
              {/* Slightly messy, relaxed hair */}
              <path
                d="M 60 82 Q 56 38 100 34 Q 144 38 140 82 Q 134 62 128 52 L 122 58 Q 116 46 106 48 L 98 56 Q 92 46 82 48 L 76 58 Q 66 62 60 82 Z"
                fill={`url(#hair-${characterId})`}
              />
              <path d="M 96 34 Q 102 26 108 32" stroke="#1F2937" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            </g>
          )}

        </g>
      </svg>

      {/* Online / Active status pulse indicator */}
      <span
        className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white shadow-xs ${
          size === 'hero' ? 'w-5 h-5' : size === 'xl' || size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'
        } ${isSpeaking ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-400'}`}
        title={isSpeaking ? 'Speaking...' : isListening ? 'Listening attentively...' : 'Ready to listen'}
      />
    </div>
  );
};
