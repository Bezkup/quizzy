import {type FormEvent, useState} from 'react';
import {useSocket} from '../hooks/useSocket';
import {Button, Card, Input} from '../components/ui';
import Leaderboard from '../components/Leaderboard';
import {GameStatus} from '../constants';

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
    if (!joined || phase === GameStatus.IDLE) {
    return (
      <div className="page-container">
          <Card centered style={{marginTop: '15vh', padding: '2rem'}}>
              <h1 style={{fontSize: '2.5rem', marginBottom: '0.5rem'}}>🧠 Quizzy</h1>
              <p style={{color: '#b2bec3', marginBottom: '2rem'}}>Join a quiz game</p>
              <form onSubmit={handleJoin} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  <Input
              placeholder="Game Code"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              style={{textAlign: 'center', letterSpacing: '0.1rem', fontSize: '1.1rem'}}
            />
                  <Input
              placeholder="Your Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              required
              style={{textAlign: 'center', letterSpacing: '0.1rem', fontSize: '1.1rem'}}
            />
                  {error && <div style={{color: '#e74c3c', fontSize: '0.9rem'}}>{error}</div>}
                  <Button type="submit" fullWidth style={{fontSize: '1.2rem'}}>Join Game</Button>
          </form>
          </Card>
      </div>
    );
  }

  // Waiting room
    if (phase === GameStatus.WAITING) {
    return (
      <div className="page-container">
          <Card centered style={{marginTop: '15vh', padding: '2rem'}}>
          <h2>⏳ Waiting for the game to start...</h2>
              <p style={{color: '#b2bec3', marginTop: '1rem'}}>You're in! Sit tight, {username}.</p>
              {error && <div style={{color: '#e74c3c', fontSize: '0.9rem', marginTop: '1rem'}}>{error}</div>}
          </Card>
      </div>
    );
  }

  // Question phase
    if (phase === GameStatus.QUESTION && question) {
    return (
      <div className="page-container">
        <div className="question-meta">
          <span>Q{question.questionIndex + 1}/{question.totalQuestions}</span>
            <span style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#fdcb6e'}}>⏱️ {Math.ceil(timeLeft)}s</span>
        </div>
          <h2 style={{textAlign: 'center', fontSize: '1.3rem', marginBottom: '1.5rem', lineHeight: 1.4}}>
              {question.questionText}
          </h2>
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
            <p style={{textAlign: 'center', color: '#b2bec3', marginTop: '1rem'}}>✅ Answer locked in!</p>
        )}
      </div>
    );
  }

  // Reveal phase
    if (phase === GameStatus.REVEAL && questionResult && question) {
    const myResult = questionResult.playerResults.find((r) => r.username === username);
    return (
      <div className="page-container">
          <Card style={{marginTop: '10vh', padding: '2rem'}}>
          <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>
            {myResult?.correct ? '🎉 Correct!' : '😞 Wrong!'}
          </h2>
              <p style={{
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#fdcb6e',
                  marginBottom: '1rem'
              }}>
            {myResult?.correct ? `+${myResult.points} points` : '+0 points'}
          </p>
              <div style={{
                  textAlign: 'center',
                  padding: '1rem',
                  background: '#00b89433',
                  borderRadius: '10px',
                  color: '#00b894',
                  fontWeight: 'bold'
              }}>
            Correct answer: {question.options.find((o) => o.id === questionResult.correctOptionId)?.text}
          </div>
          </Card>
      </div>
    );
  }

  // Leaderboard phase
    if (phase === GameStatus.LEADERBOARD) {
    return (
      <div className="page-container">
        <Leaderboard entries={leaderboard} />
          <p style={{textAlign: 'center', color: '#b2bec3', marginTop: '1rem'}}>Waiting for next question...</p>
      </div>
    );
  }

  // Game finished
    if (phase === GameStatus.FINISHED) {
    const myEntry = leaderboard.find((e) => e.username === username);
    return (
      <div className="page-container">
          <Card centered style={{marginBottom: '1rem', padding: '2rem'}}>
          <h2>🏆 Game Over!</h2>
          {myEntry && (
              <div style={{marginTop: '1rem'}}>
                  <div style={{fontSize: '3rem', fontWeight: 'bold', color: '#6c5ce7'}}>#{myEntry.rank}</div>
                  <div style={{fontSize: '1.3rem', color: '#fdcb6e'}}>{myEntry.score} points</div>
            </div>
          )}
          </Card>
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
