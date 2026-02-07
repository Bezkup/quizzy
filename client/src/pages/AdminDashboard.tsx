import {useEffect, useState} from 'react';
import {deleteQuiz, getQuizzes} from '../services/api';
import {AdminView} from '../constants';
import type {Quiz} from '@shared/types';
import {Button, Card} from '../components/ui';
import QuizEditor from '../components/QuizEditor';
import GameControl from '../components/GameControl';

interface Props {
  token: string;
  onLogout: () => void;
}

export default function AdminDashboard({ token, onLogout }: Props) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [view, setView] = useState<AdminView>(AdminView.LIST);
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

  if (view === AdminView.CREATE || view === AdminView.EDIT) {
    return (
      <QuizEditor
        token={token}
        quizId={editingQuizId}
        onSaved={() => {
          setView(AdminView.LIST);
          setEditingQuizId(null);
          loadQuizzes();
        }}
        onCancel={() => {
          setView(AdminView.LIST);
          setEditingQuizId(null);
        }}
      />
    );
  }

  if (view === AdminView.GAME && activeQuizId !== null) {
    return (
      <GameControl
        token={token}
        quizId={activeQuizId}
        onExit={() => {
          setView(AdminView.LIST);
          setActiveQuizId(null);
        }}
      />
    );
  }

  return (
    <div className="page-container page-container--wide">
      <div className="dashboard-header">
        <h1>🧠 Quizzy Dashboard</h1>
        <div style={{display: 'flex', gap: '0.5rem'}}>
          <Button variant="success" onClick={() => setView(AdminView.CREATE)}>+ New Quiz</Button>
          <Button variant="ghost" onClick={onLogout}>Logout</Button>
        </div>
      </div>

      {quizzes.length === 0 ? (
          <div style={{textAlign: 'center', padding: '3rem', color: '#b2bec3'}}>
          <p>No quizzes yet. Create your first one!</p>
        </div>
      ) : (
        <div className="quiz-grid">
          {quizzes.map((quiz) => (
              <Card key={quiz.id} style={{borderRadius: '12px'}}>
                <h3 style={{marginBottom: '0.5rem', fontSize: '1.2rem'}}>{quiz.title}</h3>
                {quiz.description &&
                    <p style={{color: '#b2bec3', fontSize: '0.9rem', marginBottom: '0.5rem'}}>{quiz.description}</p>}
                <p style={{color: '#636e72', fontSize: '0.85rem', marginBottom: '1rem'}}>⏱️ {quiz.timer_seconds}s per
                  question</p>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <Button style={{flex: 1}} onClick={() => {
                    setActiveQuizId(quiz.id);
                    setView(AdminView.GAME);
                  }}>
                  ▶ Play
                  </Button>
                  <Button variant="ghost" onClick={() => {
                    setEditingQuizId(quiz.id);
                    setView(AdminView.EDIT);
                  }}>
                  ✏️ Edit
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(quiz.id)}>
                  🗑️
                  </Button>
              </div>
              </Card>
          ))}
        </div>
      )}
    </div>
  );
}
