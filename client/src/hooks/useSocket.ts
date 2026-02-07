import {useCallback, useEffect, useRef, useState} from 'react';
import {io, Socket} from 'socket.io-client';
import {GameStatus, SocketEvent} from '../constants';
import type {ClientToServerEvents, LeaderboardEntry, ServerToClientEvents} from '@shared/types';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type GamePhase = GameStatus;

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
  const [phase, setPhase] = useState<GamePhase>(GameStatus.IDLE);
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

    socket.on(SocketEvent.CONNECT, () => setConnected(true));
    socket.on(SocketEvent.DISCONNECT, () => setConnected(false));

    socket.on(SocketEvent.GAME_CREATED, ({gameCode}) => {
      setGameCode(gameCode);
      setPhase(GameStatus.WAITING);
    });

    socket.on(SocketEvent.PLAYER_JOINED, ({playerCount}) => {
      setPlayerCount(playerCount);
    });

    socket.on(SocketEvent.PLAYER_LEFT, ({playerCount}) => {
      setPlayerCount(playerCount);
    });

    socket.on(SocketEvent.GAME_STATUS, ({status, playerCount}) => {
      setPhase(status as GameStatus);
      setPlayerCount(playerCount);
    });

    socket.on(SocketEvent.QUESTION_START, (data) => {
      setQuestion(data);
      setQuestionResult(null);
      setSelectedAnswer(null);
      setPhase(GameStatus.QUESTION);
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

    socket.on(SocketEvent.QUESTION_END, (data) => {
      setQuestionResult(data);
      setPhase(GameStatus.REVEAL);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    socket.on(SocketEvent.LEADERBOARD_UPDATE, ({leaderboard}) => {
      setLeaderboard(leaderboard);
      setPhase(GameStatus.LEADERBOARD);
    });

    socket.on(SocketEvent.GAME_END, ({leaderboard}) => {
      setLeaderboard(leaderboard);
      setPhase(GameStatus.FINISHED);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    socket.on(SocketEvent.ERROR, ({message}) => {
      setError(message);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.disconnect();
    };
  }, [token]);

  const createGame = useCallback((quizId: number) => {
    socketRef.current?.emit(SocketEvent.CREATE_GAME, {quizId});
  }, []);

  const joinGame = useCallback((gameCode: string, username: string) => {
    socketRef.current?.emit(SocketEvent.JOIN_GAME, {gameCode, username});
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit(SocketEvent.START_GAME);
  }, []);

  const submitAnswer = useCallback((optionId: number) => {
    setSelectedAnswer(optionId);
    socketRef.current?.emit(SocketEvent.SUBMIT_ANSWER, {optionId});
  }, []);

  const nextQuestion = useCallback(() => {
    socketRef.current?.emit(SocketEvent.NEXT_QUESTION);
  }, []);

  const endGame = useCallback(() => {
    socketRef.current?.emit(SocketEvent.END_GAME);
  }, []);

  const resetState = useCallback(() => {
    setPhase(GameStatus.IDLE);
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
