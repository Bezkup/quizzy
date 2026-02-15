import {Response, Router} from 'express';
import {getDb} from '../database/db.js';
import {authMiddleware, AuthRequest} from './middleware.js';
import {insertQuizWithQuestions, replaceQuizQuestions} from '../services/quizService.js';
import type {Option, Question, Quiz, QuizWithQuestions} from '../../../shared/types.js';

const router = Router();
router.use(authMiddleware);

function getQuizForAdmin(quizId: string | string[], adminId: number): Quiz | undefined {
  const db = getDb();
  const id = Array.isArray(quizId) ? quizId[0] : quizId;
  return db.prepare('SELECT * FROM quizzes WHERE id = ? AND admin_id = ?').get(id, adminId) as Quiz | undefined;
}

function loadQuizQuestions(quizId: number): (Question & { options: Option[] })[] {
  const db = getDb();
  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index').all(quizId) as Question[];
  return questions.map((q) => {
    const options = db.prepare('SELECT * FROM options WHERE question_id = ? ORDER BY order_index').all(q.id) as Option[];
    return {...q, options};
  });
}

function validateQuizBody(body: { title?: string; questions?: unknown[] }): string | null {
  if (!body.title || !body.questions || !Array.isArray(body.questions) || body.questions.length === 0) {
    return 'Title and at least one question are required';
  }
  return null;
}

// List all quizzes for the authenticated admin
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const quizzes = db.prepare('SELECT * FROM quizzes WHERE admin_id = ? ORDER BY created_at DESC').all(req.admin!.id) as Quiz[];
  res.json(quizzes);
});

// Get quiz with questions and options
router.get('/:id', (req: AuthRequest, res: Response) => {
  const quiz = getQuizForAdmin(req.params.id, req.admin!.id);
  if (!quiz) {
    res.status(404).json({error: 'Quiz not found'});
    return;
  }

  const result: QuizWithQuestions = {...quiz, questions: loadQuizQuestions(quiz.id)};
  res.json(result);
});

// Create a new quiz
router.post('/', (req: AuthRequest, res: Response) => {
  const error = validateQuizBody(req.body);
  if (error) {
    res.status(400).json({error});
    return;
  }

  const {title, description, timer_seconds, show_answer_feedback, questions} = req.body;
  try {
    const quizId = insertQuizWithQuestions(req.admin!.id, title, description || null, timer_seconds || 15, show_answer_feedback !== false, questions);
    res.status(201).json({ id: quizId });
  } catch (err: unknown) {
    res.status(400).json({error: err instanceof Error ? err.message : 'Failed to create quiz'});
  }
});

// Update a quiz
router.put('/:id', (req: AuthRequest, res: Response) => {
  const {title, description, timer_seconds, show_answer_feedback, questions} = req.body;
  const quiz = getQuizForAdmin(req.params.id, req.admin!.id);
  if (!quiz) {
    res.status(404).json({error: 'Quiz not found'});
    return;
  }

  try {
    const db = getDb();
    db.transaction(() => {
      db.prepare('UPDATE quizzes SET title = ?, description = ?, timer_seconds = ?, show_answer_feedback = ? WHERE id = ?')
          .run(title, description || null, timer_seconds || 15, show_answer_feedback !== false ? 1 : 0, quiz.id);
      if (questions && Array.isArray(questions)) {
        replaceQuizQuestions(quiz.id, questions);
      }
    })();
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(400).json({error: err instanceof Error ? err.message : 'Failed to update quiz'});
  }
});

// Delete a quiz
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM quizzes WHERE id = ? AND admin_id = ?').run(req.params.id, req.admin!.id);
  if (result.changes === 0) {
    res.status(404).json({error: 'Quiz not found'});
    return;
  }
  res.json({ success: true });
});

// Export quiz as JSON
router.get('/:id/export', (req: AuthRequest, res: Response) => {
  const quiz = getQuizForAdmin(req.params.id, req.admin!.id);
  if (!quiz) {
    res.status(404).json({error: 'Quiz not found'});
    return;
  }

  const questions = loadQuizQuestions(quiz.id);
  const exportData = {
    title: quiz.title,
    description: quiz.description,
    timer_seconds: quiz.timer_seconds,
    show_answer_feedback: quiz.show_answer_feedback,
    questions: questions.map((q) => ({
      question_text: q.question_text,
      order_index: q.order_index,
      options: q.options.map((o) => ({
        option_text: o.option_text,
        is_correct: o.is_correct,
        order_index: o.order_index,
      })),
    })),
  };

  res.setHeader('Content-Disposition', `attachment; filename="${quiz.title.replace(/[^a-z0-9]/gi, '_')}.json"`);
  res.json(exportData);
});

// Import quiz from JSON
router.post('/import', (req: AuthRequest, res: Response) => {
  const error = validateQuizBody(req.body);
  if (error) {
    res.status(400).json({error});
    return;
  }

  const {title, description, timer_seconds, show_answer_feedback, questions} = req.body;
  try {
    const quizId = insertQuizWithQuestions(req.admin!.id, title, description || null, timer_seconds || 15, show_answer_feedback !== false, questions);
    res.status(201).json({ id: quizId });
  } catch (err: unknown) {
    res.status(400).json({error: err instanceof Error ? err.message : 'Failed to import quiz'});
  }
});

export default router;
