import React, { useState, useEffect } from 'react';

interface HealthStatus {
  status: string;
  service: string;
  version: string;
  environment: string;
  database_connected: boolean;
  timestamp: string;
  details?: Record<string, unknown>;
}

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/v1/health`);
      if (!response.ok) {
        throw new Error(`API responded with status code ${response.status}`);
      }
      const data: HealthStatus = await response.json();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend service');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-slate-950 text-xl tracking-wider">
            E
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">EDUCATERASTA</h1>
            <p className="text-xs text-slate-400">AI-Powered Personalized Study Planning</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
            Phase 00: Foundation
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-6 py-12 flex-1">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              System Foundation Baseline
            </h2>
            <p className="mt-3 text-slate-400 text-base leading-relaxed">
              Phase 00 baseline initialization for the EDUCATERASTA platform. All core architectural components,
              FastAPI backend, React/Vite/TypeScript frontend, and SQLite database connectivity are verified.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Frontend</div>
              <div className="mt-2 text-lg font-bold text-emerald-400 flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block"></span>
                <span>Active</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">React 18, Vite, TypeScript, Tailwind CSS</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Backend API</div>
              <div className="mt-2 text-lg font-bold flex items-center space-x-2">
                {loading ? (
                  <span className="text-amber-400 flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse inline-block"></span>
                    <span>Checking...</span>
                  </span>
                ) : health?.status === 'healthy' ? (
                  <span className="text-emerald-400 flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block"></span>
                    <span>Healthy</span>
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400 inline-block"></span>
                    <span>Disconnected</span>
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400">FastAPI, Python 3.14, Uvicorn</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database</div>
              <div className="mt-2 text-lg font-bold flex items-center space-x-2">
                {health?.database_connected ? (
                  <span className="text-emerald-400 flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block"></span>
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500 inline-block"></span>
                    <span>SQLite Baseline</span>
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400">SQLAlchemy 2.0 & Alembic Migrations</p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
              <h3 className="text-lg font-semibold text-white">Live Backend Health Status</h3>
              <button
                onClick={fetchHealth}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-md transition duration-150 cursor-pointer"
              >
                {loading ? 'Refreshing...' : 'Refresh Status'}
              </button>
            </div>

            <div className="mt-4">
              {loading && !health && (
                <div className="py-6 text-center text-slate-400 text-sm">
                  Querying backend health endpoint (/api/v1/health)...
                </div>
              )}

              {error && (
                <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm">
                  <div className="font-semibold">Backend Connection Notice:</div>
                  <div className="mt-1">{error}</div>
                  <div className="mt-2 text-xs text-rose-400">
                    Ensure the FastAPI server is running with <code className="bg-rose-950 px-1 py-0.5 rounded">uvicorn backend.app.main:app --reload</code>
                  </div>
                </div>
              )}

              {health && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">Service</div>
                      <div className="font-semibold text-slate-200 mt-0.5">{health.service}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Status</div>
                      <div className="font-semibold text-emerald-400 mt-0.5 capitalize">{health.status}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Version</div>
                      <div className="font-semibold text-slate-200 mt-0.5">{health.version}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Environment</div>
                      <div className="font-semibold text-slate-200 mt-0.5 capitalize">{health.environment}</div>
                    </div>
                  </div>
                  <div className="pt-2 text-xs text-slate-400 border-t border-slate-700/40">
                    Last response verified at: {new Date(health.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 px-6 text-center text-xs text-slate-400">
        EDUCATERASTA &copy; {new Date().getFullYear()} &mdash; Phase 00 Baseline
      </footer>
    </div>
  );
};

export default App;

