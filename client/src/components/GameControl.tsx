import { useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import Leaderboard from './Leaderboard';

interface Props {
  token: string;
  quizId: number;
  onExit: () => void;
}

export default function GameControl({ token, quizId, onExit }: Props) {
  const {
    connected, phase, gameCode, playerCount, question, questionResult,
    leaderboard, error, timeLeft,
    createGame, startGame, nextQuestion, endGame,
  } = useSocket(token);

  useEffect(() => {
    if (connected && phase === 'idle') {
      createGame(quizId);
    }
  }, [connected, phase, quizId, createGame]);

  return (
    <div className="page-container">
      <div style={styles.header}>
        <h2>🎮 Game Control</h2>
        <button style={styles.exitBtn} onClick={() => { endGame(); onExit(); }}>
          ✕ Exit
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {phase === 'waiting' && (
        <div style={styles.waitingCard}>
          <h3>Game Code</h3>
          <div className="game-code">{gameCode}</div>
          <p style={styles.meta}>Share this code with players</p>
          <p style={styles.playerCount}>👥 {playerCount} player{playerCount !== 1 ? 's' : ''} joined</p>
          {playerCount === 0 && (
            <p style={styles.noPlayers}>Waiting for players to join...</p>
          )}
          <button
            style={{
              ...styles.startBtn,
              ...(playerCount === 0 ? styles.startBtnDisabled : {}),
            }}
            onClick={startGame}
            disabled={playerCount === 0}
          >
            🚀 Start Game
          </button>
        </div>
      )}

      {phase === 'question' && question && (
        <div style={styles.questionCard}>
          <div style={styles.questionMeta}>
            Question {question.questionIndex + 1} / {question.totalQuestions}
          </div>
          <h3 style={styles.questionText}>{question.questionText}</h3>
          <div style={styles.timer}>⏱️ {Math.ceil(timeLeft)}s</div>
          <p style={styles.meta}>Waiting for answers...</p>
        </div>
      )}

      {phase === 'reveal' && questionResult && (
        <div style={styles.revealCard}>
          <h3>Results</h3>
          <div style={styles.resultsList}>
            {questionResult.playerResults.map((r) => (
              <div key={r.username} style={styles.resultRow}>
                <span>{r.correct ? '✅' : '❌'} {r.username}</span>
                <span style={{ color: r.correct ? '#00b894' : '#d63031' }}>
                  +{r.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'leaderboard' && (
        <div>
          <Leaderboard entries={leaderboard} />
          <button style={styles.nextBtn} onClick={nextQuestion}>
            ➡️ Next Question
          </button>
        </div>
      )}

      {phase === 'finished' && (
        <div>
          <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>🏆 Final Results</h3>
          <Leaderboard entries={leaderboard} />
          <button style={styles.exitBtn2} onClick={onExit}>
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '2rem', maxWidth: '600px', margin: '0 auto' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem',
  },
  exitBtn: {
    padding: '0.5rem 1rem', borderRadius: '8px', border: '2px solid #d63031',
    background: 'transparent', color: '#d63031', cursor: 'pointer',
  },
  error: {
    background: '#d63031', color: '#fff', padding: '0.75rem', borderRadius: '8px',
    marginBottom: '1rem', textAlign: 'center',
  },
  waitingCard: {
    background: '#1a1a3e', borderRadius: '16px', padding: '2rem', textAlign: 'center',
  },
  meta: { color: '#b2bec3', marginBottom: '1rem' },
  playerCount: { fontSize: '1.3rem', marginBottom: '0.5rem' },
  noPlayers: { color: '#fdcb6e', fontSize: '0.95rem', marginBottom: '1.5rem' },
  startBtn: {
    padding: '0.85rem 2rem', borderRadius: '10px', border: 'none',
    background: '#00b894', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem',
    cursor: 'pointer',
  },
  startBtnDisabled: {
    background: '#636e72', cursor: 'not-allowed', opacity: 0.6,
  },
  questionCard: {
    background: '#1a1a3e', borderRadius: '16px', padding: '2rem', textAlign: 'center',
  },
  questionMeta: { color: '#b2bec3', marginBottom: '0.5rem' },
  questionText: { fontSize: '1.4rem', marginBottom: '1rem' },
  timer: { fontSize: '2rem', fontWeight: 'bold', color: '#fdcb6e' },
  revealCard: {
    background: '#1a1a3e', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem',
  },
  resultsList: { marginTop: '1rem' },
  resultRow: {
    display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0',
    borderBottom: '1px solid #333366',
  },
  nextBtn: {
    width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none',
    background: '#6c5ce7', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem',
    cursor: 'pointer', marginTop: '1rem',
  },
  exitBtn2: {
    width: '100%', padding: '0.85rem', borderRadius: '10px', border: '2px solid #636e72',
    background: 'transparent', color: '#b2bec3', cursor: 'pointer', marginTop: '1rem',
    fontSize: '1rem',
  },
};
