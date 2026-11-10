import React from 'react';
import {
  Palette,
  Sparkles,
  SlidersHorizontal,
  Shirt,
  Image as ImageIcon,
  Smile,
  Lock,
} from 'lucide-react';
import { AvatarCustomOptions, ExpressionType } from '../types/avatarHuman';
import {
  HAIR_COLORS,
  HAIR_STYLES,
  EYE_COLORS,
  SKIN_TONES,
  OUTFIT_OPTIONS,
  BACKGROUND_OPTIONS,
  EXPRESSION_OPTIONS,
} from '../utils/defaultCharacters';

interface CustomizePanelProps {
  options: AvatarCustomOptions;
  characterName: string;
  onOptionsChange: (newOptions: AvatarCustomOptions) => void;
  onApplyAndGenerate: () => void;
  isGenerating: boolean;
}

export const CustomizePanel: React.FC<CustomizePanelProps> = ({
  options,
  characterName,
  onOptionsChange,
  onApplyAndGenerate,
  isGenerating,
}) => {
  const handleChange = <K extends keyof AvatarCustomOptions>(key: K, value: AvatarCustomOptions[K]) => {
    onOptionsChange({
      ...options,
      [key]: value,
    });
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Customize Look & Setting
            </h2>
            <p className="text-xs text-slate-400">
              Style {characterName}'s hair, outfit, backdrop, and facial expression.
            </p>
          </div>
        </div>

        {/* Facial Consistency Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-slate-300">
            Face reference locked for consistent identity
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
        {/* Hair Section */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>Hair & Style</span>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Hair Color</label>
            <select
              value={options.hairColor}
              onChange={(e) => handleChange('hairColor', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {HAIR_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Hair Style</label>
            <select
              value={options.hairStyle}
              onChange={(e) => handleChange('hairStyle', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {HAIR_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Eyes & Complexion Section */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Smile className="w-3.5 h-3.5 text-indigo-400" />
            <span>Eyes & Skin Tone</span>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Eye Color</label>
            <select
              value={options.eyeColor}
              onChange={(e) => handleChange('eyeColor', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {EYE_COLORS.map((eye) => (
                <option key={eye} value={eye}>
                  {eye}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Skin Tone</label>
            <select
              value={options.skinTone}
              onChange={(e) => handleChange('skinTone', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {SKIN_TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expression Section */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Smile className="w-3.5 h-3.5 text-indigo-400" />
            <span>Target Expression</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {EXPRESSION_OPTIONS.map((expr) => {
              const selected = options.expression === expr.id;
              return (
                <button
                  type="button"
                  key={expr.id}
                  onClick={() => handleChange('expression', expr.id as ExpressionType)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium border transition-all ${
                    selected
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-sm">{expr.emoji}</span>
                  <span className="text-[10px] mt-0.5">{expr.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Outfit Selection */}
        <div className="md:col-span-2 lg:col-span-2 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Shirt className="w-3.5 h-3.5 text-indigo-400" />
              <span>Outfit Style</span>
            </div>
            <span className="text-[11px] text-slate-400">Casual · Hoodie · Formal · Traditional</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {OUTFIT_OPTIONS.map((item) => {
              const isSelected = options.outfit.toLowerCase().includes(item.id.toLowerCase());
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleChange('outfit', item.desc)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-950/50 border-indigo-500/80 text-white shadow-sm ring-1 ring-indigo-500/40'
                      : 'bg-slate-900 border-slate-800/90 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-200">{item.label}</div>
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                    {item.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-1">
            <label className="text-[11px] text-slate-400 block mb-1">
              Custom Outfit Description (optional)
            </label>
            <input
              type="text"
              value={options.outfit}
              onChange={(e) => handleChange('outfit', e.target.value)}
              placeholder="e.g. Navy blue oversized blazer, minimal silver chain..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Background Setting */}
        <div className="md:col-span-2 lg:col-span-1 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Background Setting</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {BACKGROUND_OPTIONS.map((bg) => {
              const isSelected = options.background.toLowerCase().includes(bg.id.toLowerCase());
              return (
                <button
                  type="button"
                  key={bg.id}
                  onClick={() => handleChange('background', bg.desc)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-950/50 border-indigo-500/80 text-white shadow-sm ring-1 ring-indigo-500/40'
                      : 'bg-slate-900 border-slate-800/90 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-200">{bg.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {bg.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-1">
            <label className="text-[11px] text-slate-400 block mb-1">
              Custom Setting (optional)
            </label>
            <input
              type="text"
              value={options.background}
              onChange={(e) => handleChange('background', e.target.value)}
              placeholder="e.g. Cozy indie bookstore cafe with rain on the window"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Bottom CTA to Apply */}
      <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          Clicking "Apply & Generate Portrait" will send the customized look to Gemini with the current face locked for visual consistency.
        </p>

        <button
          onClick={onApplyAndGenerate}
          disabled={isGenerating}
          className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Apply & Generate Portrait</span>
        </button>
      </div>
    </div>
  );
};
