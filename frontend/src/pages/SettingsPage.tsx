import React, { useState } from 'react';
import { SettingsIcon } from '../components/Icons';

export const SettingsPage: React.FC = () => {
  const [appTheme] = useState('dark');
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="pb-6 border-b border-slate-800">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Settings & Preferences</h2>
        <p className="mt-1 text-xs text-slate-400">
          Application configuration and operational parameters for Phase 01.
        </p>
      </div>

      {/* Notice & Scope Box */}
      <div className="p-5 rounded-2xl bg-sky-950/30 border border-sky-800/60 text-xs text-sky-200 space-y-2">
        <div className="flex items-center space-x-2 font-bold text-sm text-sky-300">
          <SettingsIcon className="w-4 h-4 text-sky-400" />
          <span>Phase 01 Single-User Architecture Note</span>
        </div>
        <p className="leading-relaxed">
          EDUCATERASTA is currently operating in <strong>Phase 01 (Core Study Planner)</strong> mode with a
          persistent local SQLite database. Authentication, multi-user accounts, and remote cloud synchronization
          are scheduled for introduction in Phase 02 and later milestones.
        </p>
      </div>

      {/* Preferences Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="text-base font-semibold text-white pb-3 border-b border-slate-800">
          System Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <span className="text-slate-400 block mb-1">Detected Client Timezone</span>
            <span className="font-semibold text-white text-sm">{userTimezone}</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Used for examination countdown calculations and study session dates.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <span className="text-slate-400 block mb-1">Active Interface Theme</span>
            <span className="font-semibold text-white text-sm capitalize">{appTheme} (Default)</span>
            <p className="text-[11px] text-slate-500 mt-1">
              High-contrast SaaS color palette optimized for accessibility.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <span className="text-slate-400 block mb-1">Database Engine</span>
            <span className="font-semibold text-emerald-400 text-sm">SQLite (Persistent)</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Managed with SQLAlchemy 2.0 ORM and Alembic migrations.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <span className="text-slate-400 block mb-1">API Backend Base URL</span>
            <span className="font-mono text-slate-300 text-xs">
              {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Configurable via VITE_API_BASE_URL environment variable.
            </p>
          </div>
        </div>
      </div>

      {/* Planned Settings Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-white pb-3 border-b border-slate-800">
          Upcoming Feature Slots
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The following preference modules will become configurable in future platform phases:
        </p>

        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 border border-slate-800">
            <span>User Authentication & Profile Management</span>
            <span className="text-slate-500 text-[11px]">Phase 02</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 border border-slate-800">
            <span>AI Copilot & Study Habit Personalization</span>
            <span className="text-slate-500 text-[11px]">Phase 03</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 border border-slate-800">
            <span>Cloud Database Sync (PostgreSQL)</span>
            <span className="text-slate-500 text-[11px]">Phase 04</span>
          </div>
        </div>
      </div>
    </div>
  );
};
