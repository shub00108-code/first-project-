import React from 'react';
import { Clock, ShieldCheck, Sparkles, LogIn, Lock, ArrowRight, Heart } from 'lucide-react';
import { Language } from '../types';

interface SessionLimitModalProps {
  isOpen: boolean;
  onSignIn: () => void;
  onExtendGuest: () => void;
  language: Language;
}

export const SessionLimitModal: React.FC<SessionLimitModalProps> = ({
  isOpen,
  onSignIn,
  onExtendGuest,
  language,
}) => {
  if (!isOpen) return null;

  const isHi = language === 'hi';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-center space-y-5 relative overflow-hidden">
        
        {/* Soft decorative gradient top bar */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-teal-500 via-indigo-500 to-emerald-500" />

        {/* Icon with soft ring */}
        <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 text-teal-600 mx-auto flex items-center justify-center shadow-inner">
          <Clock className="w-8 h-8 text-teal-600" />
        </div>

        {/* Heading & Subtext */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100/80 text-teal-800 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>{isHi ? '5 मिनट का निःशुल्क सत्र पूर्ण' : '5 Minutes of Free Care Completed'}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isHi ? 'आगे बातचीत जारी रखने के लिए साइन इन करें' : 'Sign In to Continue Your Journey'}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            {isHi
              ? 'आशा है आपके साथी के साथ यह समय सुखद रहा। आपकी बातचीत को सुरक्षित सहेजने और असीमित समय तक बात करने के लिए कृपया साइन इन करें।'
              : 'We hope your companion was comforting. To securely save your chat history, protect your reflections, and enjoy unlimited conversations, please sign in or create an account.'}
          </p>
        </div>

        {/* Value Points Pill */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-left space-y-1.5 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{isHi ? 'आपकी चैट और भावनाएं निजी व सुरक्षित रहेंगी' : 'End-to-end private chat storage'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{isHi ? 'असीमित बातचीत और सभी 4 अवतार उपलब्ध' : 'Unlimited conversations with all 4 companions'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{isHi ? '100% निःशुल्क और गोपनीय' : '100% Free, confidential & HIPAA-conscious'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onSignIn}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-md shadow-teal-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{isHi ? 'साइन इन करें / खाता बनाएं' : 'Sign In / Create Free Account'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            type="button"
            onClick={onExtendGuest}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {isHi ? 'अस्थायी रूप से 2 मिनट और जारी रखें' : 'Continue as Guest (+2 mins extension)'}
          </button>
        </div>

      </div>
    </div>
  );
};
