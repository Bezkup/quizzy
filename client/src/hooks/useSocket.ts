import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents, LeaderboardEntry } from '@shared/types';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type GamePhase = 'idle' | 'waiting' | 'question' | 'reveal' | 'leaderboard' | 'finished';

export interface QuestionData {
  questionIndex: number;
  totalQuestions: number;
  questionText: string;
  options: { id: number; text: string }[];
  timerSeconds: number;
}

export interface QuestionResult {
  correctOptionId: number;
  playerResults: { username: string; correct: boolean; points: number }[];
}

export function useSocket(token?: string) {
  const socketRef = useRef<GameSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const socket: GameSocket = io({
      auth: token ? { token } : {},
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('game_created', ({ gameCode }) => {
      setGameCode(gameCode);
      setPhase('waiting');
    });

    socket.on('player_joined', ({ playerCount }) => {
      setPlayerCount(playerCount);
    });

    socket.on('player_left', ({ playerCount }) => {
      setPlayerCount(playerCount);
    });

    socket.on('game_status', ({ status, playerCount }) => {
      setPhase(status);
      setPlayerCount(playerCount);
    });

    socket.on('question_start', (data) => {
      setQuestion(data);
      setQuestionResult(null);
      setSelectedAnswer(null);
      setPhase('question');
      setTimeLeft(data.timerSeconds);

      // Start countdown
      if (timerRef.current) clearInterval(timerRef.current);
      const start = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        const remaining = Math.max(0, data.timerSeconds - elapsed);
        setTimeLeft(remaining);
        if (remaining <= 0 && timerRef.current) {
          clearInterval(timerRef.current);
        }
      }, 100);
    });

    socket.on('question_end', (data) => {
      setQuestionResult(data);
      setPhase('reveal');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    socket.on('leaderboard_update', ({ leaderboard }) => {
      setLeaderboard(leaderboard);
      setPhase('leaderboard');
    });

    socket.on('game_end', ({ leaderboard }) => {
      setLeaderboard(leaderboard);
      setPhase('finished');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    socket.on('error', ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.disconnect();
    };
  }, [token]);

  const createGame = useCallback((quizId: number) => {
    socketRef.current?.emit('create_game', { quizId });
  }, []);

  const joinGame = useCallback((gameCode: string, username: string) => {
    socketRef.current?.emit('join_game', { gameCode, username });
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('start_game');
  }, []);

  const submitAnswer = useCallback((optionId: number) => {
    setSelectedAnswer(optionId);
    socketRef.current?.emit('submit_answer', { optionId });
  }, []);

  const nextQuestion = useCallback(() => {
    socketRef.current?.emit('next_question');
  }, []);

  const endGame = useCallback(() => {
    socketRef.current?.emit('end_game');
  }, []);

  const resetState = useCallback(() => {
    setPhase('idle');
    setGameCode(null);
    setPlayerCount(0);
    setQuestion(null);
    setQuestionResult(null);
    setLeaderboard([]);
    setSelectedAnswer(null);
    setTimeLeft(0);
  }, []);

  return {
    connected,
    phase,
    gameCode,
    playerCount,
    question,
    questionResult,
    leaderboard,
    error,
    selectedAnswer,
    timeLeft,
    createGame,
    joinGame,
    startGame,
    submitAnswer,
    nextQuestion,
    endGame,
    resetState,
  };
}
