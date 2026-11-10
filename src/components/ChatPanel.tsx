import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  MessageCircle,
  Sparkles,
  Volume2,
  VolumeX,
  ShieldAlert,
} from 'lucide-react';
import { HumanCharacter, ChatMessage, ExpressionType } from '../types/avatarHuman';

interface ChatPanelProps {
  activeCharacter: HumanCharacter;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isReplying: boolean;
  onAvatarMoodChange?: (newExpression: ExpressionType) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  activeCharacter,
  messages,
  onSendMessage,
  isReplying,
}) => {
  const [inputText, setInputText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isReplying]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isReplying) return;
    const text = inputText.trim();
    setInputText('');
    onSendMessage(text);
  };

  // Helper to parse bracketed thoughts like (...that was actually kind of nice)
  const formatReplyContent = (content: string) => {
    const bracketRegex = /\((.*?)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = bracketRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index),
        });
      }
      parts.push({
        type: 'whisper',
        content: match[1],
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex),
      });
    }

    if (parts.length === 0) {
      return <span>{content}</span>;
    }

    return (
      <div className="space-y-1.5">
        <div>
          {parts.map((p, idx) =>
            p.type === 'text' ? (
              <span key={idx}>{p.content}</span>
            ) : (
              <span
                key={idx}
                className="inline-block mx-1 px-2 py-0.5 rounded-lg bg-pink-950/60 border border-pink-700/50 text-pink-200 text-xs italic font-medium shadow-sm"
              >
                💭 ({p.content})
              </span>
            )
          )}
        </div>
      </div>
    );
  };

  // Quick prompt chips tailored to current character
  const quickPrompts =
    activeCharacter.id === 'mira'
      ? [
          'You look really pretty today!',
          'Are you doing homework right now?',
          'Ren said you were looking for me...',
          'Want to grab a drink after class?',
        ]
      : activeCharacter.id === 'ren'
      ? [
          'Why are you always half-asleep?',
          'Did you finish the assignment due tomorrow?',
          'What were you teasing Mira about?',
          'Got any chill music recommendations?',
        ]
      : [
          'Hello! Tell me about yourself.',
          'What kind of hobbies do you enjoy?',
          'What are you working on today?',
        ];

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl flex flex-col h-[580px]">
      {/* Top Header of Chat */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={activeCharacter.currentImageUrl}
              alt={activeCharacter.name}
              className="w-10 h-10 rounded-2xl object-cover object-top border border-slate-700 shadow-md"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Chat with {activeCharacter.name}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                18+ In-Character
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Expression updates automatically with feelings
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title={soundEnabled ? 'Speech audio enabled' : 'Speech audio muted'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="my-2.5 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Fictional character · Friendly & age-appropriate dialogue only</span>
        </span>
        <span className="text-[10px] text-slate-500 hidden sm:inline">1-3 sentence replies</span>
      </div>

      {/* Message History Container */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 my-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400 mb-3 shadow-lg">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">
              Start a conversation with {activeCharacter.name}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Ask about their day, say something nice, or tease them. Their facial expression will dynamically change to match the mood!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <img
                    src={activeCharacter.currentImageUrl}
                    alt={activeCharacter.name}
                    className="w-7 h-7 rounded-xl object-cover object-top shrink-0 mt-1 border border-slate-700"
                  />
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-md ${
                    isUser
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-xs'
                      : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-tl-xs'
                  }`}
                >
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-[11px] text-indigo-300">
                        {activeCharacter.name}
                      </span>
                      {msg.expression && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-700/60">
                          {msg.expression}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-xs">{formatReplyContent(msg.text)}</div>
                </div>
              </div>
            );
          })
        )}

        {/* Replying indicator */}
        {isReplying && (
          <div className="flex gap-2.5 justify-start items-center">
            <img
              src={activeCharacter.currentImageUrl}
              alt={activeCharacter.name}
              className="w-7 h-7 rounded-xl object-cover object-top shrink-0 border border-slate-700 animate-pulse"
            />
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl rounded-tl-xs px-4 py-2.5 text-xs text-slate-300 flex items-center gap-2 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
              <span
                className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: '0.3s' }}
              />
              <span className="text-[11px] text-slate-400 ml-1">
                {activeCharacter.name} is thinking...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="pt-2 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSendMessage(prompt)}
              disabled={isReplying}
              className="px-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-[11px] text-slate-300 hover:text-white transition-all whitespace-nowrap disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSubmit} className="pt-2 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Talk to ${activeCharacter.name}...`}
          disabled={isReplying}
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all shadow-inner disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isReplying}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
