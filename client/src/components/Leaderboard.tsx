import type {LeaderboardEntry} from '@shared/types';
import {Card} from './ui';

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
      <Card>
          <h3 style={{textAlign: 'center', marginBottom: '1rem'}}>🏆 Leaderboard</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
        {entries.map((entry) => (
          <div
            key={entry.username}
            className={`leaderboard-row ${entry.rank <= 3 ? 'leaderboard-row--top' : ''}`}
          >
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                  <span style={{fontSize: '1.3rem', minWidth: '2rem'}}>{getMedal(entry.rank)}</span>
                  <span style={{fontWeight: 'bold', fontSize: '1.05rem'}}>{entry.username}</span>
            </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              {entry.lastAnswerCorrect !== null && (
                  <span style={{fontSize: '0.85rem', color: entry.lastAnswerCorrect ? '#00b894' : '#d63031'}}>
                  {entry.lastAnswerCorrect ? `+${entry.lastAnswerPoints}` : '+0'}
                </span>
              )}
                  <span style={{fontWeight: 'bold', fontSize: '1.2rem', color: '#fdcb6e'}}>{entry.score}</span>
            </div>
          </div>
        ))}
      </div>
      </Card>
  );
}
