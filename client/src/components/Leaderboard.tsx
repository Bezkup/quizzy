import type { LeaderboardEntry } from '@shared/types';
import React from "react";

interface Props {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: Props) {
  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🏆 Leaderboard</h3>
      <div style={styles.list}>
        {entries.map((entry) => (
          <div
            key={entry.username}
            className={`leaderboard-row ${entry.rank <= 3 ? 'leaderboard-row--top' : ''}`}
          >
            <div style={styles.rankSection}>
              <span style={styles.rank}>{getMedal(entry.rank)}</span>
              <span style={styles.username}>{entry.username}</span>
            </div>
            <div style={styles.scoreSection}>
              {entry.lastAnswerCorrect !== null && (
                <span style={{
                  ...styles.lastPoints,
                  color: entry.lastAnswerCorrect ? '#00b894' : '#d63031',
                }}>
                  {entry.lastAnswerCorrect ? `+${entry.lastAnswerPoints}` : '+0'}
                </span>
              )}
              <span style={styles.score}>{entry.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#1a1a3e', borderRadius: '16px', padding: '1.5rem',
  },
  title: { textAlign: 'center', marginBottom: '1rem' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.75rem 1rem', borderRadius: '10px', background: '#0f0f23',
  },
  topRow: { background: '#2d1b69' },
  rankSection: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  rank: { fontSize: '1.3rem', minWidth: '2rem' },
  username: { fontWeight: 'bold', fontSize: '1.05rem' },
  scoreSection: { display: 'flex', alignItems: 'center', gap: '1rem' },
  lastPoints: { fontSize: '0.85rem' },
  score: { fontWeight: 'bold', fontSize: '1.2rem', color: '#fdcb6e' },
};
