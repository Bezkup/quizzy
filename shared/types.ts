// ---- Database Models ----

export interface Admin {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface Quiz {
  id: number;
  admin_id: number;
  title: string;
  description: string | null;
  timer_seconds: number;
  show_answer_feedback: boolean;
  created_at: string;
}

export interface Question {
  id: number;
  quiz_id: number;
  question_text: string;
  order_index: number;
}

export interface Option {
  id: number;
  question_id: number;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

// ---- API DTOs ----

export interface QuizWithQuestions extends Quiz {
  questions: QuestionWithOptions[];
}

export interface QuestionWithOptions extends Question {
  options: Option[];
}

export interface CreateQuizDTO {
  title: string;
  description?: string;
  timer_seconds: number;
  show_answer_feedback?: boolean;
  questions: CreateQuestionDTO[];
}

export interface CreateQuestionDTO {
  question_text: string;
  order_index: number;
  options: CreateOptionDTO[];
}

export interface CreateOptionDTO {
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  admin: { id: number; username: string };
}

// ---- Game State ----

export interface Player {
  id: string;
  username: string;
  score: number;
  currentAnswer: number | null;
  answerTimestamp: number | null;
}

export interface GameState {
  gameCode: string;
  quizId: number;
  quizTitle: string;
  players: Map<string, Player>;
  currentQuestionIndex: number;
  totalQuestions: number;
  timerSeconds: number;
  status: 'idle' | 'waiting' | 'question' | 'reveal' | 'leaderboard' | 'finished';
  questionStartTime: number | null;
}

export interface LeaderboardEntry {
  username: string;
  score: number;
  rank: number;
  lastAnswerCorrect: boolean | null;
  lastAnswerPoints: number;
}

// ---- Socket.io Events ----

export interface ServerToClientEvents {
  game_created: (data: { gameCode: string }) => void;
  player_joined: (data: { username: string; playerCount: number }) => void;
  player_left: (data: { username: string; playerCount: number }) => void;
  question_start: (data: {
    questionIndex: number;
    totalQuestions: number;
    questionText: string;
    options: { id: number; text: string }[];
    timerSeconds: number;
  }) => void;
  answer_feedback: (data: { correct: boolean; showFeedback: boolean }) => void;
  question_end: (data: {
    correctOptionId: number;
    playerResults: { username: string; correct: boolean; points: number }[];
    showAnswerFeedback: boolean;
  }) => void;
  leaderboard_update: (data: { leaderboard: LeaderboardEntry[] }) => void;
  game_end: (data: { leaderboard: LeaderboardEntry[] }) => void;
  error: (data: { message: string }) => void;
  game_status: (data: { status: GameState['status']; playerCount: number }) => void;
}

export interface ClientToServerEvents {
  create_game: (data: { quizId: number }) => void;
  join_game: (data: { gameCode: string; username: string }) => void;
  start_game: () => void;
  submit_answer: (data: { optionId: number }) => void;
  next_question: () => void;
  end_game: () => void;
}
