import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  RotateCcw,
  Check,
  Sparkles,
  Image as ImageIcon,
  Palette,
  Eye,
  Link as LinkIcon,
  SlidersHorizontal,
  Shuffle,
  ShieldCheck,
  Lock,
  Smile,
  Shirt
} from 'lucide-react';
import { AvatarId, Language, AvatarVisualMode } from '../types';
import {
  AVATAR_LIST,
  AVATAR_FRIENDS,
  getAvatarVisualMode,
  setAvatarVisualMode,
  getCompanionEffectivePicture,
  setCompanionCustomPicture,
  resetCompanionPicture,
} from '../utils/avatarFriends';
import { AvatarCharacter } from './AvatarCharacter';
import {
  HAIR_COLORS,
  HAIR_STYLES,
  EYE_COLORS,
  SKIN_TONES,
  OUTFIT_OPTIONS,
  BACKGROUND_OPTIONS,
  EXPRESSION_OPTIONS,
} from '../utils/defaultCharacters';
import { getActiveUser } from '../utils/authStorage';
import { ADMIN_EMAIL } from '../services/firebaseAuth';

interface AvatarPictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAvatarId?: AvatarId;
  language?: Language;
  isAdmin?: boolean;
}

export const AvatarPictureModal: React.FC<AvatarPictureModalProps> = ({
  isOpen,
  onClose,
  initialAvatarId = 'raj',
  language = 'en',
  isAdmin,
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(initialAvatarId);
  const [modalTab, setModalTab] = useState<'ai-customizer' | 'upload-styles'>('ai-customizer');
  const [visualMode, setVisualModeState] = useState<AvatarVisualMode>(() => getAvatarVisualMode());
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Customizer styling state
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0]);
  const [hairStyle, setHairStyle] = useState(HAIR_STYLES[0]);
  const [eyeColor, setEyeColor] = useState(EYE_COLORS[0]);
  const [skinTone, setSkinTone] = useState(SKIN_TONES[0]);
  const [outfit, setOutfit] = useState(OUTFIT_OPTIONS[0].desc);
  const [background, setBackground] = useState(BACKGROUND_OPTIONS[0].desc);
  const [expression, setExpression] = useState<string>('neutral');

  if (!isOpen) return null;

  const isUserAdmin = isAdmin ?? (() => {
    const cached = getActiveUser();
    return cached?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() || cached?.role === 'admin';
  })();

  if (!isUserAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Admin Permission Required</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Only authorized administrators have permission to customize avatar appearances and generate AI portraits. Regular users can choose their companion to chat with.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isHi = language === 'hi';
  const friend = AVATAR_FRIENDS[selectedAvatar] || AVATAR_FRIENDS.raj;
  const currentPicture = getCompanionEffectivePicture(selectedAvatar);
  const isCustomPictureSet = currentPicture !== friend.avatarImageUrl;

  const handleVisualModeChange = (mode: AvatarVisualMode) => {
    setVisualModeState(mode);
    setAvatarVisualMode(mode);
    window.dispatchEvent(new Event('saathi_avatar_pic_updated'));
    setSavedNotice(
      mode === 'portrait'
        ? isHi
          ? 'स्टूडियो पोर्ट्रेट मोड सक्रिय!'
          : 'Studio Portrait Mode activated!'
        : isHi
        ? 'एनिमेटेड 2D इलस्ट्रेशन सक्रिय!'
        : 'Animated 2D Illustration activated!'
    );
    setTimeout(() => setSavedNotice(null), 2500);
  };

  // AI Generation with Gemini model and Face Consistency
  const handleGenerateAiPortrait = async () => {
    setIsGeneratingAi(true);
    setGenerationError(null);

    try {
      // Get base reference image from current picture
      const referenceBase64 = currentPicture.startsWith('data:image') ? currentPicture : '';

      const response = await fetch('/api/human-avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: selectedAvatar,
          name: friend.name,
          gender: friend.gender,
          options: {
            hairColor,
            hairStyle,
            eyeColor,
            skinTone,
            outfit,
            background,
            expression,
          },
          referenceImageBase64: referenceBase64,
        }),
      });

      const data = await response.json();

      if (data.imageUrl) {
        setCompanionCustomPicture(selectedAvatar, data.imageUrl);
        setAvatarVisualMode('portrait');
        setVisualModeState('portrait');
        window.dispatchEvent(new Event('saathi_avatar_pic_updated'));

        setSavedNotice(
          isHi
            ? `${friend.name} के लिए नया AI पोर्ट्रेट सफलतापूर्वक उत्पन्न हुआ!`
            : `New photorealistic portrait generated for ${friend.name}!`
        );
        setTimeout(() => setSavedNotice(null), 3500);
      } else {
        setGenerationError(data.message || 'Could not generate avatar portrait right now.');
      }
    } catch (err: any) {
      console.error('Avatar generation failed:', err);
      setGenerationError(err?.message || 'Failed to connect to image generator');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleRandomizeAiOptions = () => {
    setHairColor(HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)]);
    setHairStyle(HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)]);
    setEyeColor(EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)]);
    setSkinTone(SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]);
    setOutfit(OUTFIT_OPTIONS[Math.floor(Math.random() * OUTFIT_OPTIONS.length)].desc);
    setBackground(BACKGROUND_OPTIONS[Math.floor(Math.random() * BACKGROUND_OPTIONS.length)].desc);
    setExpression(EXPRESSION_OPTIONS[Math.floor(Math.random() * EXPRESSION_OPTIONS.length)].id);
  };

  // Process uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(isHi ? 'कृपया एक वैध छवि फ़ाइल चुनें' : 'Please select a valid image file');
      return;
    }

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let w = img.width;
        let h = img.height;
        const scale = Math.min(maxDim / w, maxDim / h, 1);
        w = Math.round(w * scale);
        h = Math.round(h * scale);

        const canvas = document.createElement('canvas');
        canvas.width = maxDim;
        canvas.height = maxDim;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, maxDim, maxDim);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

          setCompanionCustomPicture(selectedAvatar, dataUrl);
          setAvatarVisualMode('portrait');
          setVisualModeState('portrait');
          window.dispatchEvent(new Event('saathi_avatar_pic_updated'));

          setSavedNotice(
            isHi
              ? `${friend.name} के लिए नई फ़ोटो सहेज ली गई!`
              : `New photo saved for ${friend.name}!`
          );
          setTimeout(() => setSavedNotice(null), 3000);
        }
        setIsProcessingFile(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Apply custom URL
  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const url = customUrlInput.trim();
    if (!url) return;

    setCompanionCustomPicture(selectedAvatar, url);
    setAvatarVisualMode('portrait');
    setVisualModeState('portrait');
    window.dispatchEvent(new Event('saathi_avatar_pic_updated'));
    setCustomUrlInput('');
    setSavedNotice(
      isHi
        ? `${friend.name} के लिए छवि URL लागू किया गया!`
        : `Image URL applied for ${friend.name}!`
    );
    setTimeout(() => setSavedNotice(null), 3000);
  };

  // Reset to official original portrait
  const handleResetToDefault = () => {
    resetCompanionPicture(selectedAvatar);
    window.dispatchEvent(new Event('saathi_avatar_pic_updated'));
    setSavedNotice(
      isHi
        ? `${friend.name} की मूल फ़ोटो पुनर्स्थापित की गई!`
        : `Original photo restored for ${friend.name}!`
    );
    setTimeout(() => setSavedNotice(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-pic-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-700 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 id="avatar-pic-title" className="text-base sm:text-lg font-bold leading-tight flex items-center gap-2">
                <span>{isHi ? 'अवतार कस्टमाइज़ और फ़ोटो' : 'Avatar Customizer & Portrait'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 border border-white/30 font-medium">
                  Photorealistic
                </span>
              </h2>
              <p className="text-xs text-teal-100/90 font-medium">
                {isHi
                  ? 'अवतार का रूप, बाल, पोशाक, पृष्ठभूमि और भाव कस्टमाइज़ करें'
                  : 'Customize hairstyle, outfit, backdrop, expression, or upload your photo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs Bar */}
        <div className="bg-slate-100 px-4 sm:px-6 py-2 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalTab('ai-customizer')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              modalTab === 'ai-customizer'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
            <span>{isHi ? '✨ AI लुक कस्टमाइज़र' : '✨ AI Look Customizer'}</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('upload-styles')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              modalTab === 'upload-styles'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>{isHi ? '📷 फ़ोटो अपलोड / 2D मोड' : '📷 Photo Upload & Styles'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Success Banner */}
          {savedNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{savedNotice}</span>
            </div>
          )}

          {/* Error Banner */}
          {generationError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{generationError}</span>
            </div>
          )}

          {/* Companion Selection Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              {isHi ? 'साथी चुनें (Select Companion)' : 'Select Companion'}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
              {AVATAR_LIST.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedAvatar(c.id)}
                  className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    selectedAvatar === c.id
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200 scale-102'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <AvatarCharacter avatarId={c.id} size="xs" showRing={false} />
                  <span className="truncate max-w-full text-[11px]">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-50 via-teal-50/40 to-slate-100 border border-slate-200 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="relative shrink-0">
              <AvatarCharacter
                avatarId={selectedAvatar}
                size="hero"
                visualMode={visualMode}
                className="shadow-lg"
              />
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold shadow-xs whitespace-nowrap flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-teal-400" />
                <span>Face Locked</span>
              </span>
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">{friend.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${friend.badgeColor}`}>
                  {friend.headline}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {friend.personality}
              </p>
              <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-black/80 text-[10px] font-medium text-slate-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>AI-generated fictional person</span>
                </div>
                {isCustomPictureSet && (
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{isHi ? 'रीसेट करें' : 'Reset'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TAB 1: AI LOOK CUSTOMIZER */}
          {modalTab === 'ai-customizer' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {isHi ? 'रूप और शैली कस्टमाइज़ करें' : 'Customize Look, Outfit & Setting'}
                </span>
                <button
                  type="button"
                  onClick={handleRandomizeAiOptions}
                  className="text-xs text-purple-700 hover:text-purple-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{isHi ? 'रैंडमाइज़' : 'Randomize'}</span>
                </button>
              </div>

              {/* Hair & Eyes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Hair Color & Style</label>
                  <select
                    value={hairColor}
                    onChange={(e) => setHairColor(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {HAIR_COLORS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={hairStyle}
                    onChange={(e) => setHairStyle(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {HAIR_STYLES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Eyes & Complexion</label>
                  <select
                    value={eyeColor}
                    onChange={(e) => setEyeColor(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {EYE_COLORS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={skinTone}
                    onChange={(e) => setSkinTone(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {SKIN_TONES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Outfit Selection */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                  <span>Outfit Style</span>
                  <span className="text-[10px] text-slate-500 font-normal">Casual · Hoodie · Formal · Traditional</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {OUTFIT_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOutfit(item.desc)}
                      className={`p-2 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                        outfit.includes(item.id)
                          ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{item.label}</div>
                      <div className="text-[10px] text-slate-500 truncate">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Selection */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Background Setting</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {BACKGROUND_OPTIONS.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setBackground(bg.desc)}
                      className={`p-2 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                        background.includes(bg.id)
                          ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{bg.label}</div>
                      <div className="text-[10px] text-slate-500 truncate">{bg.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expression Selection */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Target Expression</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {EXPRESSION_OPTIONS.map((expr) => (
                    <button
                      key={expr.id}
                      type="button"
                      onClick={() => setExpression(expr.id)}
                      className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        expression === expr.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-sm">{expr.emoji}</div>
                      <div className="text-[10px] mt-0.5">{expr.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={handleGenerateAiPortrait}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-700 hover:from-teal-700 hover:to-indigo-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-700/20 transition-all cursor-pointer disabled:opacity-60"
              >
                <Sparkles className={`w-4 h-4 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>
                  {isGeneratingAi
                    ? isHi
                      ? `${friend.name} का नया पोर्ट्रेट तैयार हो रहा है...`
                      : `Rendering photorealistic portrait for ${friend.name}...`
                    : isHi
                    ? 'Gemini से नया पोर्ट्रेट उत्पन्न करें'
                    : 'Generate Photorealistic Portrait with Gemini'}
                </span>
              </button>
            </div>
          )}

          {/* TAB 2: UPLOAD & STYLES */}
          {modalTab === 'upload-styles' && (
            <div className="space-y-4">
              {/* Visual Style Selector Toggle */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  {isHi ? 'अवतार प्रदर्शन शैली (Avatar Style)' : 'Avatar Visual Style'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleVisualModeChange('portrait')}
                    className={`p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer text-left ${
                      visualMode === 'portrait'
                        ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/20 text-teal-950 font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">
                        {isHi ? 'यथार्थवादी स्टूडियो पोर्ट्रेट' : 'Realistic Studio Portrait'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        {isHi ? 'उच्च-रिज़ॉल्यूशन मानवीय तस्वीर' : 'Photographic studio portrait'}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVisualModeChange('illustration')}
                    className={`p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer text-left ${
                      visualMode === 'illustration'
                        ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/20 text-teal-950 font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">
                        {isHi ? 'एनिमेटेड 2D इलस्ट्रेशन' : 'Animated 2D Vector'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        {isHi ? 'बोलती और भावुक कार्टून शैली' : 'Interactive animated avatar'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Upload New Custom Picture */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700">
                  {isHi
                    ? `अपनी खुद की फ़ोटो अपलोड करें (${friend.name} के लिए)`
                    : `Upload Your Own Picture for ${friend.name}`}
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isProcessingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {isProcessingFile
                        ? (isHi ? 'फ़ोटो तैयार हो रही है...' : 'Processing image...')
                        : (isHi ? 'डिवाइस से फ़ोटो चुनें' : 'Choose from Device')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-200 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                    <span>{isHi ? 'मूल डिफ़ॉल्ट पोर्ट्रेट' : 'Restore Official Portrait'}</span>
                  </button>
                </div>

                {/* Optional Image URL Input */}
                <form onSubmit={handleApplyUrl} className="flex gap-2 pt-1">
                  <div className="relative flex-1">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder={
                        isHi
                          ? 'या ऑनलाइन छवि का URL यहाँ पेस्ट करें...'
                          : 'Or paste an online image URL...'
                      }
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!customUrlInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    {isHi ? 'लागू करें' : 'Apply'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
          >
            {isHi ? 'पूर्ण (Done)' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
