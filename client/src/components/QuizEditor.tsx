import React, {useEffect, useState} from 'react';
import {createQuiz, getQuiz, updateQuiz} from '../services/api';
import {Button, Card, Input} from './ui';

interface QuestionForm {
  question_text: string;
  options: { option_text: string; is_correct: boolean }[];
}

interface Props {
  token: string;
  quizId: number | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function QuizEditor({ token, quizId, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(true);
  const [questions, setQuestions] = useState<QuestionForm[]>([
    { question_text: '', options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }] },
  ]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (quizId) {
      getQuiz(token, quizId).then((quiz) => {
        setTitle(quiz.title);
        setDescription(quiz.description || '');
        setTimerSeconds(quiz.timer_seconds);
        setShowAnswerFeedback(quiz.show_answer_feedback !== false);
        setQuestions(
          quiz.questions.map((q: { question_text: string; options: { option_text: string; is_correct: boolean }[] }) => ({
            question_text: q.question_text,
            options: q.options.map((o: { option_text: string; is_correct: boolean }) => ({
              option_text: o.option_text,
              is_correct: o.is_correct,
            })),
          }))
        );
      });
    }
  }, [quizId, token]);

  const addQuestion = () => {
    setQuestions([...questions, {
      question_text: '',
      options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }],
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].question_text = text;
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push({ option_text: '', is_correct: false });
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) return;
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex].option_text = text;
    setQuestions(updated);
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.forEach((o, i) => { o.is_correct = i === oIndex; });
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      title,
      description,
      timer_seconds: timerSeconds,
      show_answer_feedback: showAnswerFeedback,
      questions: questions.map((q, i) => ({
        question_text: q.question_text,
        order_index: i,
        options: q.options.map((o, j) => ({
          option_text: o.option_text,
          is_correct: o.is_correct,
          order_index: j,
        })),
      })),
    };

    try {
      if (quizId) {
        await updateQuiz(token, quizId, payload);
      } else {
        await createQuiz(token, payload);
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container page-container--narrow">
      <div style={styles.header}>
        <h2>{quizId ? 'Edit Quiz' : 'Create Quiz'}</h2>
        <Button variant="ghost" onClick={onCancel}>← Back</Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={styles.field}>
          <label style={styles.label}>Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" required/>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)}
                 placeholder="Optional description"/>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Timer (seconds per question)</label>
          <Input
            type="number"
            min={5}
            max={120}
            value={timerSeconds}
            onChange={(e) => setTimerSeconds(Number(e.target.value))}
            fullWidth={false}
            style={{width: '100px'}}
          />
        </div>

        <div style={styles.field}>
          <label style={{...styles.label, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
            <input
                type="checkbox"
                checked={showAnswerFeedback}
                onChange={(e) => setShowAnswerFeedback(e.target.checked)}
                style={{width: '18px', height: '18px', cursor: 'pointer'}}
            />
            Show answer feedback to players
          </label>
          <p style={{fontSize: '0.85rem', color: '#95a5a6', marginTop: '0.25rem', marginLeft: '1.75rem'}}>
            When enabled, players see if they got the answer right/wrong. When disabled, only the correct answer is
            shown.
          </p>
        </div>

        <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Questions</h3>

        {questions.map((q, qi) => (
            <Card key={qi} style={{borderRadius: '12px', marginBottom: '1.25rem'}}>
            <div style={styles.questionHeader}>
              <span style={styles.questionNumber}>Q{qi + 1}</span>
              {questions.length > 1 && (
                <button type="button" style={styles.removeBtn} onClick={() => removeQuestion(qi)}>
                  ✕
                </button>
              )}
            </div>

              <Input
              value={q.question_text}
              onChange={(e) => updateQuestion(qi, e.target.value)}
              placeholder="Enter your question..."
              required
            />

            <div style={styles.optionsContainer}>
              {q.options.map((opt, oi) => (
                <div key={oi} className="option-row">
                  <button
                    type="button"
                    className="correct-toggle"
                    style={{background: opt.is_correct ? '#00b894' : '#636e72'}}
                    onClick={() => setCorrectOption(qi, oi)}
                    title={opt.is_correct ? 'Correct answer' : 'Mark as correct'}
                  >
                    ✓
                  </button>
                  <Input
                    value={opt.option_text}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                    required
                    style={{flex: 1}}
                  />
                  {q.options.length > 2 && (
                      <button type="button" style={styles.removeOptionBtn} onClick={() => removeOption(qi, oi)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" style={styles.addOptionBtn} onClick={() => addOption(qi)}>
                + Add Option
              </button>
            </div>
            </Card>
        ))}

        <button type="button" style={styles.addQuestionBtn} onClick={addQuestion}>
          + Add Question
        </button>

        {error && <div style={{color: '#e74c3c', textAlign: 'center', marginBottom: '1rem'}}>{error}</div>}

        <Button type="submit" fullWidth disabled={saving} style={{fontSize: '1.1rem'}}>
          {saving ? 'Saving...' : quizId ? 'Update Quiz' : 'Create Quiz'}
        </Button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem',
  },
  field: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '0.4rem', color: '#b2bec3', fontSize: '0.9rem' },
  questionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem',
  },
  questionNumber: {
    background: '#6c5ce7', color: '#fff', borderRadius: '50%', width: '28px', height: '28px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  removeBtn: {
    background: 'transparent', border: 'none', color: '#d63031', cursor: 'pointer',
    fontSize: '1.2rem', minWidth: '44px', minHeight: '44px',
  },
  optionsContainer: { marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  removeOptionBtn: {
    background: 'transparent', border: 'none', color: '#d63031', cursor: 'pointer',
    fontSize: '1rem', padding: '0.5rem', minWidth: '44px', minHeight: '44px',
  },
  addOptionBtn: {
    padding: '0.6rem', borderRadius: '6px', border: '2px dashed #333366',
    background: 'transparent', color: '#b2bec3', cursor: 'pointer', fontSize: '0.85rem',
    minHeight: '44px',
  },
  addQuestionBtn: {
    width: '100%', padding: '0.75rem', borderRadius: '10px', border: '2px dashed #333366',
    background: 'transparent', color: '#b2bec3', cursor: 'pointer', fontSize: '1rem',
    marginBottom: '1.5rem',
  },
  saveBtn: {
    width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none',
    background: '#6c5ce7', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem',
    cursor: 'pointer',
  },
  error: { color: '#e74c3c', textAlign: 'center', marginBottom: '1rem' },
};
