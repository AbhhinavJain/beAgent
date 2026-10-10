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

export async function fetchQuestions(params?: {
  subject?: string;
  topic?: string;
  limit?: number;
}): Promise<Question[]> {
  const queryParams: Record<string, string | number> = {};
  if (params?.subject && params.subject !== 'ALL') {
    queryParams.subject = params.subject;
  }
  if (params?.topic && params.topic !== 'ALL') {
    queryParams.topic = params.topic;
  }
  if (params?.limit) {
    queryParams.limit = params.limit;
  }

  const response = await apiClient.get<Question[]>('/questions', {
    params: queryParams,
  });
  return response.data;
}

export async function recordAttempt(payload: AttemptRequest): Promise<AttemptResponse> {
  const response = await apiClient.post<AttemptResponse>('/attempts', payload);
  return response.data;
}

export async function fetchTopicPerformance(username?: string): Promise<TopicPerformance[]> {
  const response = await apiClient.get<TopicPerformance[]>('/analytics/topic-performance', {
    params: username ? { username } : {},
  });
  return response.data;
}

export async function fetchDbStatus(): Promise<DbStatusResponse> {
  const response = await apiClient.get<DbStatusResponse>('/system/db-status');
  return response.data;
}

export async function executeSqlQuery(sql: string): Promise<SqlQueryResponse> {
  const response = await apiClient.post<SqlQueryResponse>('/system/query', { sql });
  return response.data;
}
