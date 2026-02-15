import {getDb} from './db.js';
import bcrypt from 'bcrypt';

async function seed() {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (existing) {
    console.log('Admin user already exists. Skipping seed.');
    return;
  }

  const hash = await bcrypt.hash('admin', 10);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);
  console.log('Default admin created — username: admin, password: admin');

  // Seed a sample quiz
  const quizResult = db.prepare(
      'INSERT INTO quizzes (admin_id, title, description, timer_seconds, show_answer_feedback) VALUES (?, ?, ?, ?, ?)'
  ).run(1, 'Sample Quiz', 'A sample quiz to get started', 15, 1);

  const quizId = quizResult.lastInsertRowid;

  const insertQuestion = db.prepare(
    'INSERT INTO questions (quiz_id, question_text, order_index) VALUES (?, ?, ?)'
  );
  const insertOption = db.prepare(
    'INSERT INTO options (question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?)'
  );

  const q1 = insertQuestion.run(quizId, 'What is the capital of France?', 0);
  insertOption.run(q1.lastInsertRowid, 'London', 0, 0);
  insertOption.run(q1.lastInsertRowid, 'Paris', 1, 1);
  insertOption.run(q1.lastInsertRowid, 'Berlin', 0, 2);
  insertOption.run(q1.lastInsertRowid, 'Madrid', 0, 3);

  const q2 = insertQuestion.run(quizId, 'Which planet is known as the Red Planet?', 1);
  insertOption.run(q2.lastInsertRowid, 'Venus', 0, 0);
  insertOption.run(q2.lastInsertRowid, 'Mars', 1, 1);
  insertOption.run(q2.lastInsertRowid, 'Jupiter', 0, 2);

  const q3 = insertQuestion.run(quizId, 'Is the Earth flat?', 2);
  insertOption.run(q3.lastInsertRowid, 'Yes', 0, 0);
  insertOption.run(q3.lastInsertRowid, 'No', 1, 1);

  console.log('Sample quiz seeded with 3 questions.');
}

seed().catch(console.error);
