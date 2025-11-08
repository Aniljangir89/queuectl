// src/db.js
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'queue.db');
const db = new Database(DB_PATH);

// migrate / create tables
db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  command TEXT NOT NULL,
  state TEXT NOT NULL, -- pending, processing, completed, failed, dead
  attempts INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  next_run_at TEXT, -- when to try next (ISO timestamp) or NULL
  worker TEXT, -- worker id currently processing
  last_exit_code INTEGER,
  last_error TEXT,
  output TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_state_nextrun ON jobs (state, next_run_at);
`);

module.exports = { db, DB_PATH, DATA_DIR };
