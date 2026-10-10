import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Target,
  TrendingUp,
  Layers,
  Play,
  RefreshCw,
  Clock,
  BarChart2,
  ArrowUpDown,
  AlignLeft,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { TopicPerformance } from '../types/quiz';

interface AnalyticsDashboardProps {
  performanceData: TopicPerformance[];
  loading: boolean;
  onRefresh: () => void;
  onPracticeTopic: (subject: string, topic: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  performanceData,
  loading,
  onRefresh,
  onPracticeTopic,
}) => {
  const [filterType, setFilterType] = useState<'attempted' | 'needsFocus' | 'all'>('attempted');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'accuracy-asc' | 'accuracy-desc' | 'attempts-desc' | 'name'>('accuracy-asc');
  const [chartLayout, setChartLayout] = useState<'horizontal' | 'vertical'>('horizontal');

  const totalTopics = performanceData.length;
  const practicedTopics = performanceData.filter((t) => t.totalAttempts > 0).length;
  const syllabusCoveragePct =
    totalTopics > 0 ? Math.round((practicedTopics / totalTopics) * 100) : 0;

  const totalQuestionsCount = performanceData.reduce((acc, t) => acc + (t.totalQuestions || 0), 0);
  const attemptedQuestionsCount = performanceData.reduce(
    (acc, t) => acc + (t.attemptedQuestions || 0),
    0
  );

  const totalAttemptsSum = performanceData.reduce((acc, t) => acc + t.totalAttempts, 0);
  const totalCorrectSum = performanceData.reduce((acc, t) => acc + t.correctAttempts, 0);
  const overallAccuracy =
    totalAttemptsSum > 0 ? Math.round((totalCorrectSum / totalAttemptsSum) * 1000) / 10 : 0;

  const needsFocusTopics = performanceData
    .filter((t) => t.needsFocus)
    .sort((a, b) => a.accuracyPercentage - b.accuracyPercentage);

  const subjects = useMemo(() => {
    return Array.from(new Set(performanceData.map((p) => p.subject))).filter(Boolean).sort();
  }, [performanceData]);

  const filteredTopics = useMemo(() => {
    return performanceData
      .filter((item) => {
        if (selectedSubject !== 'ALL' && item.subject !== selectedSubject) {
          return false;
        }
        if (filterType === 'attempted' && item.totalAttempts === 0) {
          return false;
        }
        if (filterType === 'needsFocus' && !item.needsFocus) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'accuracy-asc') {
          return a.accuracyPercentage - b.accuracyPercentage || b.totalAttempts - a.totalAttempts;
        }
        if (sortBy === 'accuracy-desc') {
          return b.accuracyPercentage - a.accuracyPercentage || b.totalAttempts - a.totalAttempts;
        }
        if (sortBy === 'attempts-desc') {
          return b.totalAttempts - a.totalAttempts || a.accuracyPercentage - b.accuracyPercentage;
        }
        return a.topic.localeCompare(b.topic);
      });
  }, [performanceData, selectedSubject, filterType, sortBy]);

  const chartData = useMemo(() => {
    return filteredTopics.map((item) => {
      const maxLen = chartLayout === 'horizontal' ? 24 : 14;
      const displayName = item.topic.length > maxLen ? `${item.topic.slice(0, maxLen - 1)}…` : item.topic;

      let fill = '#10b981';
      if (item.totalAttempts === 0) {
        fill = '#94a3b8';
      } else if (item.needsFocus || item.accuracyPercentage < 60) {
        fill = '#ef4444';
      }

      return {
        name: displayName,
        fullTopic: item.topic,
        subject: item.subject,
        accuracy: item.accuracyPercentage,
        attempts: item.totalAttempts,
        correctAttempts: item.correctAttempts,
        needsFocus: item.needsFocus,
        fill,
      };
    });
  }, [filteredTopics, chartLayout]);

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Topic Mastery &amp; &ldquo;Needs Focus&rdquo; Analytics
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Topics with &lt; 60% accuracy and at least 3 attempts are automatically flagged for high-priority revision.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Overall Syllabus Coverage Progress Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Overall GATE Syllabus Coverage
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {practicedTopics} of {totalTopics} syllabus topics practiced
                {totalQuestionsCount > 0 &&
                  ` • ${attemptedQuestionsCount} of ${totalQuestionsCount} unique PYQs attempted`}
              </p>
            </div>
          </div>

          <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {syllabusCoveragePct}%
          </span>
        </div>

        <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${syllabusCoveragePct}%` }}
          />
        </div>

        {/* KPI Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Attempts Logged
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {totalAttemptsSum}
              </p>
            </div>
            <Target className="w-7 h-7 text-indigo-500/70" />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Overall Accuracy
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {overallAccuracy}%
              </p>
            </div>
            <TrendingUp className="w-7 h-7 text-emerald-500/70" />
          </div>

          <div className="p-4 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/70 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                High-Priority Weak Topics
              </span>
              <p className="text-xl font-bold text-red-700 dark:text-red-300 mt-0.5">
                {needsFocusTopics.length} Needs Focus
              </p>
            </div>
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
        </div>
      </div>

      {/* High-Priority "Needs Focus" Weak Topics Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/70 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-red-50/80 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h3 className="text-base font-bold text-red-950 dark:text-red-200">
              High-Priority Weak Topics (&lt; 60% Accuracy, Min 3 Attempts)
            </h3>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
            {needsFocusTopics.length} Flagged
          </span>
        </div>

        <div className="p-6">
          {needsFocusTopics.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No topics currently flagged as &ldquo;Needs Focus&rdquo;!
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Keep practicing PYQs—any topic with at least 3 attempts and accuracy below 60% will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {needsFocusTopics.map((item) => (
                <div
                  key={`${item.subject}-${item.topic}`}
                  className="p-4 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50/30 dark:bg-red-950/20 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {item.subject}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {item.topic}
                        </h4>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-sm shrink-0">
                        <AlertTriangle className="w-3 h-3" />
                        Needs Focus
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">
                          Accuracy: <strong className="text-red-600 dark:text-red-400">{item.accuracyPercentage}%</strong>
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {item.correctAttempts} / {item.totalAttempts} correct
                        </span>
                      </div>
                      <div className="w-full h-2 bg-red-100 dark:bg-red-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 rounded-full"
                          style={{ width: `${Math.min(item.accuracyPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => onPracticeTopic(item.subject, item.topic)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Practice Topic Now</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recharts Topic Accuracy Visualization */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        {/* Header & Legends */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Topic-wise Accuracy Visualization
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dashed red line indicates the 60% mastery threshold. Showing {chartData.length} of {performanceData.length} topics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Needs Focus (&lt;60%)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> On Track (&ge;60%)
            </span>
            {filterType === 'all' && (
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-3 h-3 rounded-sm bg-slate-400 inline-block" /> Unattempted
              </span>
            )}
          </div>
        </div>

        {/* Interactive Controls & Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {/* Quick Filter Mode Pills */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType('attempted')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'attempted'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Attempted ({practicedTopics})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('needsFocus')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'needsFocus'
                  ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Needs Focus ({needsFocusTopics.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Topics ({totalTopics})
            </button>
          </div>

          {/* Subject, Sort & View Mode Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Subject Selector */}
            {subjects.length > 1 && (
              <select
                aria-label="Filter by Subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Selector */}
            <div className="relative inline-flex items-center">
              <select
                aria-label="Sort topics"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="accuracy-asc">Sort: Lowest Accuracy</option>
                <option value="accuracy-desc">Sort: Highest Accuracy</option>
                <option value="attempts-desc">Sort: Most Attempts</option>
                <option value="name">Sort: Topic Name (A-Z)</option>
              </select>
            </div>

            {/* Layout Toggle (Horizontal vs Vertical) */}
            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                title="Horizontal layout (Best for readability)"
                onClick={() => setChartLayout('horizontal')}
                className={`p-1.5 rounded-md transition-all ${
                  chartLayout === 'horizontal'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Vertical layout"
                onClick={() => setChartLayout('vertical')}
                className={`p-1.5 rounded-md transition-all ${
                  chartLayout === 'vertical'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5 rotate-90" />
              </button>
            </div>
          </div>
        </div>

        {/* Chart Body */}
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <BarChart2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {filterType === 'attempted'
                ? 'No topics attempted yet in this selection'
                : filterType === 'needsFocus'
                ? 'No topics flagged as "Needs Focus" in this selection!'
                : 'No topics found matching your criteria'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {filterType === 'attempted'
                ? 'Select "All Topics" to inspect syllabus topics, or start practicing questions to generate your accuracy breakdown.'
                : 'Topics with < 60% accuracy (minimum 3 attempts) will appear here automatically.'}
            </p>
          </div>
        ) : chartLayout === 'horizontal' ? (
          <div className="overflow-y-auto max-h-[460px] pr-2 rounded-lg">
            <div style={{ height: `${Math.max(chartData.length * 36 + 40, 240)}px` }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" opacity={0.2} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl border border-slate-700 space-y-1.5 min-w-[200px]">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              {item.subject}
                            </div>
                            <div className="font-bold text-sm text-slate-100 leading-snug">
                              {item.fullTopic}
                            </div>
                            <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-800">
                              <span className="text-slate-400">Accuracy:</span>
                              <span className={`font-bold ${item.accuracy >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {item.attempts === 0 ? 'Not practiced' : `${item.accuracy}%`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Attempts:</span>
                              <span className="font-medium text-slate-300">
                                {item.correctAttempts} / {item.attempts} correct
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Status:</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.needsFocus
                                    ? 'bg-red-500/20 text-red-300'
                                    : item.attempts === 0
                                    ? 'bg-slate-700 text-slate-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {item.needsFocus
                                  ? 'Needs Focus (<60%)'
                                  : item.attempts === 0
                                  ? 'Not Attempted'
                                  : 'On Track (≥60%)'}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    x={60}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: '60% Target', position: 'top', fill: '#ef4444', fontSize: 11 }}
                  />
                  <Bar dataKey="accuracy" radius={[0, 6, 6, 0]} barSize={18}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2 rounded-lg">
            <div
              style={{
                minWidth: `${Math.max(650, chartData.length * 48)}px`,
                height: '320px',
              }}
              className="w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 12, right: 20, left: 0, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl border border-slate-700 space-y-1.5 min-w-[200px]">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              {item.subject}
                            </div>
                            <div className="font-bold text-sm text-slate-100 leading-snug">
                              {item.fullTopic}
                            </div>
                            <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-800">
                              <span className="text-slate-400">Accuracy:</span>
                              <span className={`font-bold ${item.accuracy >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {item.attempts === 0 ? 'Not practiced' : `${item.accuracy}%`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Attempts:</span>
                              <span className="font-medium text-slate-300">
                                {item.correctAttempts} / {item.attempts} correct
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Status:</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.needsFocus
                                    ? 'bg-red-500/20 text-red-300'
                                    : item.attempts === 0
                                    ? 'bg-slate-700 text-slate-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {item.needsFocus
                                  ? 'Needs Focus (<60%)'
                                  : item.attempts === 0
                                  ? 'Not Attempted'
                                  : 'On Track (≥60%)'}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={60}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: '60% Target', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }}
                  />
                  <Bar dataKey="accuracy" radius={[6, 6, 0, 0]} barSize={22}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Complete Syllabus Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            All Subjects &amp; Topics Performance Matrix
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-6">Subject</th>
                <th className="py-3.5 px-6">Topic</th>
                <th className="py-3.5 px-6 text-center">Attempts</th>
                <th className="py-3.5 px-6 text-center">Correct</th>
                <th className="py-3.5 px-6">Accuracy</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {performanceData.map((row) => (
                <tr
                  key={`${row.subject}-${row.topic}`}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-4 px-6 font-semibold text-slate-900 dark:text-slate-100">
                    {row.subject}
                  </td>
                  <td className="py-4 px-6 text-slate-700 dark:text-slate-300">{row.topic}</td>
                  <td className="py-4 px-6 text-center font-medium text-slate-700 dark:text-slate-300">
                    {row.totalAttempts}
                  </td>
                  <td className="py-4 px-6 text-center font-medium text-slate-700 dark:text-slate-300">
                    {row.correctAttempts}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.needsFocus
                              ? 'bg-red-600'
                              : row.accuracyPercentage >= 60
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(row.accuracyPercentage, 100)}%` }}
                        />
                      </div>
                      <span className="font-semibold text-xs">
                        {row.totalAttempts > 0 ? `${row.accuracyPercentage}%` : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {row.needsFocus ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Needs Focus
                      </span>
                    ) : row.totalAttempts < 3 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {row.totalAttempts === 0 ? 'Not Practiced' : `${3 - row.totalAttempts} more to eval`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mastered
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      type="button"
                      onClick={() => onPracticeTopic(row.subject, row.topic)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Practice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
