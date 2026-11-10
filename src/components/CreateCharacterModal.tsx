import React, { useState } from 'react';
import {
  X,
  Upload,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { HumanCharacter, AvatarCustomOptions } from '../types/avatarHuman';
import {
  HAIR_COLORS,
  HAIR_STYLES,
  EYE_COLORS,
  SKIN_TONES,
  OUTFIT_OPTIONS,
  BACKGROUND_OPTIONS,
} from '../utils/defaultCharacters';

interface CreateCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCharacter: (newChar: HumanCharacter) => void;
}

export const CreateCharacterModal: React.FC<CreateCharacterModalProps> = ({
  isOpen,
  onClose,
  onCreateCharacter,
}) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(18);
  const [gender, setGender] = useState<'female' | 'male' | 'non-binary'>('female');
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0]);
  const [hairStyle, setHairStyle] = useState(HAIR_STYLES[0]);
  const [eyeColor, setEyeColor] = useState(EYE_COLORS[0]);
  const [skinTone, setSkinTone] = useState(SKIN_TONES[0]);
  const [outfit, setOutfit] = useState(OUTFIT_OPTIONS[0].desc);
  const [background, setBackground] = useState(BACKGROUND_OPTIONS[0].desc);
  const [personality, setPersonality] = useState(
    'Friendly, witty, and thoughtful. Enjoys chatting about science, books, and creative projects.'
  );
  const [speakingStyle, setSpeakingStyle] = useState(
    'Warm, conversational, slightly playful, and uses concise sentences.'
  );

  const [referencePhotoBase64, setReferencePhotoBase64] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [ageError, setAgeError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please upload a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('Image must be under 8MB in size.');
      return;
    }

    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setReferencePhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAgeChange = (val: number) => {
    setAge(val);
    if (val < 18) {
      setAgeError('Character must be 18 years or older (strict requirement).');
    } else {
      setAgeError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    if (age < 18) {
      setAgeError('Characters must be at least 18 years old.');
      return;
    }

    const id = `custom_${Date.now()}_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const customOptions: AvatarCustomOptions = {
      hairColor,
      hairStyle,
      eyeColor,
      skinTone,
      outfit,
      background,
      expression: 'neutral',
    };

    // If reference photo was uploaded, use it directly as initial portrait and base reference!
    const defaultPortrait =
      referencePhotoBase64 ||
      (gender === 'male' ? '/avatars/ren_neutral.jpg' : '/avatars/mira_neutral.jpg');

    const newChar: HumanCharacter = {
      id,
      name: name.trim(),
      age: Math.max(18, age),
      gender,
      tagline: `Custom 18+ avatar · ${personality.slice(0, 45)}...`,
      lookDescription: `Photorealistic 18+ ${gender} with ${hairColor} ${hairStyle}, ${eyeColor} eyes, ${skinTone}. Outfit: ${outfit}.`,
      personality: personality.trim(),
      speakingStyle: speakingStyle.trim(),
      initialPortraitUrl: defaultPortrait,
      currentImageUrl: defaultPortrait,
      baseReferenceImage: referencePhotoBase64 || undefined,
      customOptions,
      isCustom: true,
    };

    onCreateCharacter(newChar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-7 max-h-[92vh] overflow-y-auto my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Create Fictional Human Avatar
              </h2>
              <p className="text-xs text-slate-400">
                Design a custom 18+ photorealistic AI character and personality.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Policy Warning Banner */}
        <div className="mt-4 p-3 rounded-2xl bg-indigo-950/40 border border-indigo-800/50 flex items-start gap-2.5 text-xs text-indigo-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block text-slate-100">
              Responsible AI Policy & Age Constraint
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              All characters must be at least 18 years of age. You may optionally upload your OWN photo to create an avatar likeness of yourself. Generating avatars of other real people, celebrities, or public figures is strictly prohibited.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          {/* Row 1: Name, Age, Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Name <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maya, Alex, Kieran..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Age (18+ only) <span className="text-pink-400">*</span>
              </label>
              <input
                type="number"
                min={18}
                max={99}
                required
                value={age}
                onChange={(e) => handleAgeChange(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {ageError && (
                <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {ageError}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
              </select>
            </div>
          </div>

          {/* Row 2: Hair, Eyes, Skin */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Hair</label>
              <select
                value={hairColor}
                onChange={(e) => setHairColor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mb-1.5"
              >
                {HAIR_COLORS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={hairStyle}
                onChange={(e) => setHairStyle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {HAIR_STYLES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Eyes</label>
              <select
                value={eyeColor}
                onChange={(e) => setEyeColor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {EYE_COLORS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Skin Tone</label>
              <select
                value={skinTone}
                onChange={(e) => setSkinTone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {SKIN_TONES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Outfit & Background */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Outfit</label>
              <input
                type="text"
                value={outfit}
                onChange={(e) => setOutfit(e.target.value)}
                placeholder="e.g. Modern dark wool coat, white ribbed turtleneck"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Background Setting
              </label>
              <input
                type="text"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="e.g. Sunlit art studio with canvas easels"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Personality (System Prompt) */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Personality (Becomes the Chat System Prompt) <span className="text-pink-400">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="Describe their temperament, what they care about, quirks, and mannerisms..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Speaking Style */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Speaking Style
            </label>
            <input
              type="text"
              value={speakingStyle}
              onChange={(e) => setSpeakingStyle(e.target.value)}
              placeholder="e.g. Thoughtful, speaks gently, occasionally uses metaphors"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Reference Photo Upload (Own Photo Only) */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                Upload Your Own Reference Photo (Optional)
              </span>
              <span className="text-[10px] text-slate-400">Self only · No public figures</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer text-center transition-all">
                <span>Choose Image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              {referencePhotoBase64 && (
                <div className="flex items-center gap-2">
                  <img
                    src={referencePhotoBase64}
                    alt="Reference preview"
                    className="w-10 h-10 rounded-xl object-cover border border-indigo-500"
                  />
                  <span className="text-xs text-emerald-400 font-medium">
                    Photo attached as face reference
                  </span>
                  <button
                    type="button"
                    onClick={() => setReferencePhotoBase64(null)}
                    className="text-xs text-slate-500 hover:text-slate-300 ml-1"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {photoError && (
              <p className="text-[11px] text-rose-400 mt-2">{photoError}</p>
            )}
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(ageError) || !name.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create & Activate Avatar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
