import React, { useState, useRef, useEffect, useMemo, Component } from 'react';
import {
  Send,
  Users,
  Trash2,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Square,
  Heart,
  Download,
  Stethoscope,
  X,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Lock,
  Camera,
  MessageSquareHeart,
  Settings,
  Sliders,
  Clock,
  Box
} from 'lucide-react';
import { AvatarId, AvatarMood, ChatMessage, Language, User, EmotionTag, AvatarVisualMode } from '../types';
import { AVATAR_FRIENDS, detectReplyMood, getAvatarVisualMode, setAvatarVisualMode } from '../utils/avatarFriends';
import { checkIsCrisis } from '../utils/crisisDetector';
import { CrisisAlertCard } from './CrisisAlertCard';
import { saveUserAvatarChatHistory } from '../services/chatHistoryService';
import { speechManager, speechRecognitionManager, VisemeShape } from '../utils/speechSynthesisService';
import { vachanaSTTService } from '../services/vachanaSttService';
import { Saathi2DAvatar, AvatarMouthShape } from './avatar2d/Saathi2DAvatar';
import { AvatarCharacter } from './AvatarCharacter';
import { Avatar3DStage, CameraAngle, LightingPreset } from './avatar3d/Avatar3DStage';
import { AvatarPictureModal } from './AvatarPictureModal';
import { SettingsModal } from './SettingsModal';
import { SessionLimitModal } from './SessionLimitModal';
import { recordAnonymousCrisisAlert } from '../services/avatarFirestoreService';
import { geminiAudioQueue } from '../utils/geminiAudioQueue';
import { detectUserFeeling } from '../utils/geminiTtsService';
import { ADMIN_EMAIL } from '../services/firebaseAuth';

// Fallback Error Boundary to ensure a static portrait is shown if anything fails
class AvatarErrorBoundary extends Component<{ characterId: AvatarId; children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-36 h-36 rounded-full bg-slate-200 flex items-center justify-center text-4xl shadow-inner border border-slate-300">
          <span>{this.props.characterId === 'raj' ? '👨‍💼' : this.props.characterId === 'aneet' ? '👩‍🏫' : this.props.characterId === 'mira' ? '👩' : '👨'}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

interface AvatarChatViewProps {
  avatarId: AvatarId;
  currentUser?: User | null;
  language?: Language;
  avatarFeatureEnabled?: boolean;
  onSwitchFriend: () => void;
  onNavigateToHelp?: () => void;
  onNavigateToPsychiatrist?: () => void;
  onOpenAuth?: () => void;
}

export const AvatarChatView: React.FC<AvatarChatViewProps> = ({
  avatarId,
  currentUser,
  language = 'en',
  avatarFeatureEnabled = true,
  onSwitchFriend,
  onNavigateToHelp,
  onNavigateToPsychiatrist,
  onOpenAuth,
}) => {
  const avatar = AVATAR_FRIENDS[avatarId] || AVATAR_FRIENDS.raj;
  const userId = currentUser?.id || 'guest-user';
  const isHi = language === 'hi';
  const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() || currentUser?.role === 'admin';

  const storageKey = `saathi_avatar_chat_${avatar.id}_${userId}`;

  // Visual Mode (3D Interactive by default, or Studio Portrait)
  const [visualMode, setVisualMode] = useState<AvatarVisualMode>(() => getAvatarVisualMode());
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('front');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('studio');

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 5-Minute Free Session Usage Timer for Unauthenticated Users
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionAllowedSeconds, setSessionAllowedSeconds] = useState(300); // 300s = 5 minutes
  const [sessionLimitReached, setSessionLimitReached] = useState(false);

