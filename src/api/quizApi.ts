import axios from 'axios';
import type {
  AttemptRequest,
  AttemptResponse,
  AuthResponse,
  DbStatusResponse,
  Question,
  SqlQueryResponse,
  TopicPerformance,
} from '../types/quiz';

const RAW_HOST = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (RAW_HOST ? `${RAW_HOST}/api/v1` : '/api/v1');
const AUTH_BASE_URL = RAW_HOST ? `${RAW_HOST}/api/auth` : '/api/auth';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ============================================================================
// Client-Side Multi-Tier Cache & Request Deduplication Layer
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CATALOG_STORAGE_KEY = 'gate_pyq_catalog_cache_v1';
const CATALOG_TTL_MS = 30 * 60 * 1000; // 30 minutes
const USER_DATA_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DB_STATUS_TTL_MS = 60 * 1000; // 60 seconds

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function getFromMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setInMemoryCache<T>(key: string, data: T, ttlMs: number): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

function getCatalogFromStorage(): Question[] | null {
  try {
    const raw = sessionStorage.getItem(CATALOG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<Question[]>;
    if (!parsed || !Array.isArray(parsed.data) || Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(CATALOG_STORAGE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function saveCatalogToStorage(questions: Question[]): void {
  try {
    const entry: CacheEntry<Question[]> = {
      data: questions,
      expiresAt: Date.now() + CATALOG_TTL_MS,
    };
    sessionStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Deduplicates concurrent identical requests so only 1 network call is made.
 */
async function deduplicatedRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

export function clearUserCache(username?: string): void {
  if (username) {
    const clean = username.trim().toLowerCase();
    memoryCache.delete(`attemptedIds:${clean}`);
    memoryCache.delete(`topicPerformance:${clean}`);
  } else {
    memoryCache.clear();
  }
}

export function markQuestionAttemptedInCache(username: string, questionId: number): void {
  if (!username) return;
  const key = `attemptedIds:${username.trim().toLowerCase()}`;
  const current = getFromMemoryCache<number[]>(key);
  if (current && !current.includes(questionId)) {
    setInMemoryCache(key, [...current, questionId], USER_DATA_TTL_MS);
  }
}

export function updateTopicPerformanceInCache(username: string, data: TopicPerformance[]): void {
  const key = `topicPerformance:${(username || 'GLOBAL').trim().toLowerCase()}`;
  setInMemoryCache(key, data, USER_DATA_TTL_MS);
}

// ============================================================================
// Pure Client-Side Filtering & Answer Evaluation Helpers
// ============================================================================

export function filterQuestionsLocally(
  catalog: Question[],
  params: {
    subject?: string;
    topic?: string;
    limit?: number;
    attemptedIds?: Set<number>;
    unattemptedOnly?: boolean;
    attemptedOnly?: boolean;
    search?: string;
    questionType?: string;
  }
): Question[] {
  const pageSize = params.limit && params.limit > 0 ? Math.min(params.limit, 2500) : 50;
  const hasSubject = Boolean(params.subject && params.subject !== 'ALL');
  const hasTopic = Boolean(params.topic && params.topic !== 'ALL');
  const hasType = Boolean(params.questionType && params.questionType !== 'ALL');
  const cleanSearch = params.search ? params.search.trim().toLowerCase() : '';
  const hasSearch = cleanSearch.length > 0;

  const cleanSubject = hasSubject ? params.subject!.trim().toLowerCase() : '';
  const cleanTopic = hasTopic ? params.topic!.trim().toLowerCase() : '';
  const cleanType = hasType ? params.questionType!.trim().toUpperCase() : '';

  const results: Question[] = [];
  for (let i = 0; i < catalog.length; i++) {
    const q = catalog[i];

    if (hasSubject && (q.subject || '').trim().toLowerCase() !== cleanSubject) {
      continue;
    }
    if (hasTopic && (q.topic || '').trim().toLowerCase() !== cleanTopic) {
      continue;
    }
    if (params.attemptedIds) {
      if (params.unattemptedOnly && params.attemptedIds.has(q.id)) {
        continue;
      }
      if (params.attemptedOnly && !params.attemptedIds.has(q.id)) {
        continue;
      }
    }
    if (hasType) {
      const qType = (q.questionType || 'MCQ').toUpperCase();
      if (qType !== cleanType) {
        continue;
      }
    }
    if (hasSearch) {
      const qText = (q.questionText || '').toLowerCase();
      const qTopic = (q.topic || '').toLowerCase();
      const qSubj = (q.subject || '').toLowerCase();
      const qYear = q.gateYear ? String(q.gateYear) : '';
      const matchesOption =
        Array.isArray(q.options) &&
        q.options.some((opt) => opt && opt.toLowerCase().includes(cleanSearch));

      if (
        !qText.includes(cleanSearch) &&
        !qTopic.includes(cleanSearch) &&
        !qSubj.includes(cleanSearch) &&
        !qYear.includes(cleanSearch) &&
        !matchesOption
      ) {
        continue;
      }
    }

    results.push(q);
    if (results.length >= pageSize) {
      break;
    }
  }

  return results;
}

/**
 * Evaluates a user's selected answer on the client using the exact same rules as the backend.
 */
export function evaluateQuestionAttempt(question: Question, selectedOption: string): boolean {
  if (!selectedOption || !selectedOption.trim()) {
    return false;
  }
  const correct = (question.correctAnswer || '').trim();
  const selected = selectedOption.trim();
  const qType = (question.questionType || 'MCQ').toUpperCase();

  if (correct.toLowerCase() === selected.toLowerCase()) {
    return true;
  }

  if (qType === 'NAT') {
    const selectedVal = Number(selected);
    if (!Number.isNaN(selectedVal)) {
      if (correct.includes('to') || (correct.includes('-') && !correct.startsWith('-'))) {
        const parts = correct.split(/to|-/);
        if (parts.length === 2) {
          const min = Number(parts[0].trim());
          const max = Number(parts[1].trim());
          if (!Number.isNaN(min) && !Number.isNaN(max)) {
            return selectedVal >= min - 1e-4 && selectedVal <= max + 1e-4;
          }
        }
      }
      const correctVal = Number(correct);
      if (!Number.isNaN(correctVal)) {
        return Math.abs(selectedVal - correctVal) < 1e-3;
      }
    }
    return correct.toLowerCase() === selected.toLowerCase();
  }

  if (qType === 'MSQ') {
    const parseLetters = (text: string) =>
      Array.from(
        new Set(
          text
            .split(/[,\s]+/)
            .map((t) => t.trim().toUpperCase())
            .filter(Boolean)
        )
      ).sort();
    const correctSet = parseLetters(correct);
    const selectedSet = parseLetters(selected);
    return (
      correctSet.length > 0 &&
      correctSet.length === selectedSet.length &&
      correctSet.every((val, idx) => val === selectedSet[idx])
    );
  }

  const options = question.options || [];
  if (options.length > 0) {
    if (correct.length === 1 && /^[a-zA-Z]$/.test(correct)) {
      const idx = correct.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length && options[idx].trim().toLowerCase() === selected.toLowerCase()) {
        return true;
      }
    }
    if (selected.length === 1 && /^[a-zA-Z]$/.test(selected)) {
      const idx = selected.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length && options[idx].trim().toLowerCase() === correct.toLowerCase()) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================================
// REST API Functions (Backed by Cache & Deduplication)
// ============================================================================

export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(`${AUTH_BASE_URL}/login`, {
    username,
    password,
  });
  return response.data;
}

export async function signupUser(username: string, password: string): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(`${AUTH_BASE_URL}/signup`, {
    username,
    password,
  });
  return response.data;
}

export async function fetchQuestions(
  params?: {
    subject?: string;
    topic?: string;
    limit?: number;
    username?: string;
    unattemptedOnly?: boolean;
    attemptedOnly?: boolean;
    search?: string;
    questionType?: string;
  },
  options?: { forceRefresh?: boolean }
): Promise<Question[]> {
  const isFullCatalogRequest =
    (!params?.subject || params.subject === 'ALL') &&
    (!params?.topic || params.topic === 'ALL') &&
    !params?.unattemptedOnly &&
    !params?.attemptedOnly &&
    !params?.search &&
    (!params?.questionType || params.questionType === 'ALL') &&
    (params?.limit ?? 0) >= 2000;

  const catalogCacheKey = 'questionsCatalog:ALL';

  // 1. Check if full catalog is already cached in memory or sessionStorage
  if (!options?.forceRefresh) {
    let cachedCatalog = getFromMemoryCache<Question[]>(catalogCacheKey);
    if (!cachedCatalog) {
      cachedCatalog = getCatalogFromStorage();
      if (cachedCatalog && cachedCatalog.length > 0) {
        setInMemoryCache(catalogCacheKey, cachedCatalog, CATALOG_TTL_MS);
      }
    }

    if (cachedCatalog && cachedCatalog.length > 0) {
      if (isFullCatalogRequest) {
        return cachedCatalog;
      }
      // Serve filtered questions directly from cached catalog in memory!
      let attemptedSet: Set<number> | undefined;
      if (params?.username && (params.unattemptedOnly || params.attemptedOnly)) {
        const ids = await fetchAttemptedQuestionIds(params.username);
        attemptedSet = new Set(ids);
      }
      return filterQuestionsLocally(cachedCatalog, {
        ...params,
        attemptedIds: attemptedSet,
      });
    }
  }

  const queryParams: Record<string, string | number | boolean> = {};
  if (params?.subject && params.subject !== 'ALL') {
    queryParams.subject = params.subject;
  }
  if (params?.topic && params.topic !== 'ALL') {
    queryParams.topic = params.topic;
  }
  if (params?.limit) {
    queryParams.limit = params.limit;
  }
  if (params?.username) {
    queryParams.username = params.username;
  }
  if (params?.unattemptedOnly !== undefined) {
    queryParams.unattemptedOnly = params.unattemptedOnly;
  }
  if (params?.attemptedOnly !== undefined) {
    queryParams.attemptedOnly = params.attemptedOnly;
  }
  if (params?.search && params.search.trim()) {
    queryParams.search = params.search.trim();
  }
  if (params?.questionType && params.questionType !== 'ALL') {
    queryParams.questionType = params.questionType;
  }

  const requestKey = isFullCatalogRequest
    ? catalogCacheKey
    : `questions:${JSON.stringify(queryParams)}`;

  return deduplicatedRequest(requestKey, async () => {
    const response = await apiClient.get<Question[]>('/questions', {
      params: queryParams,
    });
    const data = response.data;
    if (isFullCatalogRequest && Array.isArray(data) && data.length > 0) {
      setInMemoryCache(catalogCacheKey, data, CATALOG_TTL_MS);
      saveCatalogToStorage(data);
    }
    return data;
  });
}

export async function fetchAttemptedQuestionIds(
  username: string,
  options?: { forceRefresh?: boolean }
): Promise<number[]> {
  if (!username) return [];
  const cacheKey = `attemptedIds:${username.trim().toLowerCase()}`;

  if (!options?.forceRefresh) {
    const cached = getFromMemoryCache<number[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  return deduplicatedRequest(cacheKey, async () => {
    const response = await apiClient.get<number[]>('/attempts/user-question-ids', {
      params: { username },
    });
    const ids = response.data || [];
    setInMemoryCache(cacheKey, ids, USER_DATA_TTL_MS);
    return ids;
  });
}

export async function recordAttempt(payload: AttemptRequest): Promise<AttemptResponse> {
  if (payload.username) {
    markQuestionAttemptedInCache(payload.username, payload.questionId);
  }
  memoryCache.delete('dbStatus:current');
  const response = await apiClient.post<AttemptResponse>('/attempts', payload);
  return response.data;
}

export async function fetchTopicPerformance(
  username?: string,
  options?: { forceRefresh?: boolean }
): Promise<TopicPerformance[]> {
  const cacheKey = `topicPerformance:${(username || 'GLOBAL').trim().toLowerCase()}`;

  if (!options?.forceRefresh) {
    const cached = getFromMemoryCache<TopicPerformance[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  return deduplicatedRequest(cacheKey, async () => {
    const response = await apiClient.get<TopicPerformance[]>('/analytics/topic-performance', {
      params: username ? { username } : {},
    });
    const data = response.data || [];
    setInMemoryCache(cacheKey, data, USER_DATA_TTL_MS);
    return data;
  });
}

export async function fetchDbStatus(options?: { forceRefresh?: boolean }): Promise<DbStatusResponse> {
  const cacheKey = 'dbStatus:current';

  if (!options?.forceRefresh) {
    const cached = getFromMemoryCache<DbStatusResponse>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  return deduplicatedRequest(cacheKey, async () => {
    const response = await apiClient.get<DbStatusResponse>('/system/db-status');
    setInMemoryCache(cacheKey, response.data, DB_STATUS_TTL_MS);
    return response.data;
  });
}

export async function executeSqlQuery(sql: string): Promise<SqlQueryResponse> {
  const response = await apiClient.post<SqlQueryResponse>('/system/query', { sql });
  return response.data;
}
