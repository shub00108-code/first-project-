import React, { useState, useEffect } from 'react';
import { X, Sparkles, MessageCircle, Heart, Check, ArrowRight, Camera, Box } from 'lucide-react';
import { AvatarFriend, AvatarId, Language } from '../types';
import { AVATAR_LIST, saveLastChosenAvatarId } from '../utils/avatarFriends';
import { AvatarCharacter } from './AvatarCharacter';
import { AvatarPictureModal } from './AvatarPictureModal';
import { saveUserChosenCompanion, fetchCompanionAdminConfigs, CompanionAdminConfig } from '../services/avatarFirestoreService';

interface AvatarSelectModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSelectAvatar: (avatarId: AvatarId) => void;
  currentAvatarId?: AvatarId | null;
  language?: Language;
  userId?: string;
  isAdmin?: boolean;
}

export const AvatarSelectModal: React.FC<AvatarSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectAvatar,
  currentAvatarId,
  language = 'en',
  userId,
  isAdmin = false,
}) => {
  const [adminConfigs, setAdminConfigs] = useState<Record<string, CompanionAdminConfig> | null>(null);
  const [picModalAvatarId, setPicModalAvatarId] = useState<AvatarId | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCompanionAdminConfigs().then(setAdminConfigs).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isHi = language === 'hi';

  const handleSelect = (id: AvatarId) => {
    saveLastChosenAvatarId(id);
    if (userId) {
      saveUserChosenCompanion(userId, id).catch(() => {});
    }
    onSelectAvatar(id);
  };

  // Gradients matching requirements:
  // Raj: calm blue
  // Aneet: warm peach
  // Mira: indigo-violet
  // Ren: cool slate
  const getCardStyle = (id: AvatarId) => {
    switch (id) {
      case 'raj':
        return {
          gradient: 'from-blue-50/90 via-sky-50/70 to-indigo-50/80',
          border: 'border-blue-200/90 hover:border-blue-400',
          badge: 'bg-blue-100/90 text-blue-800 border-blue-200',
          btnBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
          hoverShadow: 'hover:shadow-blue-200/60',
          accentText: 'text-blue-700',
        };
      case 'aneet':
        return {
          gradient: 'from-orange-50/90 via-rose-50/70 to-amber-50/80',
          border: 'border-rose-200/90 hover:border-rose-400',
          badge: 'bg-rose-100/90 text-rose-800 border-rose-200',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20',
          hoverShadow: 'hover:shadow-rose-200/60',
          accentText: 'text-rose-700',
        };
      case 'mira':
        return {
          gradient: 'from-indigo-50/90 via-violet-50/70 to-purple-50/80',
          border: 'border-indigo-200/90 hover:border-indigo-400',
          badge: 'bg-indigo-100/90 text-indigo-800 border-indigo-200',
          btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20',
          hoverShadow: 'hover:shadow-indigo-200/60',
          accentText: 'text-indigo-700',
        };
      case 'ren':
        return {
          gradient: 'from-slate-50/90 via-sky-50/70 to-indigo-50/80',
          border: 'border-slate-300/90 hover:border-slate-500',
          badge: 'bg-slate-100/90 text-slate-800 border-slate-200',
          btnBg: 'bg-slate-700 hover:bg-slate-800 text-white shadow-slate-500/20',
          hoverShadow: 'hover:shadow-slate-200/60',
          accentText: 'text-slate-700',
        };
      default:
        return {
          gradient: 'from-teal-50/90 via-sky-50/70 to-indigo-50/80',
          border: 'border-teal-200/90 hover:border-teal-400',
          badge: 'bg-teal-100/90 text-teal-800 border-teal-200',
          btnBg: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/20',
          hoverShadow: 'hover:shadow-teal-200/60',
          accentText: 'text-teal-700',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-modal-title"
      >
        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-b from-teal-50/60 to-white">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold tracking-wide uppercase mb-1">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>{isHi ? 'साथी मित्र चुनें' : 'Choose Your Companion'}</span>
            {isAdmin && (
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                👑 Admin Mode
              </span>
            )}
          </div>

          <h2 id="avatar-modal-title" className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            {isHi ? 'आज आप किससे बात करना चाहते हैं?' : 'Who would you like to speak with today?'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            {isHi
              ? 'प्रत्येक साथी की अपनी शैली और आवाज़ है। आप जब चाहें साथी बदल सकते हैं।'
              : 'Each companion offers a unique listening style, photorealistic look, and supportive voice. Switch companions anytime.'}
          </p>
        </div>

        {/* 6 Avatar Cards Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {AVATAR_LIST.map((avatar) => {
            const isSelected = currentAvatarId === avatar.id;
            const style = getCardStyle(avatar.id);
            const adminConfig = adminConfigs?.[avatar.id];
            const isEnabled = adminConfig ? adminConfig.enabled : true;
            const cardDesc = adminConfig?.description || avatar.cardDescription;

            return (
              <div
                key={avatar.id}
                onClick={() => isEnabled && handleSelect(avatar.id)}
                className={`relative group rounded-3xl p-5 border bg-gradient-to-br ${style.gradient} ${style.border} ${style.hoverShadow} transition-all duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] ${
                  isSelected ? 'ring-2 ring-teal-500 shadow-md' : 'shadow-xs'
                } ${!isEnabled ? 'opacity-60 cursor-not-allowed hover:translate-y-0' : ''}`}
              >
                {/* Selected or Disabled Badge */}
                {isSelected && (
                  <div className="absolute top-4 right-4 bg-teal-600 text-white rounded-full p-1 shadow-sm flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
                {!isEnabled && (
                  <div className="absolute top-4 right-4 bg-slate-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    Unavailable
                  </div>
                )}

                <div>
                  {/* Portrait + Name & Age header */}
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="relative shrink-0">
                      {/* Avatar portrait with subtle idle animation */}
                      <div className="w-16 h-16 rounded-2xl bg-white/80 p-1 shadow-xs border border-white/60 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
                        <AvatarCharacter avatarId={avatar.id} size="sm" showRing={false} />
                      </div>
                      {/* Camera icon - ONLY visible to Admin */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPicModalAvatarId(avatar.id);
                          }}
                          title={isHi ? 'अवतार रूप बदलें (एडमिन केवल)' : 'Customize appearance (Admin only)'}
                          className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white text-indigo-700 shadow-xs border border-indigo-200 hover:bg-indigo-50 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Camera className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-teal-900 transition-colors">
                          {avatar.name}
                        </h3>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${style.badge}`}>
                          {avatar.age} {isHi ? 'वर्ष' : 'yrs'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-teal-300 border border-slate-700 shadow-2xs">
                          <Box className="w-2.5 h-2.5 text-teal-400" />
                          <span>3D</span>
                        </span>
                      </div>
                      <p className={`text-xs font-semibold ${style.accentText} mt-0.5 leading-snug`}>
                        {avatar.headline}
                      </p>
                    </div>
                  </div>

                  {/* Character Description */}
                  <p className="text-xs text-slate-700 leading-relaxed font-normal mb-4 bg-white/60 backdrop-blur-xs rounded-xl p-3 border border-white/60">
                    {cardDesc}
                  </p>
                </div>

                {/* Chat with [Name] in 3D -> Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!isEnabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isEnabled) handleSelect(avatar.id);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${style.btnBg} cursor-pointer group-hover:shadow-md`}
                  >
                    <Box className="w-3.5 h-3.5 text-teal-200" />
                    <span>{isHi ? `${avatar.name} के साथ 3D चैट शुरू करें` : `Enter 3D Chat with ${avatar.name}`}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
            <span>AI companions are supportive friends, not therapists or human doctors. Free & private.</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium text-xs rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              {isHi ? 'रद्द करें' : 'Maybe later'}
            </button>
          )}
        </div>
      </div>

      {/* Avatar Picture Customization Modal - ADMIN ONLY */}
      {picModalAvatarId !== null && isAdmin && (
        <AvatarPictureModal
          isOpen={picModalAvatarId !== null}
          onClose={() => setPicModalAvatarId(null)}
          initialAvatarId={picModalAvatarId}
          language={language}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};
