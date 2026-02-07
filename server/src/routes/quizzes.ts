import { Router, Response } from 'express';
import { getDb } from '../database/db.js';
import { authMiddleware, AuthRequest } from './middleware.js';
import type { Quiz, Question, Option, QuizWithQuestions } from '../../../shared/types.js';

const router = Router();
router.use(authMiddleware);

// List all quizzes for the authenticated admin
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const quizzes = db.prepare('SELECT * FROM quizzes WHERE admin_id = ? ORDER BY created_at DESC').all(req.admin!.id) as Quiz[];
  res.json(quizzes);
});

// Get quiz with questions and options
router.get('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND admin_id = ?').get(req.params.id, req.admin!.id) as Quiz | undefined;

  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index').all(quiz.id) as Question[];
  const questionsWithOptions: (Question & { options: Option[] })[] = questions.map((q) => {
    const options = db.prepare('SELECT * FROM options WHERE question_id = ? ORDER BY order_index').all(q.id) as Option[];
    return { ...q, options };
  });

  const result: QuizWithQuestions = { ...quiz, questions: questionsWithOptions };
  res.json(result);
});

// Create a new quiz
router.post('/', (req: AuthRequest, res: Response) => {
  const { title, description, timer_seconds, questions } = req.body;

  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: 'Title and at least one question are required' });
    return;
  }

  const db = getDb();
  const insertQuiz = db.prepare('INSERT INTO quizzes (admin_id, title, description, timer_seconds) VALUES (?, ?, ?, ?)');
  const insertQuestion = db.prepare('INSERT INTO questions (quiz_id, question_text, order_index) VALUES (?, ?, ?)');
  const insertOption = db.prepare('INSERT INTO options (question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?)');

  const transaction = db.transaction(() => {
    const quizResult = insertQuiz.run(req.admin!.id, title, description || null, timer_seconds || 15);
    const quizId = quizResult.lastInsertRowid;

    for (const [qi, question] of questions.entries()) {
      if (!question.question_text || !question.options || question.options.length < 2) {
        throw new Error(`Question ${qi + 1} must have text and at least 2 options`);
      }

      const hasCorrect = question.options.some((o: { is_correct: boolean }) => o.is_correct);
      if (!hasCorrect) {
        throw new Error(`Question ${qi + 1} must have at least one correct answer`);
      }

      const qResult = insertQuestion.run(quizId, question.question_text, question.order_index ?? qi);

      for (const [oi, option] of question.options.entries()) {
        insertOption.run(qResult.lastInsertRowid, option.option_text, option.is_correct ? 1 : 0, option.order_index ?? oi);
      }
    }

    return quizId;
  });

  try {
    const quizId = transaction();
    res.status(201).json({ id: quizId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create quiz';
    res.status(400).json({ error: message });
  }
});

// Update a quiz
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { title, description, timer_seconds, questions } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM quizzes WHERE id = ? AND admin_id = ?').get(req.params.id, req.admin!.id);
  if (!existing) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  const insertQuestion = db.prepare('INSERT INTO questions (quiz_id, question_text, order_index) VALUES (?, ?, ?)');
  const insertOption = db.prepare('INSERT INTO options (question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?)');

  const transaction = db.transaction(() => {
    db.prepare('UPDATE quizzes SET title = ?, description = ?, timer_seconds = ? WHERE id = ?')
      .run(title, description || null, timer_seconds || 15, req.params.id);

    if (questions && Array.isArray(questions)) {
      // Delete existing questions (cascades to options)
      db.prepare('DELETE FROM questions WHERE quiz_id = ?').run(req.params.id);

      for (const [qi, question] of questions.entries()) {
        const qResult = insertQuestion.run(req.params.id, question.question_text, question.order_index ?? qi);
        for (const [oi, option] of question.options.entries()) {
          insertOption.run(qResult.lastInsertRowid, option.option_text, option.is_correct ? 1 : 0, option.order_index ?? oi);
        }
      }
    }
  });

  try {
    transaction();
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update quiz';
    res.status(400).json({ error: message });
  }
});

// Delete a quiz
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM quizzes WHERE id = ? AND admin_id = ?').run(req.params.id, req.admin!.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  res.json({ success: true });
});

// Export quiz as JSON
router.get('/:id/export', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND admin_id = ?').get(req.params.id, req.admin!.id) as Quiz | undefined;

  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index').all(quiz.id) as Question[];
  const questionsWithOptions = questions.map((q) => {
    const options = db.prepare('SELECT * FROM options WHERE question_id = ? ORDER BY order_index').all(q.id) as Option[];
    return {
      question_text: q.question_text,
      order_index: q.order_index,
      options: options.map((o) => ({
        option_text: o.option_text,
        is_correct: !!o.is_correct,
        order_index: o.order_index,
      })),
    };
  });

  const exportData = {
    title: quiz.title,
    description: quiz.description,
    timer_seconds: quiz.timer_seconds,
    questions: questionsWithOptions,
  };

  res.setHeader('Content-Disposition', `attachment; filename="${quiz.title.replace(/[^a-z0-9]/gi, '_')}.json"`);
  res.json(exportData);
});

// Import quiz from JSON
router.post('/import', (req: AuthRequest, res: Response) => {
  const { title, description, timer_seconds, questions } = req.body;

  if (!title || !questions || !Array.isArray(questions)) {
    res.status(400).json({ error: 'Invalid quiz format' });
    return;
  }

  // Reuse the create logic by forwarding to the POST / handler
  req.body = { title, description, timer_seconds, questions };

  const db = getDb();
  const insertQuiz = db.prepare('INSERT INTO quizzes (admin_id, title, description, timer_seconds) VALUES (?, ?, ?, ?)');
  const insertQuestion = db.prepare('INSERT INTO questions (quiz_id, question_text, order_index) VALUES (?, ?, ?)');
  const insertOption = db.prepare('INSERT INTO options (question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?)');

  const transaction = db.transaction(() => {
    const quizResult = insertQuiz.run(req.admin!.id, title, description || null, timer_seconds || 15);
    const quizId = quizResult.lastInsertRowid;

    for (const [qi, question] of questions.entries()) {
      const qResult = insertQuestion.run(quizId, question.question_text, question.order_index ?? qi);
      for (const [oi, option] of question.options.entries()) {
        insertOption.run(qResult.lastInsertRowid, option.option_text, option.is_correct ? 1 : 0, option.order_index ?? oi);
      }
    }

    return quizId;
  });

  try {
    const quizId = transaction();
    res.status(201).json({ id: quizId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to import quiz';
    res.status(400).json({ error: message });
  }
});

export default router;
