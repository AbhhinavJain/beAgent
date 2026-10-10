import React from 'react';
import {
  BookOpen,
  BarChart3,
  Database,
  Sun,
  Moon,
  AlertTriangle,
  GraduationCap,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'quiz' | 'analytics' | 'database';
  setActiveTab: (tab: 'quiz' | 'analytics' | 'database') => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  needsFocusCount: number;
  username: string;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  needsFocusCount,
  username,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30 shrink-0">
            <GraduationCap className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="whitespace-nowrap">GATE PYQ</span>
              <span className="hidden sm:inline">Tracker</span>
              <span className="hidden md:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                CS &amp; IT
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block">
              Previous Year Questions Practice &amp; Topic Mastery Analytics
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            title="Dashboard"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Dashboard</span>
            {needsFocusCount > 0 && (
              <span
                className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/90 dark:text-red-300 border border-red-300 dark:border-red-800"
                title={`${needsFocusCount} topics need focus`}
              >
                <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {needsFocusCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            title="Practice Quiz"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'quiz'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Practice Quiz</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            title="Database Explorer & SQL"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'database'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">DB &amp; SQL</span>
          </button>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <UserIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="truncate max-w-[80px]">{username}</span>
          </div>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle color theme"
            className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 p-1.5 sm:px-3 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
