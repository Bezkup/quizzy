import type { Player, LeaderboardEntry } from '../../../shared/types.js';

const MAX_POINTS = 1000;
const DECAY_FACTOR = 3;

export function calculateScore(timeTaken: number, timerSeconds: number): number {
  if (timeTaken < 0) return MAX_POINTS;
  if (timeTaken >= timerSeconds) return 0;

  const ratio = timeTaken / timerSeconds;
  return Math.round(MAX_POINTS * Math.exp(-DECAY_FACTOR * ratio));
}

export function buildLeaderboard(
  players: Map<string, Player>,
  lastQuestionResults?: Map<string, { correct: boolean; points: number }>
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];

  for (const player of players.values()) {
    const lastResult = lastQuestionResults?.get(player.id);
    entries.push({
      username: player.username,
      score: player.score,
      rank: 0,
      lastAnswerCorrect: lastResult?.correct ?? null,
      lastAnswerPoints: lastResult?.points ?? 0,
    });
  }

  entries.sort((a, b) => b.score - a.score);
  entries.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return entries;
}

export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
