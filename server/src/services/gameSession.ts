import type { Player, GameState, QuestionWithOptions, LeaderboardEntry } from '../../../shared/types.js';
import { calculateScore, buildLeaderboard, generateGameCode } from './scoring.js';
import { getDb } from '../database/db.js';
import type { Quiz, Question, Option } from '../../../shared/types.js';

export class GameSession {
  gameCode: string;
  quizId: number;
  quizTitle: string;
  players: Map<string, Player>;
  currentQuestionIndex: number;
  totalQuestions: number;
  timerSeconds: number;
  status: GameState['status'];
  questionStartTime: number | null;
  adminSocketId: string;

  private questions: QuestionWithOptions[];
  private questionResults: Map<string, { correct: boolean; points: number }>;
  private questionTimer: ReturnType<typeof setTimeout> | null;

  constructor(quizId: number, adminSocketId: string) {
    const db = getDb();
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId) as Quiz | undefined;
    if (!quiz) throw new Error('Quiz not found');

    const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index').all(quizId) as Question[];
    if (questions.length === 0) throw new Error('Quiz has no questions');

    this.questions = questions.map((q) => {
      const options = db.prepare('SELECT * FROM options WHERE question_id = ? ORDER BY order_index').all(q.id) as Option[];
      return { ...q, options };
    });

    this.gameCode = generateGameCode();
    this.quizId = quizId;
    this.quizTitle = quiz.title;
    this.players = new Map();
    this.currentQuestionIndex = -1;
    this.totalQuestions = this.questions.length;
    this.timerSeconds = quiz.timer_seconds;
    this.status = 'waiting';
    this.questionStartTime = null;
    this.adminSocketId = adminSocketId;
    this.questionResults = new Map();
    this.questionTimer = null;
  }

  addPlayer(socketId: string, username: string): Player {
    if (this.status !== 'waiting') {
      throw new Error('Game has already started');
    }

    for (const player of this.players.values()) {
      if (player.username.toLowerCase() === username.toLowerCase()) {
        throw new Error('Username already taken');
      }
    }

    const player: Player = {
      id: socketId,
      username,
      score: 0,
      currentAnswer: null,
      answerTimestamp: null,
    };

    this.players.set(socketId, player);
    return player;
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);
  }

  getCurrentQuestion(): QuestionWithOptions | null {
    if (this.currentQuestionIndex < 0 || this.currentQuestionIndex >= this.questions.length) {
      return null;
    }
    return this.questions[this.currentQuestionIndex];
  }

  startNextQuestion(): {
    questionIndex: number;
    totalQuestions: number;
    questionText: string;
    options: { id: number; text: string }[];
    timerSeconds: number;
  } | null {
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex >= this.totalQuestions) {
      return null;
    }

    this.status = 'question';
    this.questionStartTime = Date.now();
    this.questionResults = new Map();

    // Reset player answers
    for (const player of this.players.values()) {
      player.currentAnswer = null;
      player.answerTimestamp = null;
    }

    const question = this.questions[this.currentQuestionIndex];
    return {
      questionIndex: this.currentQuestionIndex,
      totalQuestions: this.totalQuestions,
      questionText: question.question_text,
      options: question.options.map((o) => ({ id: o.id, text: o.option_text })),
      timerSeconds: this.timerSeconds,
    };
  }

  submitAnswer(socketId: string, optionId: number): boolean {
    if (this.status !== 'question') return false;

    const player = this.players.get(socketId);
    if (!player || player.currentAnswer !== null) return false;

    player.currentAnswer = optionId;
    player.answerTimestamp = Date.now();
    return true;
  }

  allPlayersAnswered(): boolean {
    for (const player of this.players.values()) {
      if (player.currentAnswer === null) return false;
    }
    return true;
  }

  endQuestion(): {
    correctOptionId: number;
    playerResults: { username: string; correct: boolean; points: number }[];
  } {
    this.status = 'reveal';
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }

    const question = this.questions[this.currentQuestionIndex];
    const correctOption = question.options.find((o) => o.is_correct);
    const correctOptionId = correctOption?.id ?? -1;

    const playerResults: { username: string; correct: boolean; points: number }[] = [];

    for (const player of this.players.values()) {
      const correct = player.currentAnswer === correctOptionId;
      let points = 0;

      if (correct && this.questionStartTime && player.answerTimestamp) {
        const timeTaken = (player.answerTimestamp - this.questionStartTime) / 1000;
        points = calculateScore(timeTaken, this.timerSeconds);
      }

      player.score += points;
      this.questionResults.set(player.id, { correct, points });
      playerResults.push({ username: player.username, correct, points });
    }

    return { correctOptionId, playerResults };
  }

  getLeaderboard(): LeaderboardEntry[] {
    return buildLeaderboard(this.players, this.questionResults);
  }

  isLastQuestion(): boolean {
    return this.currentQuestionIndex >= this.totalQuestions - 1;
  }

  setQuestionTimer(callback: () => void): void {
    this.questionTimer = setTimeout(callback, this.timerSeconds * 1000);
  }

  cleanup(): void {
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }
  }
}

// Global registry of active games
const activeGames = new Map<string, GameSession>();

export function createGame(quizId: number, adminSocketId: string): GameSession {
  const session = new GameSession(quizId, adminSocketId);
  activeGames.set(session.gameCode, session);
  return session;
}

export function getGame(gameCode: string): GameSession | undefined {
  return activeGames.get(gameCode);
}

export function removeGame(gameCode: string): void {
  const game = activeGames.get(gameCode);
  if (game) {
    game.cleanup();
    activeGames.delete(gameCode);
  }
}

export function getGameByAdminSocket(socketId: string): GameSession | undefined {
  for (const game of activeGames.values()) {
    if (game.adminSocketId === socketId) return game;
  }
  return undefined;
}

export function getGameByPlayerSocket(socketId: string): GameSession | undefined {
  for (const game of activeGames.values()) {
    if (game.players.has(socketId)) return game;
  }
  return undefined;
}
