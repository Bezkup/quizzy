# 🧠 Quizzy — Real-time Multiplayer Quiz Game

A self-hosted, real-time browser quiz game built with React, Node.js, Socket.io, and SQLite.

## Features

- **Admin Panel** — Create, edit, and manage quizzes with a web UI
- **Real-time Gameplay** — Socket.io-powered live quiz sessions
- **Exponential Scoring** — Faster answers earn more points (max 1000)
- **Live Leaderboard** — Rankings update after each question
- **Configurable Timer** — Set time limit per quiz
- **Unlimited Players** — No cap on concurrent participants
- **Self-hosted** — SQLite database, no external services required

## Quick Start

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Setup and seed the database

```bash
cd server && npm run seed
```

Default admin credentials: `admin` / `admin`

### 3. Start development servers

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

### 4. Open in browser

- **Players**: http://localhost:5173
- **Admin Panel**: http://localhost:5173/admin

## How to Play

1. **Admin** logs in at `/admin`, creates a quiz, and clicks **Play**
2. A **6-character game code** is generated and displayed
3. **Players** go to `/`, enter the game code and a username
4. Admin clicks **Start Game** to begin
5. Questions are shown one at a time with a countdown timer
6. Players select an answer — faster = more points
7. After each question, the correct answer and leaderboard are shown
8. Final standings are displayed at the end

## Scoring

Points use exponential decay: `1000 × e^(-3 × time/limit)`

| Answer Speed | Points |
|---|---|
| Instant (0s) | 1000 |
| 25% of time | ~472 |
| 50% of time | ~223 |
| 75% of time | ~105 |
| At deadline | ~50 |

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Real-time**: Socket.io
- **Database**: SQLite (via better-sqlite3)
- **Auth**: JWT + bcrypt
