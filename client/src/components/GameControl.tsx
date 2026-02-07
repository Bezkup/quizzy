import {useEffect} from 'react';
import {useSocket} from '../hooks/useSocket';
import {Button, Card} from './ui';
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
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <h2>🎮 Game Control</h2>
        <Button variant="danger" onClick={() => {
          endGame();
          onExit();
        }}>✕ Exit</Button>
      </div>

      {error && (
          <div style={{
            background: '#d63031',
            color: '#fff',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
      )}

      {phase === 'waiting' && (
          <Card centered style={{padding: '2rem'}}>
          <h3>Game Code</h3>
          <div className="game-code">{gameCode}</div>
            <p style={{color: '#b2bec3', marginBottom: '1rem'}}>Share this code with players</p>
            <p style={{
              fontSize: '1.3rem',
              marginBottom: '0.5rem'
            }}>👥 {playerCount} player{playerCount !== 1 ? 's' : ''} joined</p>
          {playerCount === 0 && (
              <p style={{color: '#fdcb6e', fontSize: '0.95rem', marginBottom: '1.5rem'}}>Waiting for players to
                join...</p>
          )}
            <Button variant="success" onClick={startGame} disabled={playerCount === 0}
                    style={{fontSize: '1.2rem', padding: '0.85rem 2rem'}}>
            🚀 Start Game
            </Button>
          </Card>
      )}

      {phase === 'question' && question && (
          <Card centered style={{padding: '2rem'}}>
            <div style={{color: '#b2bec3', marginBottom: '0.5rem'}}>
            Question {question.questionIndex + 1} / {question.totalQuestions}
          </div>
            <h3 style={{fontSize: '1.4rem', marginBottom: '1rem'}}>{question.questionText}</h3>
            <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#fdcb6e'}}>⏱️ {Math.ceil(timeLeft)}s</div>
            <p style={{color: '#b2bec3', marginTop: '1rem'}}>Waiting for answers...</p>
          </Card>
      )}

      {phase === 'reveal' && questionResult && (
          <Card style={{marginBottom: '1rem'}}>
          <h3>Results</h3>
            <div style={{marginTop: '1rem'}}>
            {questionResult.playerResults.map((r) => (
                <div key={r.username} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #333366'
                }}>
                <span>{r.correct ? '✅' : '❌'} {r.username}</span>
                  <span style={{color: r.correct ? '#00b894' : '#d63031'}}>+{r.points}</span>
              </div>
            ))}
          </div>
          </Card>
      )}

      {phase === 'leaderboard' && (
        <div>
          <Leaderboard entries={leaderboard} />
          <Button fullWidth onClick={nextQuestion} style={{marginTop: '1rem', fontSize: '1.1rem'}}>
            ➡️ Next Question
          </Button>
        </div>
      )}

      {phase === 'finished' && (
        <div>
          <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>🏆 Final Results</h3>
          <Leaderboard entries={leaderboard} />
          <Button variant="ghost" fullWidth onClick={onExit} style={{marginTop: '1rem'}}>
            Back to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
