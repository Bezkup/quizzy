import { useState, type FormEvent } from 'react';
import { useSocket } from '../hooks/useSocket';
import Leaderboard from '../components/Leaderboard';

export default function PlayerView() {
  const [gameCode, setGameCode] = useState('');
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);

  const {
    phase, question, questionResult, leaderboard, error,
    selectedAnswer, timeLeft,
    joinGame, submitAnswer,
  } = useSocket();

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!gameCode.trim() || !username.trim()) return;
    joinGame(gameCode.trim(), username.trim());
    setJoined(true);
  };

  // Join form
  if (!joined || phase === 'idle') {
    return (
      <div className="page-container">
        <div style={styles.card}>
          <h1 style={styles.title}>🧠 Quizzy</h1>
          <p style={styles.subtitle}>Join a quiz game</p>
          <form onSubmit={handleJoin} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Game Code"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
            <input
              style={styles.input}
              placeholder="Your Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              required
            />
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={styles.joinBtn}>Join Game</button>
          </form>
        </div>
      </div>
    );
  }

  // Waiting room
  if (phase === 'waiting') {
    return (
      <div className="page-container">
        <div style={styles.card}>
          <h2>⏳ Waiting for the game to start...</h2>
          <p style={styles.subtitle}>You're in! Sit tight, {username}.</p>
          {error && <div style={styles.error}>{error}</div>}
        </div>
      </div>
    );
  }

  // Question phase
  if (phase === 'question' && question) {
    return (
      <div className="page-container">
        <div className="question-meta">
          <span>Q{question.questionIndex + 1}/{question.totalQuestions}</span>
          <span style={styles.timer}>⏱️ {Math.ceil(timeLeft)}s</span>
        </div>
        <h2 style={styles.questionText}>{question.questionText}</h2>
        <div className="options-grid">
          {question.options.map((opt, i) => {
            const colors = ['#e74c3c', '#3498db', '#f39c12', '#00b894', '#9b59b6', '#e84393'];
            const isSelected = selectedAnswer === opt.id;
            return (
              <button
                key={opt.id}
                className="option-btn"
                style={{
                  background: colors[i % colors.length],
                  opacity: selectedAnswer !== null && !isSelected ? 0.4 : 1,
                  transform: isSelected ? 'scale(0.95)' : 'scale(1)',
                  border: isSelected ? '3px solid #fff' : '3px solid transparent',
                }}
                onClick={() => submitAnswer(opt.id)}
                disabled={selectedAnswer !== null}
              >
                {opt.text}
              </button>
            );
          })}
        </div>
        {selectedAnswer !== null && (
          <p style={{ textAlign: 'center', color: '#b2bec3', marginTop: '1rem' }}>
            ✅ Answer locked in!
          </p>
        )}
      </div>
    );
  }

  // Reveal phase
  if (phase === 'reveal' && questionResult && question) {
    const myResult = questionResult.playerResults.find((r) => r.username === username);
    return (
      <div className="page-container">
        <div style={styles.revealCard}>
          <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>
            {myResult?.correct ? '🎉 Correct!' : '😞 Wrong!'}
          </h2>
          <p style={styles.pointsText}>
            {myResult?.correct ? `+${myResult.points} points` : '+0 points'}
          </p>
          <div style={styles.correctAnswer}>
            Correct answer: {question.options.find((o) => o.id === questionResult.correctOptionId)?.text}
          </div>
        </div>
      </div>
    );
  }

  // Leaderboard phase
  if (phase === 'leaderboard') {
    return (
      <div className="page-container">
        <Leaderboard entries={leaderboard} />
        <p style={{ textAlign: 'center', color: '#b2bec3', marginTop: '1rem' }}>
          Waiting for next question...
        </p>
      </div>
    );
  }

  // Game finished
  if (phase === 'finished') {
    const myEntry = leaderboard.find((e) => e.username === username);
    return (
      <div className="page-container">
        <div style={styles.finishedCard}>
          <h2>🏆 Game Over!</h2>
          {myEntry && (
            <div style={styles.myResult}>
              <div style={styles.finalRank}>#{myEntry.rank}</div>
              <div style={styles.finalScore}>{myEntry.score} points</div>
            </div>
          )}
        </div>
        <Leaderboard entries={leaderboard} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <p>Connecting...</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#1a1a3e', borderRadius: '16px', padding: '2rem', textAlign: 'center',
    marginTop: '15vh',
  },
  title: { fontSize: '2.5rem', marginBottom: '0.5rem' },
  subtitle: { color: '#b2bec3', marginBottom: '2rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  input: {
    padding: '0.85rem 1rem', borderRadius: '10px', border: '2px solid #333366',
    background: '#0f0f23', color: '#fff', fontSize: '1.1rem', outline: 'none',
    textAlign: 'center', letterSpacing: '0.1rem',
  },
  joinBtn: {
    padding: '0.85rem', borderRadius: '10px', border: 'none', background: '#6c5ce7',
    color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer',
    minHeight: '48px',
  },
  error: { color: '#e74c3c', fontSize: '0.9rem' },
  timer: { fontSize: '1.3rem', fontWeight: 'bold', color: '#fdcb6e' },
  questionText: {
    textAlign: 'center', fontSize: '1.3rem', marginBottom: '1.5rem', lineHeight: 1.4,
  },
  revealCard: {
    background: '#1a1a3e', borderRadius: '16px', padding: '2rem', marginTop: '10vh',
  },
  pointsText: {
    textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#fdcb6e',
    marginBottom: '1rem',
  },
  correctAnswer: {
    textAlign: 'center', padding: '1rem', background: '#00b89433', borderRadius: '10px',
    color: '#00b894', fontWeight: 'bold',
  },
  finishedCard: {
    background: '#1a1a3e', borderRadius: '16px', padding: '2rem', textAlign: 'center',
    marginBottom: '1rem',
  },
  myResult: { marginTop: '1rem' },
  finalRank: { fontSize: '3rem', fontWeight: 'bold', color: '#6c5ce7' },
  finalScore: { fontSize: '1.3rem', color: '#fdcb6e' },
};
