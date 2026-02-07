import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import {
  createGame,
  getGame,
  removeGame,
  getGameByAdminSocket,
  getGameByPlayerSocket,
} from '../services/gameSession.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  io.on('connection', (socket: GameSocket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Admin creates a game
    socket.on('create_game', ({ quizId }) => {
      try {
        // Verify admin token from handshake
        const token = socket.handshake.auth.token;
        if (!token) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        try {
          jwt.verify(token, JWT_SECRET);
        } catch {
          socket.emit('error', { message: 'Invalid token' });
          return;
        }

        // Prevent duplicate games from the same admin
        const existing = getGameByAdminSocket(socket.id);
        if (existing) {
          socket.emit('game_created', { gameCode: existing.gameCode });
          return;
        }

        const session = createGame(quizId, socket.id);
        socket.join(session.gameCode);
        socket.emit('game_created', { gameCode: session.gameCode });
        console.log(`Game created: ${session.gameCode} for quiz ${quizId}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create game';
        socket.emit('error', { message });
      }
    });

    // Player joins a game
    socket.on('join_game', ({ gameCode, username }) => {
      try {
        const code = gameCode.toUpperCase();
        const session = getGame(code);
        if (!session) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        session.addPlayer(socket.id, username);
        socket.join(code);

        io.to(code).emit('player_joined', {
          username,
          playerCount: session.players.size,
        });

        socket.emit('game_status', {
          status: session.status,
          playerCount: session.players.size,
        });

        console.log(`Player "${username}" joined game ${code}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to join game';
        socket.emit('error', { message });
      }
    });

    // Admin starts the game (first question)
    socket.on('start_game', () => {
      const session = getGameByAdminSocket(socket.id);
      if (!session) {
        socket.emit('error', { message: 'No game found' });
        return;
      }

      if (session.players.size === 0) {
        socket.emit('error', { message: 'No players have joined' });
        return;
      }

      const questionData = session.startNextQuestion();
      if (!questionData) {
        socket.emit('error', { message: 'No questions available' });
        return;
      }

      io.to(session.gameCode).emit('question_start', questionData);

      // Auto-end question when timer expires
      session.setQuestionTimer(() => {
        const results = session.endQuestion();
        io.to(session.gameCode).emit('question_end', results);

        const leaderboard = session.getLeaderboard();
        session.status = 'leaderboard';
        io.to(session.gameCode).emit('leaderboard_update', { leaderboard });
      });
    });

    // Player submits an answer
    socket.on('submit_answer', ({ optionId }) => {
      const session = getGameByPlayerSocket(socket.id);
      if (!session) return;

      const accepted = session.submitAnswer(socket.id, optionId);
      if (!accepted) return;

      // If all players answered, end question early
      if (session.allPlayersAnswered()) {
        const results = session.endQuestion();
        io.to(session.gameCode).emit('question_end', results);

        const leaderboard = session.getLeaderboard();
        session.status = 'leaderboard';
        io.to(session.gameCode).emit('leaderboard_update', { leaderboard });
      }
    });

    // Admin advances to next question
    socket.on('next_question', () => {
      const session = getGameByAdminSocket(socket.id);
      if (!session) return;

      if (session.isLastQuestion()) {
        session.status = 'finished';
        const leaderboard = session.getLeaderboard();
        io.to(session.gameCode).emit('game_end', { leaderboard });
        removeGame(session.gameCode);
        return;
      }

      const questionData = session.startNextQuestion();
      if (!questionData) return;

      io.to(session.gameCode).emit('question_start', questionData);

      session.setQuestionTimer(() => {
        const results = session.endQuestion();
        io.to(session.gameCode).emit('question_end', results);

        const leaderboard = session.getLeaderboard();
        session.status = 'leaderboard';
        io.to(session.gameCode).emit('leaderboard_update', { leaderboard });
      });
    });

    // Admin ends game early
    socket.on('end_game', () => {
      const session = getGameByAdminSocket(socket.id);
      if (!session) return;

      session.status = 'finished';
      const leaderboard = session.getLeaderboard();
      io.to(session.gameCode).emit('game_end', { leaderboard });
      removeGame(session.gameCode);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Check if admin disconnected
      const adminGame = getGameByAdminSocket(socket.id);
      if (adminGame) {
        adminGame.status = 'finished';
        io.to(adminGame.gameCode).emit('game_end', { leaderboard: adminGame.getLeaderboard() });
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
        io.to(playerGame.gameCode).emit('player_left', {
          username,
          playerCount: playerGame.players.size,
        });
        console.log(`Player "${username}" left game ${playerGame.gameCode}`);
      }
    });
  });
}