  // Initial messages state loaded per avatar
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: `greeting-${avatar.id}`,
        role: 'model',
        text: avatar.defaultGreeting,
        timestamp: Date.now(),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isWaitingResponse, setIsWaitingResponse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMood, setCurrentMood] = useState<AvatarMood>('smiling');
  const [currentEmotion, setCurrentEmotion] = useState<EmotionTag>('calm');
  const [hasCrisisAlert, setHasCrisisAlert] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dismissedPsychiatristSuggestion, setDismissedPsychiatristSuggestion] = useState(false);

  // 2D/3D Avatar & Speech State
  const [showAvatarHero, setShowAvatarHero] = useState(true);
  const [isPicModalOpen, setIsPicModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [activeMouthShape, setActiveMouthShape] = useState<AvatarMouthShape>('closed');
  const [currentViseme, setCurrentViseme] = useState<VisemeShape>('closed');

  // Mic recognition state (Vachana AI STT)
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [isTranscribingSTT, setIsTranscribingSTT] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Rate limit 429 countdown
  const [rateLimitTimer, setRateLimitTimer] = useState<number | null>(null);
  const [lastSentText, setLastSentText] = useState<string | null>(null);

  // 5-Minute Timer Effect: asks for sign in after 5 minutes of active session
  useEffect(() => {
    if (currentUser) return; // Signed in users have unlimited usage

    const timer = setInterval(() => {
      setSessionSeconds((prev) => {
        const next = prev + 1;
        if (next >= sessionAllowedSeconds && !sessionLimitReached) {
          setSessionLimitReached(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser, sessionAllowedSeconds, sessionLimitReached]);

  const handleExtendGuest = () => {
    setSessionAllowedSeconds((prev) => prev + 120); // +2 minutes extension
    setSessionLimitReached(false);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Attentive listening state while typing or recording
  const isListening = input.trim().length > 0 || isRecordingMic;

  // Rate limit countdown effect
  useEffect(() => {
    if (rateLimitTimer === null) return;
    if (rateLimitTimer <= 0) {
      setRateLimitTimer(null);
      if (lastSentText) {
        handleSendMessage(lastSentText);
        setLastSentText(null);
      }
      return;
    }

    const timer = setTimeout(() => {
      setRateLimitTimer((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [rateLimitTimer, lastSentText]);

  // Clean emotion tag from stream with support for all 15 expanded emotions
  const cleanDisplayContent = (raw: string): { text: string; emotion?: EmotionTag } => {
    const match = raw.match(/\[EMOTION:([a-z\-]+)\]/i);
    let emotion: EmotionTag | undefined;
    if (match && match[1]) {
      const e = match[1].toLowerCase() as EmotionTag;
      const validEmotions: EmotionTag[] = [
        'caring',
        'calm',
        'comforting',
        'encouraging',
        'proud',
        'happy',
        'excited',
        'playful',
        'curious',
        'thoughtful',
        'worried',
        'sad-empathetic',
        'serious',
        'surprised',
        'gentle-laughing',
      ];
      if (validEmotions.includes(e)) {
        emotion = e;
      }
    }
    const text = raw.replace(/\[EMOTION:[a-z\-]+\]/gi, '').trim();
    return { text, emotion };
  };

  // Speak bot reply using Gemini Flash TTS queue with AnalyserNode lip sync and browser speech fallback
  const speakReply = (rawTextToSpeak: string, userPrompt?: string) => {
    if (isMuted) return;

    const userFeeling = detectUserFeeling(userPrompt || '');

    geminiAudioQueue.playReply(rawTextToSpeak, {
      characterId: avatar.id,
      userFeeling,
      isCrisis: currentEmotion === 'serious' || hasCrisisAlert,
      language: language,
      onStart: () => {
        setIsSpeaking(true);
      },
      onSentenceStart: (sentence) => {
        setCurrentEmotion(sentence.emotion);
        setCurrentMood(detectReplyMood(sentence.text));
      },
      onThinking: (thinking) => {
        setIsThinking(thinking);
      },
      onMouthShape: (shape) => {
        setActiveMouthShape(shape);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setIsThinking(false);
        setActiveMouthShape('closed');
      },
      onError: () => {
        setIsSpeaking(false);
        setIsThinking(false);
        setActiveMouthShape('closed');
      },
    });
  };

  // Check if clinical distress keywords are present to suggest Psychiatrists
  const shouldSuggestPsychiatrist = useMemo(() => {
    if (dismissedPsychiatristSuggestion) return false;
    const textToCheck = messages.map((m) => m.text.toLowerCase()).join(' ');
    const struggleKeywords = [
      'depressed',
      'depression',
      'psychiatrist',
      'doctor',
      'cant take this',
      "can't take this",
      'hopeless',
      'unbearable',
      'therapy',
      'therapist',
      'too heavy',
      'breakdown',
      'panic',
      'medication',
      'overwhelmed',
      'help me',
      'डॉक्टर',
      'परेशान',
      'डिप्रेशन'
    ];
    return struggleKeywords.some((kw) => textToCheck.includes(kw));
  }, [messages, dismissedPsychiatristSuggestion]);

  // When avatarId or userId changes, load that avatar's separate history
  useEffect(() => {
    geminiAudioQueue.stop();
    speechManager.stop();
    setIsSpeaking(false);
    setIsThinking(false);
    setActiveMouthShape('closed');

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          const lastModelMsg = [...parsed].reverse().find((m) => m.role === 'model');
          if (lastModelMsg) {
            setCurrentMood(detectReplyMood(lastModelMsg.text));
          } else {
            setCurrentMood('smiling');
          }
          return;
        }
      }
    } catch {}

    setMessages([
      {
        id: `greeting-${avatar.id}`,
        role: 'model',
        text: avatar.defaultGreeting,
        timestamp: Date.now(),
      },
    ]);
    setCurrentEmotion('calm');
    setCurrentMood('smiling');
  }, [avatarId, userId]);

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveUserAvatarChatHistory(userId, avatar.id, messages);
    }
  }, [messages, userId, avatar.id]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, isWaitingResponse]);

  // Real-time client-side crisis safety detection on user typing
  useEffect(() => {
    if (checkIsCrisis(input)) {
      setHasCrisisAlert(true);
      setCurrentEmotion('serious');
      // Record ONLY an anonymous aggregated counter (NO message text, NO usernames, NO user IDs stored)
      recordAnonymousCrisisAlert().catch(() => {});
    }
  }, [input]);

  // Handle Send Message & Stream
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend ?? input).trim();
    if (!messageText || isStreaming || isWaitingResponse) return;

    speechManager.stop();
    setIsSpeaking(false);

    if (checkIsCrisis(messageText)) {
      setHasCrisisAlert(true);
      setCurrentEmotion('serious');
      recordAnonymousCrisisAlert().catch(() => {});
    }

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: messageText,
      timestamp: Date.now(),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput('');
    setIsWaitingResponse(true);
    setCurrentMood('caring');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const botMessageId = `bot-${Date.now()}`;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const payloadMessages = updatedHistory.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await fetch('/api/avatar-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarId: avatar.id,
          messages: payloadMessages,
        }),
        signal: controller.signal,
      });

      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        setIsWaitingResponse(false);
        setLastSentText(messageText);
        setRateLimitTimer(errorData.retryAfterSeconds || 5);
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      setIsWaitingResponse(false);
      setIsStreaming(true);

      const botMessage: ChatMessage = {
        id: botMessageId,
        role: 'model',
        text: '',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMessage]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedRaw = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              accumulatedRaw += parsed.text;
              const { text: cleanText, emotion: streamEmotion } = cleanDisplayContent(accumulatedRaw);

              if (streamEmotion) {
                setCurrentEmotion(streamEmotion);
              }

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMessageId ? { ...m, text: cleanText } : m
                )
              );
              setCurrentMood(detectReplyMood(cleanText));
            }
          } catch {}
        }
      }

      const { text: finalCleanText, emotion: finalEmotion } = cleanDisplayContent(accumulatedRaw);
      if (finalEmotion) {
        setCurrentEmotion(finalEmotion);
      }
      if (accumulatedRaw) {
        speakReply(accumulatedRaw, messageText);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('Avatar stream aborted');
      } else {
        console.error('Avatar chat error:', err);
        const errMsg = isHi
          ? 'मैं यहीं हूँ आपके साथ! कोई तकनीकी समस्या हुई, कृपया फिर से प्रयास करें।'
          : "I'm right here with you! There was a small hiccup, please try sharing again.";
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'model',
            text: errMsg,
            timestamp: Date.now(),
            isError: true,
          },
        ]);
        speakReply(errMsg, messageText);
      }
    } finally {
      setIsWaitingResponse(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  };

  const handleStopStreaming = () => {
    geminiAudioQueue.stop();
    setIsSpeaking(false);
    setIsThinking(false);
    setActiveMouthShape('closed');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setIsWaitingResponse(false);
      abortControllerRef.current = null;
    }
  };

  const handleToggleMic = async () => {
    setMicError(null);
    if (isRecordingMic) {
      setIsRecordingMic(false);
      if (vachanaSTTService.isRecording()) {
        setIsTranscribingSTT(true);
        try {
          const result = await vachanaSTTService.stopAndTranscribe(language);
          if (result.success && result.transcript) {
            setInput((prev) => (prev ? `${prev} ${result.transcript.trim()}` : result.transcript.trim()));
          } else if (result.error) {
            console.warn('Vachana AI STT warning:', result.error);
          }
        } catch (err: any) {
          console.warn('Vachana AI STT stop error:', err);
          setMicError(isHi ? 'वॉइस इनपुट ट्रांसक्राइब करने में त्रुटि' : 'Could not transcribe voice.');
        } finally {
          setIsTranscribingSTT(false);
        }
      } else {
        speechRecognitionManager.stopListening();
      }
    } else {
      if (vachanaSTTService.isSupported()) {
        try {
          await vachanaSTTService.startRecording();
          setIsRecordingMic(true);
        } catch (err: any) {
          console.warn('MediaRecorder error, falling back to Web Speech API:', err);
          if (!speechRecognitionManager.isSupported()) {
            setMicError(isHi ? 'वॉइस इनपुट असमर्थित है' : 'Microphone unsupported in this browser.');
            return;
          }
          setIsRecordingMic(true);
          speechRecognitionManager.startListening(
            language,
            (transcript, isFinal) => {
              setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
              if (isFinal) setIsRecordingMic(false);
            },
            (err) => {
              setMicError(isHi ? 'माइक्रोफ़ोन त्रुटि' : 'Could not hear voice input.');
              setIsRecordingMic(false);
            },
            () => setIsRecordingMic(false)
          );
        }
      } else if (speechRecognitionManager.isSupported()) {
        setIsRecordingMic(true);
        speechRecognitionManager.startListening(
          language,
          (transcript, isFinal) => {
            setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
            if (isFinal) setIsRecordingMic(false);
          },
          (err) => {
            setMicError(isHi ? 'माइक्रोफ़ोन त्रुटि' : 'Could not hear voice input.');
            setIsRecordingMic(false);
          },
          () => setIsRecordingMic(false)
        );
      } else {
        setMicError(isHi ? 'वॉइस इनपुट असमर्थित है' : 'Microphone unsupported in this browser.');
      }
    }
  };

  const handleClearChat = () => {
    const confirmReset = window.confirm(
      isHi
        ? `क्या आप ${avatar.name} के साथ अपनी बातचीत को रीसेट करना चाहते हैं?`
        : `Start fresh with ${avatar.name}? This will clear your chat history on this device.`
    );
    if (!confirmReset) return;

    speechManager.stop();
    setIsSpeaking(false);
    localStorage.removeItem(storageKey);
    setMessages([
      {
        id: `greeting-${avatar.id}`,
        role: 'model',
        text: avatar.defaultGreeting,
        timestamp: Date.now(),
      },
    ]);
    saveUserAvatarChatHistory(userId, avatar.id, []);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Top header background gradient matching character
  const headerGradient = useMemo(() => {
    switch (avatar.id) {
      case 'raj':
        return 'from-blue-600/10 via-sky-50/60 to-indigo-50/70';
      case 'aneet':
        return 'from-orange-500/10 via-rose-50/60 to-amber-50/70';
      case 'mira':
        return 'from-indigo-600/10 via-violet-50/60 to-purple-50/70';
      case 'ren':
        return 'from-slate-600/10 via-slate-50/60 to-indigo-50/70';
      default:
        return 'from-teal-500/10 via-teal-50/60 to-emerald-50/70';
    }
  }, [avatar.id]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-115px)] max-w-7xl w-full mx-auto px-2 sm:px-4 py-2 sm:py-3 font-sans overflow-hidden">
      
      {/* Top Companion Control Bar */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-xs mb-2 sm:mb-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={() => {
              if (isAdmin) setIsPicModalOpen(true);
            }}
            title={isAdmin ? (isHi ? 'अवतार का रूप बदलें (एडमिन)' : 'Customize avatar appearance (Admin)') : undefined}
            className={`shrink-0 ${isAdmin ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''}`}
          >
            <AvatarCharacter avatarId={avatar.id} size="sm" emotion={currentEmotion} isTalking={isSpeaking} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{avatar.name}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${avatar.badgeColor}`}>
                {avatar.age} yrs
              </span>
              
              {/* Session Timer / Status Badge */}
              {!currentUser ? (
                <div
                  title="5 Minutes of Free Care for Guests"
                  className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    5m Free: {Math.floor(Math.max(0, sessionAllowedSeconds - sessionSeconds) / 60)}:
                    {String(Math.max(0, sessionAllowedSeconds - sessionSeconds) % 60).padStart(2, '0')}
                  </span>
                </div>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Unlimited Member
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">{avatar.headline}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Settings Button (Mic, Video, History permissions) */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings (Permissions & History)"
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Change Avatar Picture Button - ADMIN ONLY */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsPicModalOpen(true)}
              title={isHi ? 'अवतार का रूप बदलें (एडमिन)' : 'Customize avatar appearance (Admin only)'}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-indigo-200 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">{isHi ? 'लुक बदलें (Admin)' : 'Edit Look (Admin)'}</span>
            </button>
          )}

          {/* Voice Mute Toggle */}
          <button
            type="button"
            onClick={() => {
              if (!isMuted) {
                geminiAudioQueue.stop();
                speechManager.stop();
              }
              setIsMuted(!isMuted);
            }}
            title={isMuted ? 'Unmute voice' : 'Mute voice'}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
              isMuted
                ? 'bg-slate-100 text-slate-400 border-slate-200'
                : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-teal-600" />}
            <span className="hidden md:inline">{isMuted ? 'Muted' : 'Voice On'}</span>
          </button>

          {/* Choose Avatar Button */}
          <button
            type="button"
            onClick={onSwitchFriend}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Choose Avatar</span>
          </button>

          {/* Clear Conversation */}
          <button
            type="button"
            onClick={handleClearChat}
            title="Reset conversation"
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Split Container: Left Half (Avatar Talking) & Right Half (Messages) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 min-h-0 overflow-hidden">
        
        {/* ================================================================= */}
        {/* LEFT HALF: THE TALKING AVATAR STAGE (3D & Interactive)           */}
        {/* ================================================================= */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden relative">
          
          {/* Avatar Stage Top Header */}
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-500 animate-ping' : isThinking ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="font-bold text-slate-700">Talking Avatar Stage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">
                {isSpeaking ? '🔊 Audio Speaking' : isRecordingMic ? '🎤 Listening' : '🟢 3D Real-time'}
              </span>
            </div>
          </div>

          {/* Avatar Display Body */}
          <div className={`flex-1 bg-gradient-to-b ${headerGradient} p-3 sm:p-5 flex flex-col items-center justify-between text-center relative overflow-y-auto`}>
            
            {/* Visual Mode Toggle Pills: 3D vs Portrait */}
            <div className="inline-flex items-center gap-1 p-1 bg-white/90 backdrop-blur-xs rounded-2xl border border-slate-200 shadow-2xs shrink-0 z-10">
              <button
                type="button"
                onClick={() => {
                  setVisualMode('3d');
                  setAvatarVisualMode('3d');
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  visualMode === '3d'
                    ? 'bg-slate-900 text-teal-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D Talking Avatar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisualMode('portrait');
                  setAvatarVisualMode('portrait');
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  visualMode === 'portrait'
                    ? 'bg-slate-900 text-teal-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Studio Portrait</span>
              </button>
            </div>

            {/* The Avatar Hero: 3D Stage with moving lips or 2D Portrait */}
            <div className="w-full flex-1 min-h-[280px] sm:min-h-[340px] flex items-center justify-center relative my-1">
              <AvatarErrorBoundary characterId={avatar.id}>
                {visualMode === '3d' ? (
                  <Avatar3DStage
                    avatarId={avatar.id}
                    isSpeaking={isSpeaking}
                    isListening={isRecordingMic}
                    emotion={currentEmotion}
                    className="w-full h-full"
                    cameraAngle={cameraAngle}
                    lightingPreset={lightingPreset}
                    onAvatarClick={() => {
                      if (isAdmin) setIsPicModalOpen(true);
                    }}
                  />
                ) : (
                  <div
                    className={`relative group my-2 ${isAdmin ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (isAdmin) setIsPicModalOpen(true);
                    }}
                    title={isAdmin ? (isHi ? 'अवतार का रूप बदलें (एडमिन)' : 'Customize avatar appearance (Admin only)') : undefined}
                  >
                    {isSpeaking && (
                      <div className="absolute inset-0 -m-3 rounded-full border-2 border-emerald-400 animate-ping pointer-events-none opacity-40" />
                    )}

                    <div className="transition-transform duration-300 transform group-hover:scale-102">
                      <AvatarCharacter
                        avatarId={avatar.id}
                        size="hero"
                        emotion={currentEmotion}
                        isTalking={isSpeaking}
                        isListening={isRecordingMic}
                        showRing={true}
                        visualMode={visualMode}
                      />
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        title={isHi ? 'अवतार का रूप बदलें (एडमिन)' : 'Customize avatar appearance (Admin only)'}
                        className="absolute -bottom-1 -right-1 p-2 rounded-full bg-white/95 hover:bg-white text-indigo-700 shadow-md border border-indigo-200 transition-all hover:scale-110 flex items-center justify-center cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </AvatarErrorBoundary>
            </div>

            {/* 3D Viewport Controls Dock (When in 3D Mode) */}
            {visualMode === '3d' && (
              <div className="w-full max-w-sm mx-auto mb-2 p-2 rounded-2xl bg-white/85 backdrop-blur-xs border border-white/90 shadow-2xs space-y-1.5 shrink-0">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
                  <span>3D Camera</span>
                  <div className="flex items-center gap-1">
                    {(['front', 'threeQuarter', 'cinema'] as CameraAngle[]).map((ang) => (
                      <button
                        key={ang}
                        type="button"
                        onClick={() => setCameraAngle(ang)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          cameraAngle === ang
                            ? 'bg-slate-900 text-teal-300 shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {ang === 'front' ? 'Front' : ang === 'threeQuarter' ? '3/4 View' : 'Cinema'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
                  <span>3D Light</span>
                  <div className="flex items-center gap-1">
                    {(['studio', 'sunset', 'cyber'] as LightingPreset[]).map((light) => (
                      <button
                        key={light}
                        type="button"
                        onClick={() => setLightingPreset(light)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                          lightingPreset === light
                            ? 'bg-slate-900 text-teal-300 shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {light}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic text-center pt-0.5">
                  🖱️ Drag 3D Avatar to rotate • Double-click to center
                </p>
              </div>
            )}

            {/* Character Name & Fictional Person Label */}
            <div className="space-y-1 shrink-0">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {avatar.name}
                </h1>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${avatar.badgeColor}`}>
                  Age {avatar.age}
                </span>
              </div>

              {/* MANDATORY DISCLAIMER LABEL */}
              <p className="text-xs font-medium text-slate-600">
                <span className="font-semibold text-slate-800">{avatar.name}</span> is an AI companion, not a real person
              </p>
            </div>

            {/* Emotion & Voice Status Banner */}
            <div className="mt-3 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-xs border border-white/80 shadow-2xs flex items-center justify-center gap-2 text-xs font-semibold text-slate-700">
              <span className={`w-2 h-2 rounded-full ${
                isSpeaking
                  ? 'bg-emerald-500 animate-pulse'
                  : isThinking
                  ? 'bg-amber-500 animate-bounce'
                  : isRecordingMic
                  ? 'bg-rose-500 animate-ping'
                  : 'bg-teal-500'
              }`} />
              <span>
                {isSpeaking
                  ? 'Speaking warmly...'
                  : isThinking || isWaitingResponse
                  ? 'Thinking gently...'
                  : isRecordingMic
                  ? 'Listening carefully...'
                  : `Feeling ${currentEmotion}`}
              </span>
            </div>

            {/* Quick Expression Reaction Pills */}
            <div className="mt-4 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">React:</span>
              {[
                { id: 'smiling', label: 'Smile', emoji: '😊', emotion: 'happy' as EmotionTag },
                { id: 'caring', label: 'Caring', emoji: '💖', emotion: 'caring' as EmotionTag },
                { id: 'laughing', label: 'Laugh', emoji: '😄', emotion: 'gentle-laughing' as EmotionTag },
                { id: 'concerned', label: 'Concern', emoji: '🥺', emotion: 'comforting' as EmotionTag },
              ].map((expr) => (
                <button
                  key={expr.id}
                  type="button"
                  onClick={() => {
                    setCurrentMood(expr.id as AvatarMood);
                    setCurrentEmotion(expr.emotion);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    currentMood === expr.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200/70 hover:shadow-2xs'
                  }`}
                >
                  <span>{expr.emoji}</span>
                  <span>{expr.label}</span>
                </button>
              ))}
            </div>

            {/* Character Persona Quote Card */}
            <div className="mt-4 max-w-sm w-full bg-white/70 backdrop-blur-xs rounded-2xl p-3 border border-white/80 text-left shadow-2xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Companion Personality</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                {avatar.cardDescription}
              </p>
            </div>

          </div>

          {/* Left Half Footer */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span className="truncate">Active Companion: <strong className="text-slate-800">{avatar.name}</strong></span>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setIsPicModalOpen(true)}
                className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Customize Look (Admin) →
              </button>
            ) : (
              <button
                type="button"
                onClick={onSwitchFriend}
                className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Switch Avatar →
              </button>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT HALF: MESSAGES STREAM & CHAT INPUT                         */}
        {/* ================================================================= */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden relative">
          
          {/* Right Half Header */}
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquareHeart className="w-4 h-4 text-teal-600" />
              <span className="font-bold text-slate-800">Messages with {avatar.name}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Private & Encrypted</span>
            </div>
          </div>

          {/* Banners inside right pane */}
          {rateLimitTimer !== null && (
            <div className="p-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2 shadow-xs shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium">
                  Companion is resting for a moment, please try again in {rateLimitTimer}s...
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (lastSentText) {
                    setRateLimitTimer(null);
                    handleSendMessage(lastSentText);
                  }
                }}
                className="px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {hasCrisisAlert && onNavigateToHelp && (
            <div className="p-2.5 bg-rose-50/90 border-b border-rose-200 text-xs shrink-0">
              <CrisisAlertCard language={language} onNavigateToHelp={onNavigateToHelp} />
            </div>
          )}

          {shouldSuggestPsychiatrist && onNavigateToPsychiatrist && !dismissedPsychiatristSuggestion && (
            <div className="p-2.5 mx-3 my-2 rounded-2xl bg-teal-50/90 border border-teal-300 text-teal-950 flex items-center justify-between gap-2 text-xs shadow-xs shrink-0">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  {isHi
                    ? 'क्या आप किसी विशेषज्ञ मनोचिकित्सक (Psychiatrist) से परामर्श लेना चाहते हैं?'
                    : 'Would you like to explore verified psychiatrists near you?'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={onNavigateToPsychiatrist}
                  className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs cursor-pointer"
                >
                  View Directory
                </button>
                <button
                  onClick={() => setDismissedPsychiatristSuggestion(true)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isLastBot = !isUser && idx === messages.length - 1;
              const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isUser && (
                    <div
                      className="w-7 h-7 rounded-full overflow-hidden shrink-0 mb-1"
                    >
                      <AvatarCharacter avatarId={avatar.id} size="xs" emotion={currentEmotion} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-3xl p-3.5 text-xs sm:text-sm shadow-xs transition-all leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-xs'
                        : msg.isError
                        ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-xs'
                        : 'bg-slate-50 text-slate-800 border border-slate-200/90 rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words font-normal">
                      {(() => {
                        const content = msg.text;
                        const bracketRegex = /\((.*?)\)/g;
                        const parts = [];
                        let lastIndex = 0;
                        let match;
                        while ((match = bracketRegex.exec(content)) !== null) {
                          if (match.index > lastIndex) {
                            parts.push({ type: 'text', content: content.substring(lastIndex, match.index) });
                          }
                          parts.push({ type: 'whisper', content: match[1] });
                          lastIndex = match.index + match[0].length;
                        }
                        if (lastIndex < content.length) {
                          parts.push({ type: 'text', content: content.substring(lastIndex) });
                        }
                        if (parts.length === 0) return msg.text;
                        return parts.map((p, pIdx) =>
                          p.type === 'text' ? (
                            <span key={pIdx}>{p.content}</span>
                          ) : (
                            <span
                              key={pIdx}
                              className="inline-block mx-1 px-2 py-0.5 rounded-lg bg-pink-100/80 border border-pink-200 text-pink-900 text-xs italic font-medium"
                            >
                              💭 ({p.content})
                            </span>
                          )
                        );
                      })()}
                      {isStreaming && isLastBot && (
                        <span className="inline-block w-1.5 h-3.5 bg-teal-500 ml-1 animate-pulse rounded-full align-middle"></span>
                      )}
                    </div>

                    <div
                      className={`flex items-center justify-end gap-2 mt-1.5 text-[10px] ${
                        isUser ? 'text-teal-100/80' : 'text-slate-400'
                      }`}
                    >
                      <span>{formattedTime}</span>
                      {!isUser && msg.text && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              speechManager.stop();
                              geminiAudioQueue.stop();
                              speakReply(msg.text);
                            }}
                            title="Replay voice audio"
                            className="hover:text-teal-700 p-0.5 transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.text)}
                            className="hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
                          >
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isWaitingResponse && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mb-1">
                  <AvatarCharacter avatarId={avatar.id} size="xs" emotion="caring" />
                </div>
                <div className="bg-slate-50 border border-slate-200/90 rounded-3xl rounded-bl-xs p-3.5 shadow-xs flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce"></span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium italic">
                    {avatar.name} is thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sticky Input Footer on the Right Half */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shadow-md shrink-0">
            {isStreaming && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={handleStopStreaming}
                  className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-slate-700" />
                  <span>Stop</span>
                </button>
              </div>
            )}

            {micError && <p className="text-[11px] text-rose-600 text-center pb-1">{micError}</p>}

            {/* Vachana AI Voice Recognition status indicator */}
            {isRecordingMic && (
              <div className="flex items-center justify-center gap-2 pb-1.5 text-xs text-rose-600 font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                <span>{isHi ? 'सुन रहे हैं... (वाचाना एआई Indic STT)' : 'Listening... (Vachana AI Indic STT)'}</span>
                <span className="text-[10px] text-slate-500 font-normal">({isHi ? 'पूरा होने पर माइक दबाएं' : 'Tap mic when finished'})</span>
              </div>
            )}

            {isTranscribingSTT && (
              <div className="flex items-center justify-center gap-2 pb-1.5 text-xs text-teal-700 font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                <span>{isHi ? 'वाचाना एआई ट्रांसक्राइब कर रहा है...' : 'Transcribing voice with Vachana AI...'}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-end gap-2 bg-slate-50 border border-slate-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 rounded-2xl p-1.5 transition-all shadow-inner"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${avatar.name}... (Press Enter to send)`}
                disabled={isStreaming || isWaitingResponse}
                className="flex-1 max-h-32 px-3 py-2 bg-transparent text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed disabled:opacity-50"
              />

              <button
                type="button"
                onClick={handleToggleMic}
                title={isRecordingMic ? 'Stop mic' : 'Speak (Microphone)'}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isRecordingMic
                    ? 'bg-rose-500 text-white animate-pulse shadow-md'
                    : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {isRecordingMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="submit"
                disabled={!input.trim() || isStreaming || isWaitingResponse}
                aria-label="Send message"
                className="p-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-95 text-white transition-all shadow-sm shadow-teal-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-500 text-center">
              <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>
                {isHi
                  ? 'आपकी बातचीत निजी है। साथी पर कोई भी प्रशासक आपकी चैट नहीं पढ़ सकता।'
                  : 'Your conversations are private. Nobody at Buddy Care, including administrators, can read your chat history.'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Avatar Picture Customization Modal - ADMIN ONLY */}
      {isPicModalOpen && isAdmin && (
        <AvatarPictureModal
          isOpen={isPicModalOpen}
          onClose={() => setIsPicModalOpen(false)}
          initialAvatarId={avatar.id}
          language={language}
          isAdmin={isAdmin}
        />
      )}

      {/* Settings Modal (Microphone, Camera permissions & Chat History management) */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          language={language}
          currentUserId={userId}
          activeAvatarId={avatar.id}
          onClearCurrentAvatarHistory={handleClearChat}
          onVisualModeChange={(mode) => setVisualMode(mode)}
        />
      )}

      {/* 5-Minute Session Limit Checkpoint Modal for Guests */}
      {sessionLimitReached && !currentUser && (
        <SessionLimitModal
          isOpen={sessionLimitReached && !currentUser}
          onSignIn={() => {
            setSessionLimitReached(false);
            if (onOpenAuth) onOpenAuth();
          }}
          onExtendGuest={handleExtendGuest}
          language={language}
        />
      )}
    </div>
  );
};
