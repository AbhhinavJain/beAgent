import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { QuizRunner } from './components/QuizRunner';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { DatabaseExplorer } from './components/DatabaseExplorer';
import { AuthPage } from './components/AuthPage';
import { fetchQuestions, fetchTopicPerformance } from './api/quizApi';
import type { Question, TopicPerformance } from './types/quiz';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('username') || 'demo';
  });

  const [activeTab, setActiveTab] = useState<'quiz' | 'analytics' | 'database'>('quiz');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('gate_pyq_theme');
    return saved ? saved === 'dark' : false;
  });

  const [allQuestionsCatalog, setAllQuestionsCatalog] = useState<Question[]>([]);
  const [performanceData, setPerformanceData] = useState<TopicPerformance[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);

  const [quizSubjectFilter, setQuizSubjectFilter] = useState<string>('ALL');
  const [quizTopicFilter, setQuizTopicFilter] = useState<string>('ALL');

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('gate_pyq_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('gate_pyq_theme', 'light');
    }
  }, [darkMode]);

  const loadAnalyticsAndCatalog = useCallback(async () => {
    if (!isAuthenticated) return;
    setAnalyticsLoading(true);
    try {
      const [questions, perf] = await Promise.all([
        fetchQuestions({ limit: 1000 }),
        fetchTopicPerformance(username),
      ]);
      setAllQuestionsCatalog(questions);
      setPerformanceData(perf);
    } catch (err) {
      // Handled gracefully in child views
    } finally {
      setAnalyticsLoading(false);
    }
  }, [isAuthenticated, username]);

  useEffect(() => {
    loadAnalyticsAndCatalog();
  }, [loadAnalyticsAndCatalog]);

  const handleLoginSuccess = (loggedInUsername: string) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('username', loggedInUsername);
    setUsername(loggedInUsername);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
  };

  const handlePracticeTopic = (subject: string, topic: string) => {
    setQuizSubjectFilter(subject);
    setQuizTopicFilter(topic);
    setActiveTab('quiz');
  };

  if (!isAuthenticated) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  const needsFocusCount = performanceData.filter((t) => t.needsFocus).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        needsFocusCount={needsFocusCount}
        username={username}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'quiz' && (
          <QuizRunner
            allQuestionsCatalog={allQuestionsCatalog}
            initialSubject={quizSubjectFilter}
            initialTopic={quizTopicFilter}
            username={username}
            onAttemptRecorded={loadAnalyticsAndCatalog}
            onNavigateToAnalytics={() => setActiveTab('analytics')}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            performanceData={performanceData}
            loading={analyticsLoading}
            onRefresh={loadAnalyticsAndCatalog}
            onPracticeTopic={handlePracticeTopic}
          />
        )}
        {activeTab === 'database' && <DatabaseExplorer />}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        GATE PYQ Quiz &amp; Topic Mastery Tracker &bull; Logged in as <strong>{username}</strong> &bull; Persistent DB + Local Emergency Backup Active
      </footer>
    </div>
  );
};

export default App;
