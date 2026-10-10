export interface Question {
  id: number;
  subject: string;
  topic: string;
  gateYear: number | null;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string | null;
  imageUrl: string | null;
  questionType: 'MCQ' | 'MSQ' | 'NAT' | string;
  hasImage: boolean;
  createdAt?: string;
}

export interface AttemptRequest {
  questionId: number;
  selectedOption: string;
  isCorrect?: boolean;
  username?: string;
}

export interface AttemptResponse {
  attemptId: number;
  questionId: number;
  selectedOption: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
  attemptedAt: string;
}

export interface TopicPerformance {
  subject: string;
  topic: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracyPercentage: number;
  needsFocus: boolean;
  totalQuestions: number;
  attemptedQuestions: number;
}

export interface AuthResponse {
  message: string;
  success: boolean;
  username?: string;
}

export interface DbStatusResponse {
  connected: boolean;
  databaseProduct?: string;
  connectionMode?: string;
  jdbcUrl?: string;
  totalQuestionsInDb?: number;
  totalAttemptsInDb?: number;
  totalUsersInDb?: number;
  localEmergencyBackupExists?: boolean;
  localEmergencyBackupPath?: string;
  error?: string;
}

export interface SqlQueryResponse {
  sql?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  error?: string;
}
