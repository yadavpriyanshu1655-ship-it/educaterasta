import React, { useState } from 'react';
import {
  DashboardIcon,
  BookOpenIcon,
  LayersIcon,
  CalendarIcon,
  AwardIcon,
  ChartIcon,
  SettingsIcon,
  MenuIcon,
  XIcon,
  ShieldAlertIcon,
  TargetIcon,
} from './Icons';

export type NavTab =
  | 'dashboard'
  | 'subjects'
  | 'syllabus'
  | 'planner'
  | 'quizzes'
  | 'weak-topics'
  | 'exams'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="w-5 h-5" /> },
    { id: 'subjects', label: 'Subjects', icon: <BookOpenIcon className="w-5 h-5" /> },
    { id: 'syllabus', label: 'Syllabus & Topics', icon: <LayersIcon className="w-5 h-5" /> },
    { id: 'planner', label: 'Study Planner', icon: <CalendarIcon className="w-5 h-5" /> },
    { id: 'quizzes', label: 'Quizzes & Practice', icon: <AwardIcon className="w-5 h-5" /> },
    { id: 'weak-topics', label: 'Weak Topics & Mistakes', icon: <ShieldAlertIcon className="w-5 h-5" /> },
    { id: 'exams', label: 'Examinations', icon: <TargetIcon className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <ChartIcon className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-slate-950 text-base">
            E
          </div>
          <span className="font-bold tracking-tight text-white text-base">EDUCATERASTA</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          aria-label="Toggle Navigation Menu"
        >
          {mobileOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-200 ease-in-out p-5 flex flex-col justify-between ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-slate-950 text-base">
                E
              </div>
              <div>
                <div className="font-bold text-white text-sm">EDUCATERASTA</div>
                <div className="text-[10px] text-slate-400">Study Planner</div>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <nav className="mt-5 space-y-1">
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    active
                      ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
          Phase 01: Core Study Planner
        </div>
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col justify-between bg-slate-900 border-r border-slate-800 p-5 min-h-screen fixed top-0 bottom-0 left-0 z-20">
        <div>
          <div className="flex items-center space-x-3 pb-6 border-b border-slate-800">
            <div className="h-9 w-9 rounded-xl bg-sky-500 flex items-center justify-center font-extrabold text-slate-950 text-lg shadow-sm">
              E
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">EDUCATERASTA</h1>
              <p className="text-[11px] text-slate-400">Core Study Planner</p>
            </div>
          </div>

          <div className="mt-4 px-1 py-1 rounded-lg bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Phase Status</span>
            <span className="font-semibold text-sky-400 bg-sky-950/70 border border-sky-800 px-2 py-0.5 rounded-full text-[10px]">
              Phase 01
            </span>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                    active
                      ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span className={active ? 'text-sky-400' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40 text-xs text-slate-400">
            <div className="font-semibold text-slate-300">Local SQLite Mode</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Persistent database storage</div>
          </div>
        </div>
      </aside>
    </>
  );
};

