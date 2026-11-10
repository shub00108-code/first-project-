import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { TabType, Language, User, AvatarId } from './types';
import { Header } from './components/Header';
import { BreathingExercise } from './components/BreathingExercise';
import { GetHelpView } from './components/GetHelpView';
import { AdminPortalView } from './components/AdminPortalView';
import { Footer } from './components/Footer';
import { AuthFrontPage } from './components/AuthFrontPage';
import { UserProfileModal } from './components/UserProfileModal';
import { getActiveUser, setActiveUser } from './utils/authStorage';
import { mapFirebaseUser, signOutUser, ADMIN_EMAIL } from './services/firebaseAuth';
import { AvatarChatView } from './components/AvatarChatView';
import { AvatarSelectModal } from './components/AvatarSelectModal';
import { getLastChosenAvatarId, saveLastChosenAvatarId } from './utils/avatarFriends';
import { FindPsychiatristView } from './components/FindPsychiatristView';
import { DoctorTranscriptView } from './components/DoctorTranscriptView';
import { SettingsModal } from './components/SettingsModal';
import { Spatial3DCanvas } from './components/spatial3d/Spatial3DCanvas';
import {
  fetchAvatarFeatureToggle,
  fetchUserChosenCompanion,
  saveUserChosenCompanion,
} from './services/avatarFirestoreService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getActiveUser());
  const [spatial3DEnabled, setSpatial3DEnabled] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'doctor-view' && params.get('shareId') && params.get('token')) {
      return 'doctor-view';
    }
    return 'avatars';
  });
  const [language, setLanguage] = useState<Language>(() => currentUser?.language || 'en');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Avatar feature toggle
  const [avatarFeatureEnabled, setAvatarFeatureEnabled] = useState<boolean>(true);

  // Doctor transcript parameters (for secure expiring link)
  const [doctorViewParams, setDoctorViewParams] = useState<{ shareId: string; token: string } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('shareId');
    const token = params.get('token');
    if (shareId && token) {
      return { shareId, token };
    }
    return null;
  });

  // Companion Avatar friend selection state
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarId>(() => getLastChosenAvatarId());
  const [showAvatarSelectModal, setShowAvatarSelectModal] = useState(false);

  const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() || currentUser?.role === 'admin';

  // Load avatar feature toggle on mount
  useEffect(() => {
    fetchAvatarFeatureToggle()
      .then((enabled) => setAvatarFeatureEnabled(enabled))
      .catch(() => setAvatarFeatureEnabled(true));
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const mapped = await mapFirebaseUser(fbUser);
        setCurrentUser(mapped);
        setActiveUser(mapped);
        if (mapped.language) {
          setLanguage(mapped.language);
        }
        // Fetch user's saved chosen companion
        fetchUserChosenCompanion(mapped.id)
          .then((char) => {
            if (char) {
              setSelectedAvatarId(char as AvatarId);
              saveLastChosenAvatarId(char as AvatarId);
            }
          })
          .catch(() => {});
      } else {
        const cached = getActiveUser();
        if (cached && !cached.email?.toLowerCase().includes(ADMIN_EMAIL.toLowerCase())) {
          setCurrentUser(cached);
        } else {
          setCurrentUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const handleLogout = async () => {
    await signOutUser();
    setCurrentUser(null);
    setCurrentTab('avatars');
  };

  const handleOpenDoctorTranscript = (shareId: string, token: string) => {
    setDoctorViewParams({ shareId, token });
    setCurrentTab('doctor-view');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900 relative">
      {/* Ambient Global 3D Spatial Canvas */}
      <Spatial3DCanvas activeAvatarId={selectedAvatarId} enabled={spatial3DEnabled} />

      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        currentUser={currentUser}
        onOpenProfile={() => setShowProfileModal(true)}
        onLogout={handleLogout}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        isSpatial3DEnabled={spatial3DEnabled}
        onToggleSpatial3D={() => setSpatial3DEnabled(!spatial3DEnabled)}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col relative z-10">
        {(currentTab === 'avatars' || currentTab === 'chat') && (
          <AvatarChatView
            avatarId={selectedAvatarId}
            currentUser={currentUser}
            language={language}
            avatarFeatureEnabled={avatarFeatureEnabled}
            onSwitchFriend={() => setShowAvatarSelectModal(true)}
            onNavigateToHelp={() => setCurrentTab('help')}
            onNavigateToPsychiatrist={() => setCurrentTab('psychiatrists')}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}

        {currentTab === 'breathing' && (
          <div className="py-6 sm:py-10 max-w-2xl mx-auto w-full px-4 flex-1 flex flex-col justify-center">
            <BreathingExercise language={language} />
          </div>
        )}

        {currentTab === 'help' && (
          <div className="py-6 sm:py-8 max-w-4xl mx-auto w-full px-4">
            <GetHelpView language={language} />
          </div>
        )}

        {currentTab === 'admin' && (
          <AdminPortalView
            currentUser={currentUser}
            language={language}
            onNavigateToApp={() => setCurrentTab('avatars')}
            onLogout={handleLogout}
            onOpenDoctorTranscript={handleOpenDoctorTranscript}
            onLoginSuccess={(u) => {
              setCurrentUser(u);
              setActiveUser(u);
            }}
          />
        )}

        {currentTab === 'psychiatrists' && (
          <div className="py-6 max-w-4xl mx-auto w-full px-4 flex-1">
            <FindPsychiatristView
              currentUser={currentUser}
              language={language}
              onOpenAuth={() => setShowAuthModal(true)}
              onNavigateToHelp={() => setCurrentTab('help')}
              onOpenDoctorTranscript={handleOpenDoctorTranscript}
            />
          </div>
        )}

        {currentTab === 'doctor-view' && doctorViewParams && (
          <div className="py-6 max-w-3xl mx-auto w-full px-4 flex-1">
            <DoctorTranscriptView
              shareId={doctorViewParams.shareId}
              token={doctorViewParams.token}
              onBackToApp={() => setCurrentTab('avatars')}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer
        language={language}
        onNavigateToHelp={() => setCurrentTab('help')}
        onNavigateToAdmin={() => setCurrentTab('admin')}
      />

      {/* Companion Select Modal */}
      <AvatarSelectModal
        isOpen={showAvatarSelectModal}
        onClose={() => setShowAvatarSelectModal(false)}
        onSelectAvatar={(id) => {
          setSelectedAvatarId(id);
          saveLastChosenAvatarId(id);
          if (currentUser?.id) {
            saveUserChosenCompanion(currentUser.id, id).catch(() => {});
          }
          setShowAvatarSelectModal(false);
        }}
        currentAvatarId={selectedAvatarId}
        language={language}
        userId={currentUser?.id}
        isAdmin={isAdmin}
      />

      {/* User Profile Modal */}
      {showProfileModal && currentUser && (
        <UserProfileModal
          user={currentUser}
          language={language}
          onClose={() => setShowProfileModal(false)}
          onLogout={handleLogout}
          onUpdateUser={(updatedUser: User) => {
            setCurrentUser(updatedUser);
            setActiveUser(updatedUser);
          }}
        />
      )}

      {/* Auth Front Page Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              ✕
            </button>
            <AuthFrontPage
              language={language}
              onToggleLanguage={handleToggleLanguage}
              onLoginSuccess={(user: User) => {
                setCurrentUser(user);
                setActiveUser(user);
                setShowAuthModal(false);
              }}
              onEmergencyHelp={() => {
                setShowAuthModal(false);
                setCurrentTab('help');
              }}
            />
          </div>
        </div>
      )}

      {/* Global Settings Modal (Mic, Camera, History) */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          language={language}
          currentUserId={currentUser?.id || 'guest'}
          activeAvatarId={selectedAvatarId}
        />
      )}
    </div>
  );
}
