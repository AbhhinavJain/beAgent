import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
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
} from 'lucide-react';
import { fetchQuestions, recordAttempt } from '../api/quizApi';
import type { AttemptResponse, Question } from '../types/quiz';

interface QuizRunnerProps {
  allQuestionsCatalog: Question[];
  initialSubject?: string;
  initialTopic?: string;
  username?: string;
  onAttemptRecorded: () => void;
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
  username = 'demo',
  onAttemptRecorded,
  onNavigateToAnalytics,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic);
  const [limit, setLimit] = useState<number>(10);
  const [instantFeedback, setInstantFeedback] = useState<boolean>(true);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [attemptResult, setAttemptResult] = useState<AttemptResponse | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionAttemptRecord[]>([]);
  const [isQuizComplete, setIsQuizComplete] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync external subject/topic filter when user clicks "Practice Topic" from Analytics Dashboard
  useEffect(() => {
    setSelectedSubject(initialSubject);
    setSelectedTopic(initialTopic);
  }, [initialSubject, initialTopic]);

  // Available subjects and topics derived from catalog
  const subjects = useMemo(() => {
    const set = new Set<string>();
    allQuestionsCatalog.forEach((q) => set.add(q.subject));
    return Array.from(set).sort();
  }, [allQuestionsCatalog]);

  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    allQuestionsCatalog
      .filter((q) => selectedSubject === 'ALL' || q.subject === selectedSubject)
      .forEach((q) => set.add(q.topic));
    return Array.from(set).sort();
  }, [allQuestionsCatalog, selectedSubject]);

  const loadQuizQuestions = async (subj = selectedSubject, top = selectedTopic, lim = limit) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuestions({
        subject: subj === 'ALL' ? undefined : subj,
        topic: top === 'ALL' ? undefined : top,
        limit: lim,
      });
      setQuestions(data);
      setCurrentIndex(0);
      setSelectedOption(null);
      setAttemptResult(null);
      setSessionHistory([]);
      setIsQuizComplete(false);
    } catch (err) {
      setError('Unable to load questions from backend API. Please verify the Spring Boot server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizQuestions(selectedSubject, selectedTopic, limit);
  }, [selectedSubject, selectedTopic, limit]);

  const handleSubjectChange = (newSubject: string) => {
    setSelectedSubject(newSubject);
    setSelectedTopic('ALL');
  };

  const currentQuestion = questions[currentIndex];

  const handleOptionSelect = async (option: string) => {
    if (attemptResult || submitting || !currentQuestion) {
      return;
    }
    setSelectedOption(option);
    setSubmitting(true);
    try {
      const result = await recordAttempt({
        questionId: currentQuestion.id,
        selectedOption: option,
        username,
      });
      setAttemptResult(result);
      setSessionHistory((prev) => [
        ...prev,
        {
          question: currentQuestion,
          selectedOption: option,
          response: result,
        },
      ]);
      onAttemptRecorded();
    } catch (err) {
      setError('Failed to save attempt to the database. Please check backend connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setAttemptResult(null);
    } else {
      setIsQuizComplete(true);
    }
  };

  const correctInSession = sessionHistory.filter((h) => h.response.isCorrect).length;
  const sessionAccuracy =
    sessionHistory.length > 0 ? Math.round((correctInSession / sessionHistory.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Subject & Topic Selection Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mr-1">
              <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Filter PYQs:</span>
            </div>

            {/* Subject Selector */}
            <div className="flex flex-col">
              <label htmlFor="subject-select" className="sr-only">
                Subject
              </label>
              <select
                id="subject-select"
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Subjects ({allQuestionsCatalog.length})</option>
                {subjects.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Selector */}
            <div className="flex flex-col">
              <label htmlFor="topic-select" className="sr-only">
                Topic
              </label>
              <select
                id="topic-select"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Topics ({availableTopics.length})</option>
                {availableTopics.map((top) => (
                  <option key={top} value={top}>
                    {top}
                  </option>
                ))}
              </select>
            </div>

            {/* Limit Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="limit-select" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Limit:
              </label>
              <select
                id="limit-select"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-2.5 py-2 rounded-xl text-sm font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={5}>5 Qs</option>
                <option value={10}>10 Qs</option>
                <option value={25}>25 Qs</option>
                <option value={50}>50 Qs</option>
              </select>
            </div>
          </div>

          {/* Instant Feedback Toggle & Reset */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setInstantFeedback((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                instantFeedback
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {instantFeedback ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Instant Feedback: {instantFeedback ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => loadQuizQuestions(selectedSubject, selectedTopic, limit)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
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
            onClick={() => loadQuizQuestions()}
            className="mt-3 px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
          >
            Retry Connection
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No questions match the selected filter
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Try selecting &ldquo;All Subjects&rdquo; or &ldquo;All Topics&rdquo; to practice more GATE questions.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedSubject('ALL');
              setSelectedTopic('ALL');
            }}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Reset Filters
          </button>
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
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {currentQuestion.subject}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {currentQuestion.topic}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {currentQuestion.gateYear && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    <Calendar className="w-3.5 h-3.5" />
                    GATE {currentQuestion.gateYear}
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Score: {correctInSession}/{sessionHistory.length}
                </span>
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
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-base sm:text-lg font-medium leading-relaxed text-slate-900 dark:text-slate-100">
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

              {/* 4 Radio/Button Options */}
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
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${buttonStyle}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-8 h-8 rounded-lg border text-sm font-bold flex items-center justify-center shrink-0 transition-colors ${badgeStyle}`}
                        >
                          {optionLabel}
                        </span>
                        <span className="text-sm sm:text-base font-medium">{option}</span>
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
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {attemptResult
                    ? 'Attempt persisted to user_attempts table.'
                    : 'Select an option above to submit your attempt.'}
                </span>

                <button
                  type="button"
                  disabled={!attemptResult}
                  onClick={handleNextQuestion}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    attemptResult
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 cursor-pointer'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <span>
                    {currentIndex + 1 < questions.length ? 'Next Question' : 'Finish & View Summary'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
