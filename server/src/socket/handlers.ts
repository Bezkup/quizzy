import {Server, Socket} from 'socket.io';
import jwt from 'jsonwebtoken';
import {
  createGame,
  GameSession,
  getGame,
  getGameByAdminSocket,
  getGameByPlayerSocket,
  removeGame,
} from '../services/gameSession.js';
import {GameStatus, SocketEvent} from '../constants.js';
import type {ClientToServerEvents, ServerToClientEvents} from '@shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  io.on(SocketEvent.CONNECTION, (socket: GameSocket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Admin creates a game
    socket.on(SocketEvent.CREATE_GAME, ({quizId}) => {
      try {
        // Verify admin token from handshake
        const token = socket.handshake.auth.token;
        if (!token) {
          socket.emit(SocketEvent.ERROR, {message: 'Authentication required'});
          return;
        }

        try {
          jwt.verify(token, JWT_SECRET);
        } catch {
          socket.emit(SocketEvent.ERROR, {message: 'Invalid token'});
          return;
        }

        // Prevent duplicate games from the same admin
        const existing = getGameByAdminSocket(socket.id);
        if (existing) {
          socket.emit(SocketEvent.GAME_CREATED, {gameCode: existing.gameCode});
          return;
        }

        const session = createGame(quizId, socket.id);
        socket.join(session.gameCode);
        socket.emit(SocketEvent.GAME_CREATED, {gameCode: session.gameCode});
        console.log(`Game created: ${session.gameCode} for quiz ${quizId}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create game';
        socket.emit(SocketEvent.ERROR, {message});
      }
    });

    // Player joins a game
    socket.on(SocketEvent.JOIN_GAME, ({gameCode, username}) => {
      try {
        const code = gameCode.toUpperCase();
        const session = getGame(code);
        if (!session) {
          socket.emit(SocketEvent.ERROR, {message: 'Game not found'});
          return;
        }

        session.addPlayer(socket.id, username);
        socket.join(code);

        io.to(code).emit(SocketEvent.PLAYER_JOINED, {
          username,
          playerCount: session.players.size,
        });

        socket.emit(SocketEvent.GAME_STATUS, {
          status: session.status,
          playerCount: session.players.size,
        });

        console.log(`Player "${username}" joined game ${code}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to join game';
        socket.emit(SocketEvent.ERROR, {message});
      }
    });

    // Admin starts the game (first question)
    socket.on(SocketEvent.START_GAME, () => {
      const session = getGameByAdminSocket(socket.id);
      if (!session) {
        socket.emit(SocketEvent.ERROR, {message: 'No game found'});
        return;
      }

      if (session.players.size === 0) {
        socket.emit(SocketEvent.ERROR, {message: 'No players have joined'});
        return;
      }

      const questionData = session.startNextQuestion();
      if (!questionData) {
        socket.emit(SocketEvent.ERROR, {message: 'No questions available'});
        return;
      }

      handleQuestion(io, session, questionData)
    });

    // Player submits an answer
    socket.on(SocketEvent.SUBMIT_ANSWER, ({optionId}) => {
      const session = getGameByPlayerSocket(socket.id);
      if (!session) return;

      const result = session.submitAnswer(socket.id, optionId);
      if (!result.success) return;

      // Send immediate feedback to the player who submitted
      socket.emit(SocketEvent.ANSWER_FEEDBACK, {
        correct: result.correct!,
        showFeedback: session.showAnswerFeedback
      });

      // If all players answered, end question early (with delay for feedback)
      if (session.allPlayersAnswered()) {
        // Cancel the normal question timer to prevent double-fire
        session.clearQuestionTimer();
        setTimeout(() => {
          if (session.status !== GameStatus.QUESTION) return;
          const results = session.endQuestion();
          io.to(session.gameCode).emit(SocketEvent.QUESTION_END, results);

          const leaderboard = session.getLeaderboard();
          session.status = GameStatus.LEADERBOARD;
          io.to(session.gameCode).emit(SocketEvent.LEADERBOARD_UPDATE, {leaderboard});
        }, 2000);
      }
    });

    // Admin advances to next question
    socket.on(SocketEvent.NEXT_QUESTION, () => {
      const session = getGameByAdminSocket(socket.id);
      if (!session) return;

      if (session.isLastQuestion()) {
        session.status = GameStatus.FINISHED;
        const leaderboard = session.getLeaderboard();
        io.to(session.gameCode).emit(SocketEvent.GAME_END, {leaderboard});
        removeGame(session.gameCode);
        return;
      }

      const questionData = session.startNextQuestion();
      if (!questionData) return;
      handleQuestion(io, session, questionData);
    });

    // Admin ends game early
    socket.on(SocketEvent.END_GAME, () => {
      const session = getGameByAdminSocket(socket.id);
      if (!session) return;

      session.status = GameStatus.FINISHED;
      const leaderboard = session.getLeaderboard();
      io.to(session.gameCode).emit(SocketEvent.GAME_END, {leaderboard});
      removeGame(session.gameCode);
    });

    // Handle disconnect
    socket.on(SocketEvent.DISCONNECT, () => {
      // Check if admin disconnected
      const adminGame = getGameByAdminSocket(socket.id);
      if (adminGame) {
        adminGame.status = GameStatus.FINISHED;
        io.to(adminGame.gameCode).emit(SocketEvent.GAME_END, {leaderboard: adminGame.getLeaderboard()});
        removeGame(adminGame.gameCode);
        console.log(`Admin disconnected, game ${adminGame.gameCode} ended`);
        return;
      }

      // Check if player disconnected
      const playerGame = getGameByPlayerSocket(socket.id);
      if (playerGame) {
        const player = playerGame.players.get(socket.id);
        const username = player?.username ?? 'Unknown';
        playerGame.removePlayer(socket.id);
        io.to(playerGame.gameCode).emit(SocketEvent.PLAYER_LEFT, {
          username,
          playerCount: playerGame.players.size,
        });
        console.log(`Player "${username}" left game ${playerGame.gameCode}`);
      }
    });
  });
}


const handleQuestion = (io: Server<ClientToServerEvents, ServerToClientEvents>, session: GameSession, questionData: {
  questionIndex: number;
  totalQuestions: number;
  questionText: string;
  options: { id: number; text: string }[];
  timerSeconds: number
}) => {
  io.to(session.gameCode).emit(SocketEvent.QUESTION_START, questionData);

  session.setQuestionTimer(() => {
    const results = session.endQuestion();
    io.to(session.gameCode).emit(SocketEvent.QUESTION_END, results);

    const leaderboard = session.getLeaderboard();
    session.status = GameStatus.LEADERBOARD;
    io.to(session.gameCode).emit(SocketEvent.LEADERBOARD_UPDATE, {leaderboard});
  });
}