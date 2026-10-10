import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Target,
  TrendingUp,
  Layers,
  Play,
  RefreshCw,
  Clock,
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

  const chartData = performanceData.map((item) => ({
    name: item.topic.length > 18 ? `${item.topic.slice(0, 16)}…` : item.topic,
    fullTopic: item.topic,
    subject: item.subject,
    accuracy: item.accuracyPercentage,
    attempts: item.totalAttempts,
    needsFocus: item.needsFocus,
  }));

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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Topic-wise Accuracy Visualization
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dashed line indicates the 60% mastery threshold. Red bars indicate topics flagged as Needs Focus.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Needs Focus (&lt;60%)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> On Track (&ge;60%)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 12, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#64748b' }}
                interval={0}
                angle={-12}
                textAnchor="end"
              />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                formatter={(value: number) => [`${value}%`, 'Accuracy']}
                labelFormatter={(_, payload) => {
                  if (payload && payload.length > 0) {
                    const item = payload[0].payload;
                    return `${item.subject} — ${item.fullTopic} (${item.attempts} attempts)`;
                  }
                  return '';
                }}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine
                y={60}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: '60% Target', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }}
              />
              <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => {
                  let fill = '#6366f1';
                  if (entry.attempts === 0) {
                    fill = '#94a3b8';
                  } else if (entry.needsFocus || entry.accuracy < 60) {
                    fill = '#ef4444';
                  } else {
                    fill = '#10b981';
                  }
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
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
