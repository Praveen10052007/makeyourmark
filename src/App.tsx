/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  ViewMode,
  UserProfile,
  UserSession,
  TrackedJobApplication,
  StudyNote,
  CareerRoadmapPlan,
  ThemePreference,
} from './types';
import { checkServerHealth, checkLocalServerSession } from './services/api';
import {
  initFirebaseAuth,
  syncProfileToFirestore,
  syncNoteToFirestore,
  deleteNoteFromFirestore,
  fetchNotesFromFirestore,
  syncRoadmapToFirestore,
  deleteAllUserCloudData,
  deleteFirebaseAccount,
} from './services/firebaseClient';
import { deleteLocalAccountServer } from './services/api';
import { INITIAL_STUDENT_PROFILE, INITIAL_NOTES } from './data/mockData';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthModal } from './components/AuthModal';

import { HomeView } from './components/views/HomeView';

const LearnView = lazy(() => import('./components/views/LearnView').then((m) => ({ default: m.LearnView })));
const AIAssistantView = lazy(() => import('./components/views/AIAssistantView').then((m) => ({ default: m.AIAssistantView })));
const LinkedInView = lazy(() => import('./components/views/LinkedInView').then((m) => ({ default: m.LinkedInView })));
const AITutorView = lazy(() => import('./components/views/AITutorView').then((m) => ({ default: m.AITutorView })));
const AIChatbotView = lazy(() => import('./components/views/AIChatbotView').then((m) => ({ default: m.AIChatbotView })));
const AINotesView = lazy(() => import('./components/views/AINotesView').then((m) => ({ default: m.AINotesView })));
const VideoSearchView = lazy(() => import('./components/views/VideoSearchView').then((m) => ({ default: m.VideoSearchView })));
const WebsiteResearchView = lazy(() => import('./components/views/WebsiteResearchView').then((m) => ({ default: m.WebsiteResearchView })));
const AppResearchView = lazy(() => import('./components/views/AppResearchView').then((m) => ({ default: m.AppResearchView })));
const AIInterviewerView = lazy(() => import('./components/views/AIInterviewerView').then((m) => ({ default: m.AIInterviewerView })));
const ResumeAnalyzerView = lazy(() => import('./components/views/ResumeAnalyzerView').then((m) => ({ default: m.ResumeAnalyzerView })));
const ResumeBuilderView = lazy(() => import('./components/views/ResumeBuilderView').then((m) => ({ default: m.ResumeBuilderView })));
const JobSearchView = lazy(() => import('./components/views/JobSearchView').then((m) => ({ default: m.JobSearchView })));
const CompanyCareersView = lazy(() => import('./components/views/CompanyCareersView').then((m) => ({ default: m.CompanyCareersView })));
const CareerRoadmapView = lazy(() => import('./components/views/CareerRoadmapView').then((m) => ({ default: m.CareerRoadmapView })));
const ProfileSettingsView = lazy(() => import('./components/views/ProfileSettingsView').then((m) => ({ default: m.ProfileSettingsView })));
const NotFoundView = lazy(() => import('./components/views/NotFoundView').then((m) => ({ default: m.NotFoundView })));
const WeeklyTasksStreakView = lazy(() => import('./components/views/WeeklyTasksStreakView').then((m) => ({ default: m.WeeklyTasksStreakView })));
const VoiceAssistantView = lazy(() => import('./components/views/VoiceAssistantView').then((m) => ({ default: m.VoiceAssistantView })));
const SkillGapView = lazy(() => import('./components/views/SkillGapView').then((m) => ({ default: m.SkillGapView })));

const VALID_VIEWS: ViewMode[] = [
  'home',
  'learn',
  'ai-assistant',
  'jobs',
  'profile',
  'tasks',
  'voice',
  'tutor',
  'chat',
  'notes',
  'videos',
  'research',
  'apps',
  'interview',
  'resume-analyzer',
  'resume-builder',
  'companies',
  'roadmap',
  'linkedin',
  'skill-gap',
];

