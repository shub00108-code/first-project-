import React, { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  Shuffle,
  RefreshCw,
  Plus,
  ShieldCheck,
  Download,
  Lock,
  Maximize2,
  Info
} from 'lucide-react';
import { HumanCharacter, ExpressionType } from '../types/avatarHuman';
import { EXPRESSION_OPTIONS } from '../utils/defaultCharacters';

interface AvatarViewerProps {
  characters: HumanCharacter[];
  activeCharacter: HumanCharacter;
  onSelectCharacter: (id: string) => void;
  onOpenCreateModal: () => void;
  onExpressionChange: (expr: ExpressionType) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onRandomize: () => void;
  onReset: () => void;
  isGenerating: boolean;
  generatingProgressText?: string;
  hasCachedVariant?: boolean;
}

export const AvatarViewer: React.FC<AvatarViewerProps> = ({
  characters,
  activeCharacter,
  onSelectCharacter,
  onOpenCreateModal,
  onExpressionChange,
  onGenerate,
  onRegenerate,
  onRandomize,
  onReset,
  isGenerating,
  generatingProgressText,
}) => {
  const [showFullView, setShowFullView] = useState(false);
  const currentExpression = activeCharacter.customOptions.expression;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = activeCharacter.currentImageUrl;
    link.download = `${activeCharacter.name.toLowerCase()}_${currentExpression}_avatar.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Switch Avatar Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              AI Human Avatars
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-medium">
              18+ Photorealistic
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Two fictional AI-generated humans. Customize looks, facial expressions, and chat in character.
          </p>
        </div>

        {/* Character Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-2xl w-full sm:w-auto overflow-x-auto">
          {characters.map((char) => {
            const isSelected = char.id === activeCharacter.id;
            return (
              <button
                key={char.id}
                onClick={() => onSelectCharacter(char.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                <span>{char.name}</span>
                <span className="text-[10px] opacity-75 font-normal">({char.age}y)</span>
              </button>
            );
          })}

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/50 border border-dashed border-indigo-800/60 transition-all whitespace-nowrap ml-1"
            title="Create Custom Fictional Avatar (18+)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Avatar</span>
          </button>
        </div>
      </div>

      {/* Main Portrait Display Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-center">
        {/* Left / Center: Large Avatar Card */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full max-w-[460px] aspect-square rounded-3xl overflow-hidden border-2 border-slate-700/80 shadow-2xl bg-slate-950 group">
            {/* The Photorealistic Avatar Portrait */}
            <img
              src={activeCharacter.currentImageUrl}
              alt={`${activeCharacter.name} photorealistic avatar`}
              className={`w-full h-full object-cover object-top transition-transform duration-700 ${
                isGenerating ? 'scale-105 filter blur-xs opacity-70' : 'group-hover:scale-[1.02]'
              }`}
            />

            {/* Subtle Gradient Overlays for Readability */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

            {/* Top Bar on Image: Character Identity & Tools */}
            <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/70 text-xs font-semibold text-slate-200 flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {activeCharacter.name} · {activeCharacter.age} yrs
                </span>
                <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-slate-700/50 text-[11px] text-slate-300 items-center gap-1">
                  <Lock className="w-3 h-3 text-indigo-400" />
                  Face Locked
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowFullView(true)}
                  className="p-2 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-slate-700/50 text-slate-300 hover:text-white transition-all shadow-md"
                  title="Expand view"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-slate-700/50 text-slate-300 hover:text-white transition-all shadow-md"
                  title="Download avatar image"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Loading / Generating Overlay */}
            {isGenerating && (
              <div className="absolute inset-0 z-20 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-full border-3 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <Sparkles className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <h3 className="text-base font-semibold text-white tracking-wide">
                  Generating Portrait
                </h3>
                <p className="text-xs text-indigo-200/80 max-w-xs mt-1 leading-relaxed">
                  {generatingProgressText || 'Gemini image model is rendering photorealistic facial features and lighting...'}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Preserving {activeCharacter.name}'s facial identity</span>
                </div>
              </div>
            )}

            {/* Bottom Mandatory Watermark & Expression Badge */}
            <div className="absolute bottom-3 inset-x-3 flex flex-col sm:flex-row items-center justify-between gap-2 z-10">
              {/* Mandatory AI-generated fictional person label */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 shadow-lg">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-medium tracking-tight">AI-generated fictional person</span>
              </div>

              {/* Current Expression Tag */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 backdrop-blur-md border border-indigo-700/60 text-[11px] text-indigo-200">
                <span>
                  {EXPRESSION_OPTIONS.find((e) => e.id === currentExpression)?.emoji || '✨'}
                </span>
                <span className="capitalize font-semibold">{currentExpression}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Character Info, Expression Selector & Quick Action Bar */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Character Bio Card */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {activeCharacter.name}
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    Age {activeCharacter.age} · {activeCharacter.gender}
                  </span>
                </div>
                <p className="text-xs text-indigo-400 font-medium mt-0.5">
                  {activeCharacter.tagline}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mt-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
              {activeCharacter.personality}
            </p>

            {activeCharacter.id === 'mira' && (
              <div className="mt-2.5 text-[11px] text-pink-300/90 bg-pink-950/30 border border-pink-900/40 rounded-xl px-3 py-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-pink-400 shrink-0" />
                <span>
                  Tip: Compliment Mira in chat to see her get flustered and reveal her bracketed thoughts!
                </span>
              </div>
            )}

            {activeCharacter.id === 'ren' && (
              <div className="mt-2.5 text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-900/40 rounded-xl px-3 py-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Tip: Ren is laid-back and teasing. Ask him about Mira or homework for witty banter.
                </span>
              </div>
            )}
          </div>

          {/* Facial Expression Selector Row */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Facial Expression
              </span>
              <span className="text-[11px] text-slate-400">
                Face consistency maintained
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {EXPRESSION_OPTIONS.map((expr) => {
                const isActive = currentExpression === expr.id;
                return (
                  <button
                    key={expr.id}
                    onClick={() => onExpressionChange(expr.id)}
                    disabled={isGenerating}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-medium transition-all border ${
                      isActive
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    } disabled:opacity-50`}
                  >
                    <span className="text-base">{expr.emoji}</span>
                    <span className="mt-0.5 text-[11px]">{expr.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons: Generate, Regenerate, Randomize, Reset */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="col-span-2 sm:col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Avatar</span>
            </button>

            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              title="Regenerate with current settings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>

            <button
              onClick={onRandomize}
              disabled={isGenerating}
              className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              title="Randomize style options"
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-400" />
              <span>Randomize</span>
            </button>

            <button
              onClick={onReset}
              disabled={isGenerating}
              className="col-span-2 sm:col-span-4 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Defaults</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Modal View */}
      {showFullView && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowFullView(false)}
        >
          <div
            className="relative max-w-2xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeCharacter.currentImageUrl}
              alt={activeCharacter.name}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">
                  {activeCharacter.name} ({activeCharacter.age}y)
                </p>
                <p className="text-xs text-emerald-400">AI-generated fictional person</p>
              </div>
              <button
                onClick={() => setShowFullView(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
