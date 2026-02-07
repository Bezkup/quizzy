import Database from 'better-sqlite3';
import {getDb} from '../database/db.js';
import type {CreateQuestionDTO} from '../../../shared/types.js';

export function insertQuizWithQuestions(
    adminId: number,
    title: string,
    description: string | null,
    timerSeconds: number,
    questions: CreateQuestionDTO[]
): number | bigint {
    const db = getDb();

    const transaction = db.transaction(() => {
        const quizResult = db.prepare('INSERT INTO quizzes (admin_id, title, description, timer_seconds) VALUES (?, ?, ?, ?)')
            .run(adminId, title, description, timerSeconds);
        const quizId = quizResult.lastInsertRowid;
        insertQuestions(db, quizId, questions);
        return quizId;
    });

    return transaction();
}

export function replaceQuizQuestions(
    quizId: number | string,
    questions: CreateQuestionDTO[]
): void {
    const db = getDb();
    db.prepare('DELETE FROM questions WHERE quiz_id = ?').run(quizId);
    insertQuestions(db, quizId, questions);
}

function insertQuestions(
    db: Database.Database,
    quizId: number | bigint | string,
    questions: CreateQuestionDTO[]
): void {
    const stmtQuestion = db.prepare('INSERT INTO questions (quiz_id, question_text, order_index) VALUES (?, ?, ?)');
    const stmtOption = db.prepare('INSERT INTO options (question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?)');

    for (const [qi, question] of questions.entries()) {
        if (!question.question_text || !question.options || question.options.length < 2) {
            throw new Error(`Question ${qi + 1} must have text and at least 2 options`);
        }
        if (!question.options.some((o) => o.is_correct)) {
            throw new Error(`Question ${qi + 1} must have at least one correct answer`);
        }

        const qResult = stmtQuestion.run(quizId, question.question_text, question.order_index ?? qi);
        for (const [oi, option] of question.options.entries()) {
            stmtOption.run(qResult.lastInsertRowid, option.option_text, option.is_correct ? 1 : 0, option.order_index ?? oi);
        }
    }
}
