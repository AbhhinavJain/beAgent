import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Filter,
  Sparkles,
  BookOpen,
  Calendar,
  Award,
  Eye,
  EyeOff,
  BarChart3,
  Loader2,
  Search,
  X,
  Calculator,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import { SearchableSelect, type SearchableOption } from './SearchableSelect';
import {
  evaluateQuestionAttempt,
  fetchAttemptedQuestionIds,
  fetchQuestions,
  filterQuestionsLocally,
  recordAttempt,
} from '../api/quizApi';
import type { AttemptResponse, Question } from '../types/quiz';

interface QuizRunnerProps {
  allQuestionsCatalog: Question[];
  initialSubject?: string;
  initialTopic?: string;
  practiceTrigger?: number;
  username?: string;
  onAttemptRecorded: (
    question: Question,
    isCorrect: boolean,
    isFirstAttemptOnQuestion: boolean
  ) => void;
  onNavigateToAnalytics: () => void;
}

interface SessionAttemptRecord {
  question: Question;
  selectedOption: string;
  response: AttemptResponse;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  allQuestionsCatalog,
  initialSubject = 'ALL',
  initialTopic = 'ALL',
  practiceTrigger = 0,
  username = 'demo',
  onAttemptRecorded,
  onNavigateToAnalytics,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic);
  const [limit, setLimit] = useState<number>(10);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<'ALL' | 'MCQ' | 'MSQ' | 'NAT'>('ALL');
  const [instantFeedback, setInstantFeedback] = useState<boolean>(true);
  const [attemptFilter, setAttemptFilter] = useState<'unattempted' | 'all' | 'attempted'>('unattempted');
  const [attemptedQuestionIds, setAttemptedQuestionIds] = useState<Set<number>>(new Set());
  const attemptedIdsRef = useRef<Set<number>>(new Set());
  const [idsInitialized, setIdsInitialized] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Answering states for NAT and MSQ
  const [natInput, setNatInput] = useState<string>('');
  const [selectedMsqOptions, setSelectedMsqOptions] = useState<Set<number>>(new Set());

  // Collapsible mobile/phone filter bar state (collapsed on phone/mobile screens by default)
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [attemptResult, setAttemptResult] = useState<AttemptResponse | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionAttemptRecord[]>([]);
  const [isQuizComplete, setIsQuizComplete] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAttemptedIds = useCallback(async () => {
    if (!username) {
      setIdsInitialized(true);
      return;
    }
    try {
      const ids = await fetchAttemptedQuestionIds(username);
      const idSet = new Set(ids);
      attemptedIdsRef.current = idSet;
      setAttemptedQuestionIds(idSet);
    } catch {
      // Graceful fallback
    } finally {
      setIdsInitialized(true);
    }
  }, [username]);

  useEffect(() => {
    setIdsInitialized(false);
    refreshAttemptedIds();
  }, [refreshAttemptedIds]);

  // Sync external subject/topic filter when user clicks "Practice Topic" from Analytics Dashboard
  useEffect(() => {
    if (practiceTrigger > 0) {
      setSelectedSubject(initialSubject);
      setSelectedTopic(initialTopic);
    }
  }, [initialSubject, initialTopic, practiceTrigger]);

  // Available subjects and topics derived from catalog
  const subjects = useMemo(() => {
    const set = new Set<string>();
    allQuestionsCatalog.forEach((q) => {
      if (q.subject) set.add(q.subject);
    });
    return Array.from(set).sort();
  }, [allQuestionsCatalog]);

  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    allQuestionsCatalog
      .filter((q) => selectedSubject === 'ALL' || q.subject === selectedSubject)
      .forEach((q) => {
        if (q.topic) set.add(q.topic);
      });
    return Array.from(set).sort();
  }, [allQuestionsCatalog, selectedSubject]);

  // Question Type counts for currently filtered Subject & Topic
  const typeCounts = useMemo(() => {
    const counts = { ALL: 0, MCQ: 0, MSQ: 0, NAT: 0 };
    const relevant = allQuestionsCatalog.filter((q) => {
      const matchSubject = selectedSubject === 'ALL' || q.subject === selectedSubject;
      const matchTopic = selectedTopic === 'ALL' || q.topic === selectedTopic;
      return matchSubject && matchTopic;
    });
    counts.ALL = relevant.length;
    relevant.forEach((q) => {
      const t = (q.questionType || 'MCQ').toUpperCase();
      if (t in counts) {
        counts[t as keyof typeof counts] += 1;
      }
    });
    return counts;
  }, [allQuestionsCatalog, selectedSubject, selectedTopic]);

  // Searchable Select Options for Subject
  const subjectOptions = useMemo<SearchableOption[]>(() => {
    const options: SearchableOption[] = [
      { value: 'ALL', label: 'All Subjects', count: allQuestionsCatalog.length },
    ];
    subjects.forEach((subj) => {
      const count = allQuestionsCatalog.filter((q) => q.subject === subj).length;
      options.push({ value: subj, label: subj, count });
    });
    return options;
  }, [subjects, allQuestionsCatalog]);

  // Searchable Select Options for Topic
  const topicOptions = useMemo<SearchableOption[]>(() => {
    const relevantQuestions = allQuestionsCatalog.filter(
      (q) => selectedSubject === 'ALL' || q.subject === selectedSubject
    );
    const options: SearchableOption[] = [
      { value: 'ALL', label: 'All Topics', count: relevantQuestions.length },
    ];
    availableTopics.forEach((top) => {
      const count = relevantQuestions.filter((q) => q.topic === top).length;
      options.push({ value: top, label: top, count });
    });
    return options;
  }, [availableTopics, allQuestionsCatalog, selectedSubject]);

  const loadQuizQuestions = useCallback(
    async (
      subj = selectedSubject,
      top = selectedTopic,
      lim = limit,
      filter = attemptFilter,
      search = debouncedSearch,
      qType = questionTypeFilter
    ) => {
      setError(null);

      // Fast path: filter directly from in-memory catalog with 0 API calls!
      if (allQuestionsCatalog.length > 0) {
        const localData = filterQuestionsLocally(allQuestionsCatalog, {
          subject: subj === 'ALL' ? undefined : subj,
          topic: top === 'ALL' ? undefined : top,
          limit: lim,
          attemptedIds: attemptedIdsRef.current,
          unattemptedOnly: filter === 'unattempted',
          attemptedOnly: filter === 'attempted',
          search: search || undefined,
          questionType: qType === 'ALL' ? undefined : qType,
        });
        setQuestions(localData);
        setCurrentIndex(0);
        setSelectedOption(null);
        setNatInput('');
        setSelectedMsqOptions(new Set());
        setAttemptResult(null);
        setSessionHistory([]);
        setIsQuizComplete(false);
        return;
      }

      // Fallback only if catalog hasn't loaded yet
      setLoading(true);
      try {
        const data = await fetchQuestions({
          subject: subj === 'ALL' ? undefined : subj,
          topic: top === 'ALL' ? undefined : top,
          limit: lim,
          username,
          unattemptedOnly: filter === 'unattempted',
          attemptedOnly: filter === 'attempted',
          search: search || undefined,
          questionType: qType === 'ALL' ? undefined : qType,
        });
        setQuestions(data);
        setCurrentIndex(0);
        setSelectedOption(null);
        setNatInput('');
        setSelectedMsqOptions(new Set());
        setAttemptResult(null);
        setSessionHistory([]);
        setIsQuizComplete(false);
      } catch {
        setError('Unable to load questions from backend API. Please verify the Spring Boot server is running.');
      } finally {
        setLoading(false);
      }
    },
    [
      allQuestionsCatalog,
      selectedSubject,
      selectedTopic,
      limit,
      attemptFilter,
      debouncedSearch,
      questionTypeFilter,
      username,
    ]
  );

  useEffect(() => {
    if (!idsInitialized && allQuestionsCatalog.length === 0) {
      return;
    }
    loadQuizQuestions(
      selectedSubject,
      selectedTopic,
      limit,
      attemptFilter,
      debouncedSearch,
      questionTypeFilter
    );
  }, [
    allQuestionsCatalog,
    idsInitialized,
    selectedSubject,
    selectedTopic,
    limit,
    attemptFilter,
    debouncedSearch,
    questionTypeFilter,
    practiceTrigger,
    loadQuizQuestions,
  ]);

  const handleSubjectChange = (newSubject: string) => {
    setSelectedSubject(newSubject);
    setSelectedTopic('ALL');
  };

  const currentQuestion = questions[currentIndex];

  /**
   * Shared optimistic attempt handler: evaluates answer in 0ms on the client,
   * updates UI + analytics immediately, and persists to the server in the background.
   */
  const submitAttemptOptimistically = (answer: string) => {
    if (attemptResult || submitting || !currentQuestion) return;

    setSelectedOption(answer);
    setError(null);

    const isCorrect = evaluateQuestionAttempt(currentQuestion, answer);
    const isFirstAttempt = !attemptedIdsRef.current.has(currentQuestion.id);

    const optimisticResult: AttemptResponse = {
      attemptId: Date.now(),
      questionId: currentQuestion.id,
      selectedOption: answer,
      isCorrect,
      correctAnswer: currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation || '',
      attemptedAt: new Date().toISOString(),
    };

    // 1. Instant 0ms UI update
    setAttemptResult(optimisticResult);
    const nextAttempted = new Set(attemptedIdsRef.current);
    nextAttempted.add(currentQuestion.id);
    attemptedIdsRef.current = nextAttempted;
    setAttemptedQuestionIds(nextAttempted);

    setSessionHistory((prev) => [
      ...prev,
      {
        question: currentQuestion,
        selectedOption: answer,
        response: optimisticResult,
      },
    ]);

    // 2. Instant local analytics update (0 GET requests)
    onAttemptRecorded(currentQuestion, isCorrect, isFirstAttempt);

    // 3. Non-blocking background persistence to backend DB
    recordAttempt({
      questionId: currentQuestion.id,
      selectedOption: answer,
      isCorrect,
      username,
    }).catch(() => {
      // Background sync error is non-disruptive to the active quiz flow
    });
  };

  // MCQ single option click
  const handleOptionSelect = (option: string) => {
    submitAttemptOptimistically(option);
  };

  // NAT numerical submit
  const handleNatSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!natInput.trim() || submitting || attemptResult || !currentQuestion) return;
    submitAttemptOptimistically(natInput.trim());
  };

  // MSQ checkbox toggle
  const toggleMsqOption = (idx: number) => {
    if (attemptResult || submitting) return;
    setSelectedMsqOptions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // MSQ multiple select submit
  const handleMsqSubmit = () => {
    if (selectedMsqOptions.size === 0 || submitting || attemptResult || !currentQuestion) return;
    const letters = Array.from(selectedMsqOptions)
      .sort((a, b) => a - b)
      .map((idx) => String.fromCharCode(65 + idx));
    submitAttemptOptimistically(letters.join(', '));
  };

  const loadQuestionAtIndex = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < questions.length) {
      setCurrentIndex(newIndex);
      const targetQ = questions[newIndex];
      const existing = sessionHistory.find((h) => h.question.id === targetQ.id);
      if (existing) {
        setSelectedOption(existing.selectedOption);
        setAttemptResult(existing.response);
        if (targetQ.questionType === 'NAT') {
          setNatInput(existing.selectedOption);
        }
      } else {
        setSelectedOption(null);
        setNatInput('');
        setSelectedMsqOptions(new Set());
        setAttemptResult(null);
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      loadQuestionAtIndex(currentIndex + 1);
    } else {
      setIsQuizComplete(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentIndex > 0) {
      loadQuestionAtIndex(currentIndex - 1);
    }
  };

  const handleRestartQuiz = () => {
    loadQuizQuestions(selectedSubject, selectedTopic, limit, attemptFilter, debouncedSearch, questionTypeFilter);
  };

  const correctInSession = sessionHistory.filter((h) => h.response.isCorrect).length;
  const sessionAccuracy =
    sessionHistory.length > 0 ? Math.round((correctInSession / sessionHistory.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Subject, Topic, Status & Search Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-5 shadow-sm space-y-3">
        {/* Mobile/Phone Slide Header (Always visible at top of filters) */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsFiltersOpen((prev) => !prev)}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none min-w-0"
          >
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 transition-colors shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Practice Filters &amp; Settings
                </span>
                <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">
                  {isFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </div>
              {/* Active selection pills summary - very useful on mobile phone view */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[120px] sm:max-w-none">
                  {selectedSubject === 'ALL' ? 'All Subjects' : selectedSubject}
                </span>
                <span>&bull;</span>
                <span className="font-medium truncate max-w-[120px] sm:max-w-none">
                  {selectedTopic === 'ALL' ? 'All Topics' : selectedTopic}
                </span>
                <span>&bull;</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  {questionTypeFilter}
                </span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsFiltersOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
            title={isFiltersOpen ? 'Hide filters panel' : 'Slide open filters panel'}
          >
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isFiltersOpen ? 'Hide' : 'Slide Filters'}</span>
          </button>
        </div>

        {/* Collapsible Sliding Container (slides open/closed on phone screens) */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            isFiltersOpen
              ? 'max-h-[1400px] opacity-100 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3 sm:space-y-4 overflow-visible'
              : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'
          }`}
        >
          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions by keyword (e.g. BCNF, degree, deadlock, binary tree, pipeline...)"
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Grid */}
          <div className="relative z-30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Searchable Subject Selector */}
            <SearchableSelect
              id="subject-select"
              label="Subject"
              icon={<Filter className="w-3 h-3 text-indigo-500" />}
              options={subjectOptions}
              value={selectedSubject}
              onChange={handleSubjectChange}
              searchPlaceholder="Search subjects..."
            />

            {/* Searchable Topic Selector */}
            <SearchableSelect
              id="topic-select"
              label="Topic"
              options={topicOptions}
              value={selectedTopic}
              onChange={setSelectedTopic}
              searchPlaceholder="Search topics..."
            />

            {/* Attempt Status Selector */}
            <div className="flex flex-col min-w-0">
              <label htmlFor="attempt-filter-select" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Question Status
              </label>
              <select
                id="attempt-filter-select"
                value={attemptFilter}
                onChange={(e) => setAttemptFilter(e.target.value as 'unattempted' | 'all' | 'attempted')}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate"
              >
                <option value="unattempted">Unattempted Only (Recommended)</option>
                <option value="all">All Questions</option>
                <option value="attempted">Attempted Only</option>
              </select>
            </div>

            {/* Limit Selector */}
            <div className="flex flex-col min-w-0">
              <label htmlFor="limit-select" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Question Count
              </label>
              <select
                id="limit-select"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate"
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={25}>25 Questions</option>
                <option value={50}>50 Questions</option>
              </select>
            </div>
          </div>

          {/* Question Type Filter Pills (All Types, MCQ, MSQ, NAT) */}
          <div className="relative z-10 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-indigo-500" />
              <span>Question Type:</span>
            </span>
            {(['ALL', 'MCQ', 'MSQ', 'NAT'] as const).map((type) => {
              const count = typeCounts[type];
              const isSelected = questionTypeFilter === type;
              const typeLabels: Record<string, string> = {
                ALL: 'All Types',
                MCQ: 'MCQ (Single-Choice)',
                MSQ: 'MSQ (Multi-Select)',
                NAT: 'NAT (Numerical)',
              };
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setQuestionTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? type === 'NAT'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : type === 'MSQ'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{typeLabels[type]}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Actions Row */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setInstantFeedback((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  instantFeedback
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {instantFeedback ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Feedback: {instantFeedback ? 'ON' : 'OFF'}</span>
              </button>

              {(selectedSubject !== 'ALL' || selectedTopic !== 'ALL' || attemptFilter !== 'unattempted' || questionTypeFilter !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject('ALL');
                    setSelectedTopic('ALL');
                    setAttemptFilter('unattempted');
                    setQuestionTypeFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium px-1"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleRestartQuiz}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading or Error States */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Loading GATE PYQ questions...
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-800 p-6 text-center">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => loadQuizQuestions(selectedSubject, selectedTopic, limit, attemptFilter, debouncedSearch)}
            className="mt-3 px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
          >
            Retry Connection
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {searchQuery
              ? `No questions found matching "${searchQuery}"`
              : attemptFilter === 'unattempted'
              ? 'All questions in this selection have already been attempted!'
              : 'No questions match the selected filter'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            {searchQuery
              ? 'Try searching with another keyword (e.g. relation, SQL, graph, cache), or clear search.'
              : attemptFilter === 'unattempted'
              ? 'Awesome job! You have attempted every question for this filter. Switch to All Questions to practice again, or pick another subject/topic.'
              : 'Try selecting "All Subjects" or "All Topics" to practice more GATE questions.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 pt-2">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
              >
                Clear Search
              </button>
            )}
            {attemptFilter === 'unattempted' && !searchQuery && (
              <button
                type="button"
                onClick={() => setAttemptFilter('all')}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
              >
                Practice All Questions (Include Attempted)
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedSubject('ALL');
                setSelectedTopic('ALL');
                setAttemptFilter('unattempted');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : isQuizComplete ? (
        /* Test Summary Flow */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Practice Session Complete!
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  All attempts have been saved to your topic mastery profile.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => loadQuizQuestions(selectedSubject, selectedTopic, limit)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Practice Again</span>
              </button>
              <button
                type="button"
                onClick={onNavigateToAnalytics}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span>View Needs Focus Tracker</span>
              </button>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Questions Attempted
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {sessionHistory.length} / {questions.length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Correct Answers
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {correctInSession}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900">
              <div className="text-xs font-medium text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                Session Accuracy
              </div>
              <div className="mt-1 text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {sessionAccuracy}%
              </div>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Session Review &amp; Explanations
            </h3>
            {sessionHistory.map((item, idx) => (
              <div
                key={`${item.question.id}-${idx}`}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {item.question.subject} &bull; {item.question.topic}
                    </span>
                    {item.question.gateYear && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-medium">
                        GATE {item.question.gateYear}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold">
                      {item.question.questionType || 'MCQ'}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      item.response.isCorrect
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    {item.response.isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Incorrect
                      </>
                    )}
                  </span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                  {item.question.questionText}
                </p>
                <div className="flex flex-wrap gap-4 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Your Answer: </span>
                    <span
                      className={
                        item.response.isCorrect
                          ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                          : 'font-semibold text-red-600 dark:text-red-400'
                      }
                    >
                      {item.selectedOption}
                    </span>
                  </div>
                  {!item.response.isCorrect && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Correct Answer: </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.response.correctAnswer}
                      </span>
                    </div>
                  )}
                </div>
                {item.response.explanation && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 mt-2">
                    <strong className="text-slate-800 dark:text-slate-200">Explanation: </strong>
                    {item.response.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Active Question Card */
        currentQuestion && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Progress Header */}
            <div className="px-3.5 py-3 sm:px-6 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 space-y-2 sm:space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white whitespace-nowrap">
                    Q {currentIndex + 1} of {questions.length}
                  </span>
                  {attemptedQuestionIds.has(currentQuestion.id) ? (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 whitespace-nowrap">
                      Attempted
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 whitespace-nowrap">
                      Unattempted
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {currentQuestion.gateYear && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold whitespace-nowrap">
                      <Calendar className="w-3 h-3" />
                      GATE {currentQuestion.gateYear}
                    </span>
                  )}
                  <span className="bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md whitespace-nowrap text-[11px] sm:text-xs">
                    Score: {correctInSession}/{sessionHistory.length}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded-md font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 truncate max-w-[200px]">
                  {currentQuestion.subject}
                </span>
                <span className="px-2 py-0.5 rounded-md font-medium bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                  {currentQuestion.topic}
                </span>
                <span className="px-2 py-0.5 rounded-md font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {currentQuestion.questionType || 'MCQ'}
                </span>
                {currentQuestion.hasImage && (
                  <span className="px-2 py-0.5 rounded-md font-medium bg-purple-100 dark:purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    📊 Visual
                  </span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question Body */}
            <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
              <div className="text-sm sm:text-lg font-medium leading-relaxed text-slate-900 dark:text-slate-100">
                {currentQuestion.questionText}
              </div>

              {currentQuestion.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 flex justify-center">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Question diagram"
                    className="max-h-72 object-contain"
                  />
                </div>
              )}

              {/* Question Options / Input Area by Type */}
              {currentQuestion.questionType === 'NAT' || (currentQuestion.options && currentQuestion.options.length === 0) ? (
                /* NAT (Numerical Answer Type) */
                <form onSubmit={handleNatSubmit} className="space-y-4">
                  <div className="p-5 sm:p-6 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <label className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        Numerical Answer Type (NAT)
                      </label>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Enter numerical value (e.g. 19, 0.25, -5)
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="text"
                        disabled={Boolean(attemptResult) || submitting}
                        value={natInput}
                        onChange={(e) => setNatInput(e.target.value)}
                        placeholder="Type numerical answer..."
                        className="flex-1 px-4 py-3 rounded-xl text-base sm:text-lg font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 shadow-inner"
                      />
                      {!attemptResult && (
                        <button
                          type="submit"
                          disabled={!natInput.trim() || submitting}
                          className="px-6 py-3 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit NAT Answer'}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              ) : currentQuestion.questionType === 'MSQ' ? (
                /* MSQ (Multiple Select Question) */
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 px-1 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Multiple Select Question (One or more options may be correct)
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-normal">
                      Select all correct options, then click submit
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((option, idx) => {
                      const optionLabel = String.fromCharCode(65 + idx);
                      const isChecked = selectedMsqOptions.has(idx);
                      const showFeedback = Boolean(attemptResult) && instantFeedback;
                      const correctLetters = attemptResult?.correctAnswer
                        ? attemptResult.correctAnswer.toUpperCase().split(/[\s,]+/).filter(Boolean)
                        : [];
                      const isThisOptionCorrect = correctLetters.includes(optionLabel);

                      let buttonStyle =
                        'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500';
                      let badgeStyle =
                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';

                      if (showFeedback) {
                        if (isThisOptionCorrect && isChecked) {
                          buttonStyle =
                            'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500';
                          badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
                        } else if (isThisOptionCorrect && !isChecked) {
                          buttonStyle =
                            'border-emerald-400/80 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 border-dashed';
                          badgeStyle = 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950';
                        } else if (!isThisOptionCorrect && isChecked) {
                          buttonStyle =
                            'border-red-500 bg-red-50/80 dark:bg-red-950/40 text-red-950 dark:text-red-100 ring-1 ring-red-500';
                          badgeStyle = 'bg-red-600 text-white border-red-600';
                        } else {
                          buttonStyle =
                            'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50 dark:bg-slate-900';
                        }
                      } else if (isChecked) {
                        buttonStyle =
                          'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-600';
                        badgeStyle = 'bg-blue-600 text-white border-blue-600';
                      }

                      return (
                        <button
                          key={`${currentQuestion.id}-msq-${idx}`}
                          type="button"
                          disabled={Boolean(attemptResult) || submitting}
                          onClick={() => toggleMsqOption(idx)}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start sm:items-center justify-between gap-3 ${buttonStyle}`}
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <span
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border text-xs sm:text-sm font-bold flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-colors ${badgeStyle}`}
                            >
                              {optionLabel}
                            </span>
                            <span className="text-sm sm:text-base font-medium break-words leading-relaxed">
                              {option}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {showFeedback && isThisOptionCorrect && isChecked && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                            {showFeedback && !isThisOptionCorrect && isChecked && (
                              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                            )}
                            {showFeedback && isThisOptionCorrect && !isChecked && (
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                                Missed
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {!attemptResult && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        disabled={selectedMsqOptions.size === 0 || submitting}
                        onClick={handleMsqSubmit}
                        className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2"
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          `Submit MSQ Answer (${selectedMsqOptions.size} selected)`
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* MCQ Single-Select Options */
                <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-label="Question Options">
                  {currentQuestion.options.map((option, idx) => {
                    const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D
                    const isSelected = selectedOption === option;
                    const showFeedback = Boolean(attemptResult) && instantFeedback;
                    const isRightOption =
                      attemptResult &&
                      option.trim().toLowerCase() === attemptResult.correctAnswer.trim().toLowerCase();
                    const isWrongSelected = showFeedback && isSelected && !attemptResult?.isCorrect;

                    let buttonStyle =
                      'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 bg-white dark:bg-slate-900';
                    let badgeStyle =
                      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';

                    if (showFeedback) {
                      if (isRightOption) {
                        buttonStyle =
                          'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500';
                        badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
                      } else if (isWrongSelected) {
                        buttonStyle =
                          'border-red-500 bg-red-50/80 dark:bg-red-950/40 text-red-950 dark:text-red-100 ring-1 ring-red-500';
                        badgeStyle = 'bg-red-600 text-white border-red-600';
                      } else {
                        buttonStyle =
                          'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50 dark:bg-slate-900';
                      }
                    } else if (isSelected) {
                      buttonStyle =
                        'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-600';
                      badgeStyle = 'bg-indigo-600 text-white border-indigo-600';
                    }

                    return (
                      <button
                        key={`${currentQuestion.id}-opt-${idx}`}
                        type="button"
                        disabled={Boolean(attemptResult) || submitting}
                        onClick={() => handleOptionSelect(option)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start sm:items-center justify-between gap-3 ${buttonStyle}`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <span
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border text-xs sm:text-sm font-bold flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-colors ${badgeStyle}`}
                          >
                            {optionLabel}
                          </span>
                          <span className="text-sm sm:text-base font-medium break-words leading-relaxed">
                            {option}
                          </span>
                        </div>

                        {showFeedback && isRightOption && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        {showFeedback && isWrongSelected && (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Instant Feedback Explanation Box */}
              {attemptResult && instantFeedback && (
                <div
                  className={`p-5 rounded-xl border space-y-2 transition-all ${
                    attemptResult.isCorrect
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80'
                      : 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {attemptResult.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                    <span
                      className={`text-sm font-bold ${
                        attemptResult.isCorrect
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-red-800 dark:text-red-300'
                      }`}
                    >
                      {attemptResult.isCorrect
                        ? 'Correct Answer! Well done.'
                        : `Incorrect. Correct Answer: ${attemptResult.correctAnswer}`}
                    </span>
                  </div>

                  {attemptResult.explanation && (
                    <div className="pt-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-1" />
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Solution Explanation:{' '}
                        </span>
                        {attemptResult.explanation}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recorded Confirmation when Instant Feedback is OFF */}
              {attemptResult && !instantFeedback && (
                <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                  <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                    Answer recorded! Full solution and accuracy will be shown in the session summary.
                  </span>
                  <button
                    type="button"
                    onClick={() => setInstantFeedback(true)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 underline"
                  >
                    Reveal Now
                  </button>
                </div>
              )}

              {/* Footer Action Bar */}
              <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {currentIndex > 0 && (
                    <button
                      type="button"
                      onClick={handlePreviousQuestion}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {attemptResult
                      ? 'Attempt recorded! Proceed when ready.'
                      : 'Unanswered. You can answer now or skip to next.'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer ${
                      attemptResult
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                        : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span>
                      {currentIndex + 1 < questions.length
                        ? attemptResult
                          ? 'Next Question'
                          : 'Skip / Next Question'
                        : 'Finish & View Summary'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