export default function App() {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem('mym_theme_pref');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    const legacy = localStorage.getItem('mym_theme');
    if (legacy === 'light') return 'light';
    return 'dark'; // Default Dark Charcoal theme
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  );

  const effectiveTheme: 'light' | 'dark' =
    themePreference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themePreference;

  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    const hash = window.location.hash.replace('#', '') as ViewMode;
    return VALID_VIEWS.includes(hash) ? hash : 'home';
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('mym_user_profile_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.knownSkills && parsed.currentActivities) {
          return {
            ...INITIAL_STUDENT_PROFILE,
            ...parsed,
            aiSettings: { ...INITIAL_STUDENT_PROFILE.aiSettings, ...(parsed.aiSettings || {}) },
            privacySettings: { ...INITIAL_STUDENT_PROFILE.privacySettings, ...(parsed.privacySettings || {}) },
          };
        }
      } catch (e) {
        console.error('Failed to parse cached profile:', e);
      }
    }
    return INITIAL_STUDENT_PROFILE;
  });

  const [studyNotes, setStudyNotes] = useState<StudyNote[]>(() => {
    const saved = localStorage.getItem('mym_study_notes_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore
      }
    }
    return INITIAL_NOTES;
  });

  const [generatedRoadmaps, setGeneratedRoadmaps] = useState<CareerRoadmapPlan[]>(() => {
    const saved = localStorage.getItem('mym_career_roadmaps_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore
      }
    }
    return [];
  });

  const [session, setSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem('mym_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      isAuthenticated: true,
      isGuest: true,
      authProvider: 'guest',
      email: 'guest@makeyourmark.local',
      name: 'Guest Learner',
    };
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean>(true);

  // Watch system color scheme changes
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  // Sync effective theme with HTML class
  useEffect(() => {
    localStorage.setItem('mym_theme_pref', themePreference);
    localStorage.setItem('mym_theme', effectiveTheme);
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [effectiveTheme, themePreference]);

  // Sync AI settings to localStorage so api.ts reads active provider/model
  useEffect(() => {
    if (userProfile.aiSettings) {
      localStorage.setItem('mym_ai_settings', JSON.stringify(userProfile.aiSettings));
    }
  }, [userProfile.aiSettings]);

  const toggleTheme = () => {
    setThemePreference(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

  // Hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ViewMode;
      if (VALID_VIEWS.includes(hash)) {
        setCurrentView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (view: ViewMode) => {
    setCurrentView(view);
    window.location.hash = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Server health, Firebase Auth, and local cookie session
  useEffect(() => {
    checkServerHealth().then((health) => {
      setServerOnline(health.status === 'ok');
    });

    checkLocalServerSession()
      .then((res) => {
        if (res.authenticated && res.user) {
          setSession({
            isAuthenticated: true,
            isGuest: false,
            uid: res.user.uid,
            authProvider: 'local-email',
            email: res.user.email,
            name: res.user.name,
          });
        }
      })
      .catch(() => {});

    const unsub = initFirebaseAuth(
      async (user, hasWorkspaceToken) => {
        setSession({
          isAuthenticated: true,
          isGuest: false,
          uid: user.uid,
          authProvider: 'google',
          emailVerified: user.emailVerified,
          workspaceConnected: hasWorkspaceToken,
          email: user.email || '',
          name: user.displayName || user.email?.split('@')[0] || 'Student',
          avatar: user.photoURL || undefined,
        });
        if (user.emailVerified) {
          try {
            const cloudNotes = await fetchNotesFromFirestore();
            if (cloudNotes.length > 0) {
              setStudyNotes((prev) => {
                const map = new Map(prev.map((n) => [n.id, n]));
                cloudNotes.forEach((cn) => map.set(cn.id, cn));
                return Array.from(map.values());
              });
            }
          } catch {
            // Firestore pull optional on boot
          }
        }
      },
      () => {}
    );

    return () => unsub();
  }, []);

  // Persist user data locally
  useEffect(() => {
    localStorage.setItem('mym_user_profile_v2', JSON.stringify(userProfile));
    if (session.emailVerified && session.authProvider === 'google') {
      syncProfileToFirestore(userProfile).catch(() => {});
    }
  }, [userProfile, session.emailVerified, session.authProvider]);

  useEffect(() => {
    localStorage.setItem('mym_study_notes_v1', JSON.stringify(studyNotes));
  }, [studyNotes]);

  useEffect(() => {
    localStorage.setItem('mym_career_roadmaps_v1', JSON.stringify(generatedRoadmaps));
  }, [generatedRoadmaps]);

  useEffect(() => {
    localStorage.setItem('mym_user_session', JSON.stringify(session));
  }, [session]);

  const handleAddNote = (note: StudyNote) => {
    setStudyNotes((prev) => [note, ...prev]);
    if (session.emailVerified) syncNoteToFirestore(note).catch(() => {});
  };

  const handleUpdateNote = (note: StudyNote) => {
    setStudyNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    if (session.emailVerified) syncNoteToFirestore(note).catch(() => {});
  };

  const handleDeleteNote = (noteId: string) => {
    setStudyNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (session.emailVerified) deleteNoteFromFirestore(noteId).catch(() => {});
  };

  const handleSaveRoadmap = (plan: CareerRoadmapPlan) => {
    setGeneratedRoadmaps((prev) => {
      const idx = prev.findIndex((p) => p.id === plan.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = plan;
        return copy;
      }
      return [plan, ...prev];
    });
    if (session.emailVerified) syncRoadmapToFirestore(plan).catch(() => {});
  };

  const handleToggleSaveJob = (jobId: string) => {
    setUserProfile((prev) => {
      const exists = prev.savedJobs.includes(jobId);
      const nextSaved = exists ? prev.savedJobs.filter((id) => id !== jobId) : [...prev.savedJobs, jobId];
      return { ...prev, savedJobs: nextSaved };
    });
  };

  const handleUpdateApplicationStatus = (app: TrackedJobApplication) => {
    setUserProfile((prev) => {
      const existingIdx = prev.trackedApplications.findIndex((a) => a.jobId === app.jobId);
      const updatedList = [...prev.trackedApplications];
      if (existingIdx >= 0) updatedList[existingIdx] = app;
      else updatedList.push(app);
      return { ...prev, trackedApplications: updatedList };
    });
  };

  const handleToggleNodeCompleted = (nodeId: string) => {
    setUserProfile((prev) => {
      const exists = prev.completedRoadmapNodes.includes(nodeId);
      const nextCompleted = exists
        ? prev.completedRoadmapNodes.filter((id) => id !== nodeId)
        : [...prev.completedRoadmapNodes, nodeId];
      return { ...prev, completedRoadmapNodes: nextCompleted };
    });
  };

  const handleToggleBookmarkVideo = (videoId: string) => {
    setUserProfile((prev) => {
      const exists = prev.bookmarkedVideos.includes(videoId);
      const next = exists ? prev.bookmarkedVideos.filter((v) => v !== videoId) : [...prev.bookmarkedVideos, videoId];
      return { ...prev, bookmarkedVideos: next };
    });
  };

  const handleRecordInterviewScore = (score: number) => {
    setUserProfile((prev) => ({
      ...prev,
      lastInterviewScore: score,
    }));
  };

  const handleClearAllLocalData = () => {
    localStorage.removeItem('mym_user_profile_v2');
    localStorage.removeItem('mym_study_notes_v1');
    localStorage.removeItem('mym_career_roadmaps_v1');
    localStorage.removeItem('mym_chat_history');
    localStorage.removeItem('mym_resume_draft');
    setUserProfile(INITIAL_STUDENT_PROFILE);
    setStudyNotes([]);
    setGeneratedRoadmaps([]);
  };

  const handleDeleteAccount = async () => {
    await Promise.allSettled([deleteAllUserCloudData(), deleteFirebaseAccount(), deleteLocalAccountServer()]);
    handleClearAllLocalData();
    setSession({
      isAuthenticated: false,
      isGuest: false,
      email: '',
      name: '',
    });
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomeView
            onNavigate={handleNavigate}
            userProfile={userProfile}
            notesCount={studyNotes.length}
            onToggleSaveJob={handleToggleSaveJob}
          />
        );
      case 'learn':
        return (
          <LearnView
            userProfile={userProfile}
            studyNotes={studyNotes}
            generatedRoadmaps={generatedRoadmaps}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onSaveRoadmap={handleSaveRoadmap}
            onToggleNodeCompleted={handleToggleNodeCompleted}
            onToggleBookmarkVideo={handleToggleBookmarkVideo}
            onNavigate={handleNavigate}
            session={session}
            onOpenAuthModal={() => setAuthModalOpen(true)}
          />
        );
      case 'ai-assistant':
        return (
          <AIAssistantView
            userProfile={userProfile}
            onRecordInterviewScore={handleRecordInterviewScore}
            onAddNote={handleAddNote}
          />
        );
      case 'jobs':
        return (
          <JobSearchView
            userProfile={userProfile}
            onToggleSaveJob={handleToggleSaveJob}
            onUpdateApplicationStatus={handleUpdateApplicationStatus}
          />
        );
      case 'profile':
        return (
          <ProfileSettingsView
            profile={userProfile}
            onUpdateProfile={(u) => setUserProfile(u)}
            theme={effectiveTheme}
            themePreference={themePreference}
            onChangeThemePreference={(pref) => setThemePreference(pref)}
            onToggleTheme={toggleTheme}
            session={session}
            onOpenAuthModal={() => setAuthModalOpen(true)}
            onClearAllData={handleClearAllLocalData}
            onDeleteAccount={handleDeleteAccount}
          />
        );
      case 'tasks':
        return <WeeklyTasksStreakView userProfile={userProfile} onUpdateProfile={(u) => setUserProfile(u)} />;
      case 'voice':
        return <VoiceAssistantView userProfile={userProfile} onAddNote={handleAddNote} />;
      case 'tutor':
        return <AITutorView userProfile={userProfile} onAddNote={handleAddNote} />;
      case 'chat':
        return <AIChatbotView userProfile={userProfile} onAddNote={handleAddNote} />;
      case 'notes':
        return (
          <AINotesView
            notes={studyNotes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            roadmaps={generatedRoadmaps}
            preferredLanguage={userProfile.preferredLanguage}
            session={session}
            onOpenAuthModal={() => setAuthModalOpen(true)}
          />
        );
      case 'skill-gap':
        return <SkillGapView userProfile={userProfile} onUpdateProfile={(u) => setUserProfile(u)} />;
      case 'videos':
        return (
          <VideoSearchView
            bookmarkedVideos={userProfile.bookmarkedVideos}
            onToggleBookmark={handleToggleBookmarkVideo}
            generatedRoadmaps={generatedRoadmaps}
          />
        );
      case 'research':
        return <WebsiteResearchView />;
      case 'apps':
        return <AppResearchView />;
      case 'interview':
        return <AIInterviewerView userProfile={userProfile} onScoreRecorded={handleRecordInterviewScore} />;
      case 'resume-analyzer':
        return <ResumeAnalyzerView />;
      case 'resume-builder':
        return (
          <ResumeBuilderView
            userProfile={userProfile}
            session={session}
            onOpenAuthModal={() => setAuthModalOpen(true)}
          />
        );
      case 'companies':
        return <CompanyCareersView />;
      case 'roadmap':
        return (
          <CareerRoadmapView
            userProfile={userProfile}
            generatedRoadmaps={generatedRoadmaps}
            onSaveRoadmap={handleSaveRoadmap}
            onToggleNodeCompleted={handleToggleNodeCompleted}
            studyNotes={studyNotes}
            onAddNote={handleAddNote}
            onNavigate={handleNavigate}
          />
        );
      case 'linkedin':
        return (
          <LinkedInView
            userProfile={userProfile}
            session={session}
            studyNotes={studyNotes}
            onOpenAuthModal={() => setAuthModalOpen(true)}
          />
        );
      default:
        return <NotFoundView onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-orange-600 selection:text-white">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        serverOnline={serverOnline}
        theme={effectiveTheme}
        onToggleTheme={toggleTheme}
        session={session}
        onOpenAuthModal={() => setAuthModalOpen(true)}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 lg:pb-12">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading module...</p>
            </div>
          }
        >
          {renderCurrentView()}
        </Suspense>
      </main>

      <MobileNav currentView={currentView} onNavigate={handleNavigate} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        session={session}
        onLogin={(s) => setSession(s)}
        onLogout={() =>
          setSession({
            isAuthenticated: false,
            isGuest: false,
            email: '',
            name: '',
          })
        }
      />

      <OfflineIndicator />

      <footer className="hidden lg:block border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141417] py-8 text-xs text-zinc-500 dark:text-zinc-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 dark:text-white">MakeYourMark AI</span>
            <span>•</span>
            <span>Career, Learning & Professional Platform</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => handleNavigate('roadmap')} className="hover:text-orange-500 transition">
              Roadmaps
            </button>
            <button onClick={() => handleNavigate('notes')} className="hover:text-orange-500 transition">
              AI Notes
            </button>
            <button onClick={() => handleNavigate('resume-builder')} className="hover:text-orange-500 transition">
              Resume Builder
            </button>
            <button onClick={() => handleNavigate('jobs')} className="hover:text-orange-500 transition">
              Job Search
            </button>
            <button onClick={() => handleNavigate('linkedin')} className="hover:text-orange-500 transition">
              Workspace & Docs
            </button>
            <button onClick={() => handleNavigate('profile')} className="hover:text-orange-500 transition">
              Settings
            </button>
          </div>

          <div>
            <span>Dual Salaries (₹ LPA & $ USD) • EN / தமிழ்</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
