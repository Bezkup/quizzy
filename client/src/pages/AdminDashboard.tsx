import { useState, useEffect } from 'react';
import { getQuizzes, deleteQuiz } from '../services/api';
import type { Quiz } from '@shared/types';
import QuizEditor from '../components/QuizEditor';
import GameControl from '../components/GameControl';

interface Props {
  token: string;
  onLogout: () => void;
}

type View = 'list' | 'create' | 'edit' | 'game';

export default function AdminDashboard({ token, onLogout }: Props) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [view, setView] = useState<View>('list');
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null);

  const loadQuizzes = async () => {
    try {
      const data = await getQuizzes(token);
      setQuizzes(data);
    } catch (err) {
      console.error('Failed to load quizzes', err);
    }
  };

  useEffect(() => { loadQuizzes(); }, [token]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await deleteQuiz(token, id);
      loadQuizzes();
    } catch (err) {
      console.error('Failed to delete quiz', err);
    }
  };

  if (view === 'create' || view === 'edit') {
    return (
      <QuizEditor
        token={token}
        quizId={editingQuizId}
        onSaved={() => { setView('list'); setEditingQuizId(null); loadQuizzes(); }}
        onCancel={() => { setView('list'); setEditingQuizId(null); }}
      />
    );
  }

  if (view === 'game' && activeQuizId !== null) {
    return (
      <GameControl
        token={token}
        quizId={activeQuizId}
        onExit={() => { setView('list'); setActiveQuizId(null); }}
      />
    );
  }

  return (
    <div className="page-container page-container--wide">
      <div className="dashboard-header">
        <h1>🧠 Quizzy Dashboard</h1>
        <div style={styles.headerButtons}>
          <button style={styles.createBtn} onClick={() => setView('create')}>
            + New Quiz
          </button>
          <button style={styles.logoutBtn} onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div style={styles.empty}>
          <p>No quizzes yet. Create your first one!</p>
        </div>
      ) : (
        <div className="quiz-grid">
          {quizzes.map((quiz) => (
            <div key={quiz.id} style={styles.card}>
              <h3 style={styles.cardTitle}>{quiz.title}</h3>
              {quiz.description && <p style={styles.cardDesc}>{quiz.description}</p>}
              <p style={styles.cardMeta}>⏱️ {quiz.timer_seconds}s per question</p>
              <div style={styles.cardActions}>
                <button
                  style={styles.playBtn}
                  onClick={() => { setActiveQuizId(quiz.id); setView('game'); }}
                >
                  ▶ Play
                </button>
                <button
                  style={styles.editBtn}
                  onClick={() => { setEditingQuizId(quiz.id); setView('edit'); }}
                >
                  ✏️ Edit
                </button>
                <button style={styles.deleteBtn} onClick={() => handleDelete(quiz.id)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '2rem', maxWidth: '900px', margin: '0 auto' },
  headerButtons: { display: 'flex', gap: '0.5rem' },
  createBtn: {
    padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none',
    background: '#00b894', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem',
  },
  logoutBtn: {
    padding: '0.6rem 1.2rem', borderRadius: '8px', border: '2px solid #636e72',
    background: 'transparent', color: '#b2bec3', cursor: 'pointer', fontSize: '1rem',
  },
  empty: { textAlign: 'center', padding: '3rem', color: '#b2bec3' },
  card: {
    background: '#1a1a3e', borderRadius: '12px', padding: '1.5rem',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  },
  cardTitle: { marginBottom: '0.5rem', fontSize: '1.2rem' },
  cardDesc: { color: '#b2bec3', fontSize: '0.9rem', marginBottom: '0.5rem' },
  cardMeta: { color: '#636e72', fontSize: '0.85rem', marginBottom: '1rem' },
  cardActions: { display: 'flex', gap: '0.5rem' },
  playBtn: {
    flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none',
    background: '#6c5ce7', color: '#fff', fontWeight: 'bold', cursor: 'pointer',
  },
  editBtn: {
    padding: '0.5rem 0.75rem', borderRadius: '8px', border: '2px solid #636e72',
    background: 'transparent', color: '#dfe6e9', cursor: 'pointer',
  },
  deleteBtn: {
    padding: '0.5rem 0.75rem', borderRadius: '8px', border: '2px solid #d63031',
    background: 'transparent', color: '#d63031', cursor: 'pointer',
  },
};
