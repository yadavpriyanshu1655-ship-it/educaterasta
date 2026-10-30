import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { SyllabusPage } from './pages/SyllabusPage';
import { PlannerPage } from './pages/PlannerPage';
import { ExamsPage } from './pages/ExamsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  // Sync tab with browser URL hash if present
  const getInitialTab = (): NavTab => {
    const hash = window.location.hash.replace('#', '') as NavTab;
    const validTabs: NavTab[] = [
      'dashboard',
      'subjects',
      'syllabus',
      'planner',
      'exams',
      'analytics',
      'settings',
    ];
    return validTabs.includes(hash) ? hash : 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState<NavTab>(getInitialTab);

  // Cross-page quick-action signals
  const [triggerNewSubject, setTriggerNewSubject] = useState(false);
  const [triggerNewSession, setTriggerNewSession] = useState(false);
  const [triggerNewExam, setTriggerNewExam] = useState(false);
  const [selectedSubjectIdForSyllabus, setSelectedSubjectIdForSyllabus] = useState<number | null>(null);

  useEffect(() => {
    window.location.hash = currentTab;
  }, [currentTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as NavTab;
      const validTabs: NavTab[] = [
        'dashboard',
        'subjects',
        'syllabus',
        'planner',
        'exams',
        'analytics',
        'settings',
      ];
      if (validTabs.includes(hash)) {
        setCurrentTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectSubjectForTopics = (subjectId: number) => {
    setSelectedSubjectIdForSyllabus(subjectId);
    setCurrentTab('syllabus');
  };

  const handleOpenNewSubjectFromAnywhere = () => {
    setTriggerNewSubject(true);
    setCurrentTab('subjects');
  };

  const handleOpenNewSessionFromAnywhere = () => {
    setTriggerNewSession(true);
    setCurrentTab('planner');
  };

  const handleOpenNewExamFromAnywhere = () => {
    setTriggerNewExam(true);
    setCurrentTab('exams');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar navigation */}
      <Sidebar currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenNewSubject={handleOpenNewSubjectFromAnywhere}
              onOpenNewSession={handleOpenNewSessionFromAnywhere}
              onOpenNewExam={handleOpenNewExamFromAnywhere}
            />
          )}

          {currentTab === 'subjects' && (
            <SubjectsPage
              onSelectSubjectForTopics={handleSelectSubjectForTopics}
              openCreateModal={triggerNewSubject}
              onResetOpenCreateModal={() => setTriggerNewSubject(false)}
            />
          )}

          {currentTab === 'syllabus' && (
            <SyllabusPage initialSubjectId={selectedSubjectIdForSyllabus} />
          )}

          {currentTab === 'planner' && (
            <PlannerPage
              openCreateModal={triggerNewSession}
              onResetOpenCreateModal={() => setTriggerNewSession(false)}
            />
          )}

          {currentTab === 'exams' && (
            <ExamsPage
              openCreateModal={triggerNewExam}
              onResetOpenCreateModal={() => setTriggerNewExam(false)}
            />
          )}

          {currentTab === 'analytics' && <AnalyticsPage />}

          {currentTab === 'settings' && <SettingsPage />}
        </main>

        <footer className="border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500">
          EDUCATERASTA &copy; {new Date().getFullYear()} &mdash; Phase 01: Core Study Planner
        </footer>
      </div>
    </div>
  );
};

export default App;
