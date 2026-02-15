// ---- Enums ----

export enum GameStatus {
    IDLE = 'idle',
    WAITING = 'waiting',
    QUESTION = 'question',
    REVEAL = 'reveal',
    LEADERBOARD = 'leaderboard',
    FINISHED = 'finished',
}

export enum SocketEvent {
    // Connection events
    CONNECT = 'connect',
    DISCONNECT = 'disconnect',

    // Game lifecycle events
    CREATE_GAME = 'create_game',
    GAME_CREATED = 'game_created',
    JOIN_GAME = 'join_game',
    START_GAME = 'start_game',
    END_GAME = 'end_game',
    GAME_END = 'game_end',
    GAME_STATUS = 'game_status',

    // Player events
    PLAYER_JOINED = 'player_joined',
    PLAYER_LEFT = 'player_left',

    // Question events
    QUESTION_START = 'question_start',
    QUESTION_END = 'question_end',
    SUBMIT_ANSWER = 'submit_answer',
    ANSWER_FEEDBACK = 'answer_feedback',
    NEXT_QUESTION = 'next_question',

    // Leaderboard events
    LEADERBOARD_UPDATE = 'leaderboard_update',

    // Error events
    ERROR = 'error',
}

export enum AdminView {
    LIST = 'list',
    CREATE = 'create',
    EDIT = 'edit',
    GAME = 'game',
}

// ---- Constants ----

export const STORAGE_KEYS = {
    AUTH_TOKEN: 'quizzy_token',
    PLAYER_USERNAME: 'quizzy_username',
} as const;
