import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { QuizRunner } from './components/QuizRunner';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { DatabaseExplorer } from './components/DatabaseExplorer';
import { AuthPage } from './components/AuthPage';
import {
  clearUserCache,
  fetchQuestions,
  fetchTopicPerformance,
  updateTopicPerformanceInCache,
} from './api/quizApi';
import type { Question, TopicPerformance } from './types/quiz';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('username') || 'demo';
  });

  const [activeTab, setActiveTab] = useState<'quiz' | 'analytics' | 'database'>('analytics');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('gate_pyq_theme');
    return saved ? saved === 'dark' : false;
  });

  const [allQuestionsCatalog, setAllQuestionsCatalog] = useState<Question[]>([]);
  const [performanceData, setPerformanceData] = useState<TopicPerformance[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);

  const [quizSubjectFilter, setQuizSubjectFilter] = useState<string>('ALL');
  const [quizTopicFilter, setQuizTopicFilter] = useState<string>('ALL');
  const [practiceTrigger, setPracticeTrigger] = useState<number>(0);

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

  const loadAnalyticsAndCatalog = useCallback(
    async (forceRefresh = false) => {
      if (!isAuthenticated) return;
      setAnalyticsLoading(true);
      try {
        const [questions, perf] = await Promise.all([
          fetchQuestions({ limit: 2500 }),
          fetchTopicPerformance(username, { forceRefresh }),
        ]);
        setAllQuestionsCatalog(questions);
        setPerformanceData(perf);
      } catch {
        // Handled gracefully in child views
      } finally {
        setAnalyticsLoading(false);
      }
    },
    [isAuthenticated, username]
  );

  useEffect(() => {
    loadAnalyticsAndCatalog(false);
  }, [loadAnalyticsAndCatalog]);

  /**
   * Optimistically updates topic performance in local state & cache without hitting GET APIs
   * on every single question attempt.
   */
  const handleAttemptRecorded = useCallback(
    (question: Question, isCorrect: boolean, isFirstAttemptOnQuestion: boolean) => {
      setPerformanceData((prev) => {
        const subj = (question.subject || '').trim();
        const top = (question.topic || '').trim();
        let found = false;

        const updated = prev.map((item) => {
          if (
            item.subject.trim().toLowerCase() === subj.toLowerCase() &&
            item.topic.trim().toLowerCase() === top.toLowerCase()
          ) {
            found = true;
            const totalAttempts = item.totalAttempts + 1;
            const correctAttempts = item.correctAttempts + (isCorrect ? 1 : 0);
            const attemptedQuestions =
              (item.attemptedQuestions || 0) + (isFirstAttemptOnQuestion ? 1 : 0);
            const accuracyPercentage =
              Math.round((correctAttempts * 10000) / totalAttempts) / 100;
            const needsFocus = totalAttempts >= 3 && accuracyPercentage < 60.0;

            return {
              ...item,
              totalAttempts,
              correctAttempts,
              attemptedQuestions,
              accuracyPercentage,
              needsFocus,
            };
          }
          return item;
        });

        if (!found && subj && top) {
          const totalInTopic = allQuestionsCatalog.filter(
            (q) =>
              (q.subject || '').trim().toLowerCase() === subj.toLowerCase() &&
              (q.topic || '').trim().toLowerCase() === top.toLowerCase()
          ).length;
          updated.push({
            subject: subj,
            topic: top,
            totalAttempts: 1,
            correctAttempts: isCorrect ? 1 : 0,
            accuracyPercentage: isCorrect ? 100.0 : 0.0,
            needsFocus: false,
            totalQuestions: totalInTopic || 1,
            attemptedQuestions: 1,
          });
        }

        updateTopicPerformanceInCache(username, updated);
        return updated;
      });
    },
    [allQuestionsCatalog, username]
  );

  const handleManualRefresh = useCallback(() => {
    loadAnalyticsAndCatalog(true);
  }, [loadAnalyticsAndCatalog]);

  const handleLoginSuccess = (loggedInUsername: string) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('username', loggedInUsername);
    setUsername(loggedInUsername);
    setIsAuthenticated(true);
    setActiveTab('analytics');
  };

  const handleLogout = () => {
    clearUserCache(username);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setActiveTab('analytics');
  };

  const handlePracticeTopic = (subject: string, topic: string) => {
    setQuizSubjectFilter(subject);
    setQuizTopicFilter(topic);
    setPracticeTrigger((prev) => prev + 1);
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

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Keep QuizRunner mounted so tab switches do not reset active quiz state or re-fire mount APIs */}
        <div className={activeTab === 'quiz' ? 'block' : 'hidden'}>
          <QuizRunner
            allQuestionsCatalog={allQuestionsCatalog}
            initialSubject={quizSubjectFilter}
            initialTopic={quizTopicFilter}
            practiceTrigger={practiceTrigger}
            username={username}
            onAttemptRecorded={handleAttemptRecorded}
            onNavigateToAnalytics={() => setActiveTab('analytics')}
          />
        </div>

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            performanceData={performanceData}
            loading={analyticsLoading}
            onRefresh={handleManualRefresh}
            onPracticeTopic={handlePracticeTopic}
          />
        )}

        <div className={activeTab === 'database' ? 'block' : 'hidden'}>
          <DatabaseExplorer isActive={activeTab === 'database'} />
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        GATE PYQ Quiz &amp; Topic Mastery Tracker &bull; Logged in as <strong>{username}</strong> &bull; Multi-Tier Cache &amp; Persistent DB Active
      </footer>
    </div>
  );
};

export default App;
