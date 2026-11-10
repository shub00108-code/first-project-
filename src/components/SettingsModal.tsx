import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  History,
  Shield,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Lock,
  Box,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { AvatarId, Language, AvatarVisualMode } from '../types';
import { AVATAR_FRIENDS, getAvatarVisualMode, setAvatarVisualMode } from '../utils/avatarFriends';
import { fetchAllUserChats, clearAllUserChats, clearAvatarChat } from '../services/chatHistoryService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currentUserId?: string;
  activeAvatarId: AvatarId;
  onClearCurrentAvatarHistory?: () => void;
  onVisualModeChange?: (mode: AvatarVisualMode) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  currentUserId = 'guest',
  activeAvatarId,
  onClearCurrentAvatarHistory,
  onVisualModeChange,
}) => {
  const [activeTab, setActiveTab] = useState<'permissions' | 'history' | 'appearance'>('permissions');

  // Mic Permission & Live Test State
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  // Video / Camera Permission & Live Preview State
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  // History counts & export state
  const [historyStats, setHistoryStats] = useState<Record<string, number>>({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySuccessMsg, setHistorySuccessMsg] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Appearance Visual Mode
  const [visualMode, setVisualModeState] = useState<AvatarVisualMode>(() => getAvatarVisualMode());

  const isHi = language === 'hi';

  // Check browser permissions on mount
  useEffect(() => {
    if (!isOpen) return;

    if (navigator.permissions && navigator.permissions.query) {
      // Query microphone permission status
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          setMicPermission(status.state as any);
          status.onchange = () => setMicPermission(status.state as any);
        })
        .catch(() => {});

      // Query camera permission status
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((status) => {
          setCameraPermission(status.state as any);
          status.onchange = () => setCameraPermission(status.state as any);
        })
        .catch(() => {});
    }

    // Load message counts for history tab
    loadHistoryStats();
  }, [isOpen, currentUserId]);

  const loadHistoryStats = async () => {
    setIsLoadingHistory(true);
    try {
      const all = await fetchAllUserChats(currentUserId);
      const counts: Record<string, number> = {};
      ['raj', 'aneet', 'mira', 'ren'].forEach((id) => {
        counts[id] = (all[id] || []).length;
      });
      setHistoryStats(counts);
    } catch {
      setHistoryStats({ raj: 0, aneet: 0, mira: 0, ren: 0 });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Stop media streams on modal close or unmount
  const stopAllMediaStreams = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    setIsTestingMic(false);
    setMicVolumeLevel(0);

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
    }
    setIsTestingCamera(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopAllMediaStreams();
    }
    return () => {
      stopAllMediaStreams();
    };
  }, [isOpen]);

  // Test Microphone Handler
  const handleToggleMicTest = async () => {
    if (isTestingMic) {
      stopAllMediaStreams();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicPermission('granted');
      setIsTestingMic(true);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicVolumeLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err: any) {
      console.warn('Microphone permission error:', err);
      setMicPermission('denied');
      setIsTestingMic(false);
    }
  };

  // Test Camera Handler
  const handleToggleCameraTest = async () => {
    if (isTestingCamera) {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
        videoStreamRef.current = null;
      }
      setIsTestingCamera(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
      videoStreamRef.current = stream;
      setCameraPermission('granted');
      setIsTestingCamera(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera permission error:', err);
      setCameraPermission('denied');
      setIsTestingCamera(false);
    }
  };

  // Export Chat History
  const handleExportHistory = async () => {
    try {
      const all = await fetchAllUserChats(currentUserId);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(all, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `buddy_care_conversations_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setHistorySuccessMsg(isHi ? 'चैट इतिहास सफलता से डाउनलोड हो गया' : 'Chat history exported successfully!');
      setTimeout(() => setHistorySuccessMsg(null), 3000);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Clear single avatar chat
  const handleClearSingleAvatar = async (id: AvatarId) => {
    await clearAvatarChat(currentUserId, id);
    if (id === activeAvatarId && onClearCurrentAvatarHistory) {
      onClearCurrentAvatarHistory();
    }
    loadHistoryStats();
    setHistorySuccessMsg(isHi ? `${AVATAR_FRIENDS[id]?.name} की चैट हटा दी गई` : `Chat with ${AVATAR_FRIENDS[id]?.name} cleared.`);
    setTimeout(() => setHistorySuccessMsg(null), 3000);
  };

  // Clear all chats
  const handleClearAllChats = async () => {
    await clearAllUserChats(currentUserId);
    if (onClearCurrentAvatarHistory) {
      onClearCurrentAvatarHistory();
    }
    setConfirmClearAll(false);
    loadHistoryStats();
    setHistorySuccessMsg(isHi ? 'सभी बातचीत सफलतापूर्वक साफ़ कर दी गईं' : 'All conversation histories cleared.');
    setTimeout(() => setHistorySuccessMsg(null), 3000);
  };

  // Switch visual mode
  const handleSelectVisualMode = (mode: AvatarVisualMode) => {
    setVisualModeState(mode);
    setAvatarVisualMode(mode);
    if (onVisualModeChange) {
      onVisualModeChange(mode);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {isHi ? 'सेटिंग्स और गोपनीयता नियंत्रण' : 'Settings & Privacy Controls'}
              </h3>
              <p className="text-xs text-slate-500">
                {isHi ? 'माइक, वीडियो, अवतार और चैट इतिहास प्रबंधित करें' : 'Manage mic, video permissions, avatar mode & your history'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopAllMediaStreams();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Navigation */}
        <div className="px-5 pt-3 border-b border-slate-100 flex gap-2 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'permissions'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isHi ? 'अनुमतियाँ (माइक व कैमरा)' : 'Permissions (Mic & Video)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{isHi ? 'चैट इतिहास' : 'Your Chat History'}</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'appearance'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{isHi ? 'अवतार रूप (3D / 2D)' : 'Avatar Mode (3D / 2D)'}</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {historySuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{historySuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: PERMISSIONS (MIC & VIDEO) */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              
              {/* MICROPHONE PERMISSION CARD */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {isHi ? 'माइक्रोफ़ोन एक्सेस (Microphone)' : 'Microphone Access'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {isHi ? 'वाचाना एआई भारतीय आवाज़ पहचान (STT) के लिए' : 'Used for Vachana AI Indic Voice-to-Text conversation'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      micPermission === 'granted'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : micPermission === 'denied'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {micPermission === 'granted'
                      ? '✓ Granted'
                      : micPermission === 'denied'
                      ? '✕ Denied'
                      : '○ Prompt'}
                  </span>
                </div>

                {/* Live Mic Test Meter */}
                {isTestingMic && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">Live Voice Input Level:</span>
                      <span className="text-emerald-700 font-bold">{micVolumeLevel}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-75"
                        style={{ width: `${Math.max(5, micVolumeLevel)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 text-center">Speak into your microphone to verify</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    {micPermission === 'denied'
                      ? 'Please enable mic in your browser address bar'
                      : 'Zero recording stored or transmitted to third parties'}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleMicTest}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isTestingMic
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                    }`}
                  >
                    {isTestingMic ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isTestingMic ? 'Stop Test' : 'Test Microphone'}</span>
                  </button>
                </div>
              </div>

              {/* CAMERA / VIDEO PERMISSION CARD */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {isHi ? 'कैमरा / वीडियो एक्सेस (Camera Preview)' : 'Camera / Video Permission'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {isHi ? 'सेल्फी चेक-इन और फेस एक्सप्रेशन शील्ड' : 'For optional live face check-in mirror'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      cameraPermission === 'granted'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : cameraPermission === 'denied'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {cameraPermission === 'granted'
                      ? '✓ Granted'
                      : cameraPermission === 'denied'
                      ? '✕ Denied'
                      : '○ Prompt'}
                  </span>
                </div>

                {/* Live Camera Preview Box */}
                {isTestingCamera && (
                  <div className="p-2 bg-slate-900 rounded-2xl flex flex-col items-center justify-center overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-h-48 object-cover rounded-xl transform -scale-x-100"
                    />
                    <span className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      <span>Live camera feed is strictly in-memory and never recorded</span>
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    {cameraPermission === 'denied'
                      ? 'Access blocked. Click lock in address bar to unblock'
                      : '100% Client-side preview, no cloud storage'}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleCameraTest}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isTestingCamera
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    }`}
                  >
                    {isTestingCamera ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                    <span>{isTestingCamera ? 'Close Camera' : 'Test Camera'}</span>
                  </button>
                </div>
              </div>

              {/* Privacy Shield Info */}
              <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200/80 text-xs text-teal-950 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <p className="font-bold">Zero Telemetry & End-to-End Privacy Guarantee</p>
                  <p className="text-[11px] text-teal-800">
                    Buddy Care never streams or archives your video or mic feed. Your permissions can be revoked at any second via your browser address bar.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CHAT HISTORY ACCESS */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    {isHi ? 'साथी वार्तालाप इतिहास' : 'Companion Chat Records'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isHi ? 'आपके द्वारा विभिन्न अवतारों के साथ की गई बातचीत' : 'Stored securely in your private browser cache'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportHistory}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isHi ? 'निर्यात (Export)' : 'Export All'}</span>
                </button>
              </div>

              {/* Companions Breakdown Grid */}
              <div className="space-y-2">
                {(['raj', 'aneet', 'mira', 'ren'] as AvatarId[]).map((id) => {
                  const comp = AVATAR_FRIENDS[id];
                  const count = historyStats[id] || 0;
                  return (
                    <div
                      key={id}
                      className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          <img
                            src={comp?.avatarImageUrl || `/avatars/${id}_portrait.jpg`}
                            alt={comp?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">{comp?.name}</span>
                            <span className="text-[10px] text-slate-400">({comp?.headline})</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {count} {count === 1 ? 'message' : 'messages'} exchanged
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {count > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearSingleAvatar(id)}
                            title={`Clear messages with ${comp?.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                          Active
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Danger Zone: Clear all histories */}
              <div className="pt-2 border-t border-slate-100">
                {confirmClearAll ? (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 text-xs text-rose-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Are you sure you want to delete all chat histories?</span>
                    </p>
                    <p className="text-[11px] text-rose-700">This action erases every saved conversation and cannot be undone.</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleClearAllChats}
                        className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                      >
                        Yes, Erase Everything
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(false)}
                        className="px-3 py-1 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    className="w-full py-2 px-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Conversation Records</span>
                  </button>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: APPEARANCE (3D VS 2D) */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  {isHi ? 'अवतार विज़ुअल मोड' : 'Companion Visual Rendering Mode'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {isHi ? '3D इंटरैक्टिव या स्टूडियो पोर्ट्रेट मोड चुनें' : 'Select how your companion appears on the Talking Avatar stage'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: '3d' as AvatarVisualMode,
                    title: '3D Interactive',
                    badge: 'Recommended',
                    desc: 'Real-time 3D talking avatar with dynamic lip movement, natural blinking & mouse cursor head tracking.',
                    icon: Box,
                    color: 'text-teal-600',
                  },
                  {
                    id: 'portrait' as AvatarVisualMode,
                    title: 'Studio Portrait',
                    badge: 'High Detail',
                    desc: 'Crisp photorealistic studio headshot portrait with ambient voice glow and soundwaves.',
                    icon: Sparkles,
                    color: 'text-indigo-600',
                  },
                  {
                    id: 'illustration' as AvatarVisualMode,
                    title: '2D Illustrated',
                    badge: 'Expressive',
                    desc: 'Lightweight, layered SVG illustration with tilt animations and emotion tags.',
                    icon: RefreshCw,
                    color: 'text-amber-600',
                  },
                ].map((mode) => {
                  const isSelected = visualMode === mode.id;
                  const Icon = mode.icon;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => handleSelectVisualMode(mode.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Icon className={`w-4 h-4 ${mode.color}`} />
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {mode.badge}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 mb-1">{mode.title}</h5>
                        <p className="text-[11px] text-slate-500 leading-snug">{mode.desc}</p>
                      </div>

                      <div className="pt-2 flex items-center justify-end">
                        <span
                          className={`text-[10px] font-bold ${
                            isSelected ? 'text-teal-700' : 'text-slate-400'
                          }`}
                        >
                          {isSelected ? '✓ Selected' : 'Choose'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              stopAllMediaStreams();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {isHi ? 'पूर्ण (Done)' : 'Done'}
          </button>
        </div>

      </div>
    </div>
  );
};
