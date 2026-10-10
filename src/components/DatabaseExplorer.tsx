import React, { useEffect, useState } from 'react';
import {
  Database,
  Play,
  RefreshCw,
  Table2,
  ExternalLink,
  CheckCircle2,
  HardDrive,
  Code2,
} from 'lucide-react';
import { executeSqlQuery, fetchDbStatus } from '../api/quizApi';
import type { DbStatusResponse, SqlQueryResponse } from '../types/quiz';

const PRESET_QUERIES = [
  {
    label: 'All Subjects Summary',
    sql: 'SELECT subject, COUNT(*) AS total_questions FROM questions GROUP BY subject ORDER BY total_questions DESC',
  },
  {
    label: 'Browse Questions (First 25)',
    sql: 'SELECT id, subject, topic, gate_year, question_text, correct_answer FROM questions ORDER BY id ASC LIMIT 25',
  },
  {
    label: 'My Quiz Attempts',
    sql: 'SELECT id, username, question_id, selected_option, is_correct, attempted_at FROM user_attempts ORDER BY attempted_at DESC LIMIT 25',
  },
  {
    label: 'Registered Users',
    sql: 'SELECT id, username FROM users ORDER BY id ASC',
  },
];

interface DatabaseExplorerProps {
  isActive?: boolean;
}

export const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({ isActive = true }) => {
  const [status, setStatus] = useState<DbStatusResponse | null>(null);
  const [sql, setSql] = useState<string>(PRESET_QUERIES[0].sql);
  const [queryResult, setQueryResult] = useState<SqlQueryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  const loadStatusAndRunQuery = async (queryToRun: string, forceStatusRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [dbStat, res] = await Promise.all([
        fetchDbStatus({ forceRefresh: forceStatusRefresh }),
        executeSqlQuery(queryToRun),
      ]);
      setStatus(dbStat);
      setQueryResult(res);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Unable to execute query. Verify backend is running.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !initialized) {
      setInitialized(true);
      loadStatusAndRunQuery(sql, false);
    }
  }, [isActive, initialized, sql]);

  const handleRunSql = async (customSql?: string) => {
    const targetSql = customSql ?? sql;
    if (customSql) {
      setSql(customSql);
    }
    if (!status) {
      await loadStatusAndRunQuery(targetSql, false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await executeSqlQuery(targetSql);
      setQueryResult(res);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Unable to execute query. Verify backend is running.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshDb = async () => {
    await loadStatusAndRunQuery(sql, true);
  };

  return (
    <div className="space-y-6">
      {/* Live Database Connection Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Live Database &amp; SQL Query Explorer
                {status?.connected && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inspect your live database tables (`questions`, `user_attempts`, `users`) and run SQL queries directly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="http://localhost:8080/h2-console"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Full H2 SQL Console</span>
            </a>
            <button
              type="button"
              onClick={handleRefreshDb}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh DB</span>
            </button>
          </div>
        </div>

        {/* Live Row Counts & Connection Details */}
        {status && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Table: questions</div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {status.totalQuestionsInDb ?? 0} rows
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Extracted from your GATE PDF</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Table: user_attempts</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {status.totalAttemptsInDb ?? 0} rows
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Recorded quiz answers</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Table: users</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {status.totalUsersInDb ?? 0} rows
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Registered login accounts</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5" /> Storage Engine
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                {status.databaseProduct} ({status.connectionMode})
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate" title={status.jdbcUrl}>
                {status.jdbcUrl}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive SQL Query Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Table2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Run SQL Query on Database
          </h3>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleRunSql(preset.sql)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            rows={2}
            className="flex-1 font-mono text-xs sm:text-sm p-3 rounded-xl bg-slate-950 text-emerald-400 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="SELECT * FROM questions LIMIT 20"
          />
          <button
            type="button"
            onClick={() => handleRunSql()}
            disabled={loading}
            className="px-5 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-2 shrink-0"
          >
            <Play className="w-4 h-4" />
            <span>Execute SQL</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-medium text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* SQL Results Table */}
        {queryResult && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing {queryResult.rowCount ?? 0} row(s)
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 sticky top-0">
                  <tr>
                    {queryResult.columns?.map((col) => (
                      <th key={col} className="px-3.5 py-2.5 font-bold border-b border-slate-200 dark:border-slate-700">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {queryResult.rows && queryResult.rows.length > 0 ? (
                    queryResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        {queryResult.columns?.map((col) => {
                          const val = row[col];
                          const formatted =
                            val === null || val === undefined
                              ? 'NULL'
                              : typeof val === 'object'
                              ? JSON.stringify(val)
                              : String(val);
                          return (
                            <td key={col} className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300 max-w-md truncate" title={formatted}>
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={Math.max(queryResult.columns?.length || 1, 1)} className="px-4 py-6 text-center text-slate-400">
                        Query returned 0 rows.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Where Tables Are Defined & Used Reference Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Database Tables &amp; Where They Are Used
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">1. Table: `questions`</div>
            <div><strong>Entity:</strong> `backend/.../entity/Question.java`</div>
            <div><strong>Repository:</strong> `QuestionRepository.java`</div>
            <div><strong>Written By:</strong> `scripts/ingest_gate_pdf.py` &rarr; `POST /api/v1/questions/bulk`</div>
            <div><strong>Read By:</strong> `QuizRunner.tsx` (`GET /api/v1/questions`) &amp; `AnalyticsService.java`</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">2. Table: `user_attempts`</div>
            <div><strong>Entity:</strong> `backend/.../entity/UserAttempt.java`</div>
            <div><strong>Repository:</strong> `UserAttemptRepository.java`</div>
            <div><strong>Written By:</strong> `QuizRunner.tsx` when you click an option &rarr; `POST /api/v1/attempts`</div>
            <div><strong>Read By:</strong> `AnalyticsDashboard.tsx` (`GET /api/v1/analytics/topic-performance`)</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="font-bold text-amber-600 dark:text-amber-400 text-sm">3. Table: `users`</div>
            <div><strong>Entity:</strong> `backend/.../entity/User.java`</div>
            <div><strong>Repository:</strong> `UserRepository.java`</div>
            <div><strong>Written By:</strong> `AuthPage.tsx` Sign Up &rarr; `POST /api/auth/signup`</div>
            <div><strong>Read By:</strong> `AuthPage.tsx` Login &rarr; `POST /api/auth/login`</div>
          </div>
        </div>
      </div>
    </div>
  );
};
