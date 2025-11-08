// src/queue.js
const { db } = require('./db');
const dayjs = require('dayjs');

const insertJob = db.prepare(`
INSERT INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at, next_run_at)
VALUES (@id, @command, @state, @attempts, @max_retries, @created_at, @updated_at, @next_run_at)
`);

const getJob = db.prepare(`SELECT * FROM jobs WHERE id = ?`);
const listByState = db.prepare(`SELECT * FROM jobs WHERE state = ? ORDER BY created_at DESC`);
const listAllSummary = db.prepare(`
SELECT state, COUNT(*) as count FROM jobs GROUP BY state
`);
const updateJob = db.prepare(`
UPDATE jobs SET 
  state=@state, attempts=@attempts, updated_at=@updated_at, next_run_at=@next_run_at, worker=@worker, last_exit_code=@last_exit_code, last_error=@last_error, output=@output
WHERE id=@id
`);

function enqueue(job) {
  const now = dayjs().toISOString();
  const payload = {
    id: job.id,
    command: job.command,
    state: 'pending',
    attempts: 0,
    max_retries: job.max_retries || 3,
    created_at: now,
    updated_at: now,
    next_run_at: null
  };
  insertJob.run(payload);
  return payload;
}

function statusSummary() {
  const rows = listAllSummary.all();
  return rows;
}

function list(state) {
  return listByState.all(state);
}

function get(id) {
  return getJob.get(id);
}

function moveToDead(id, attemptData = {}) {
  const now = dayjs().toISOString();
  updateJob.run({
    id,
    state: 'dead',
    attempts: attemptData.attempts || 0,
    updated_at: now,
    next_run_at: null,
    worker: null,
    last_exit_code: attemptData.last_exit_code || null,
    last_error: attemptData.last_error || null,
    output: attemptData.output || null
  });
}

function retryFromDlq(id) {
  const job = get(id);
  if (!job) throw new Error('Job not found');
  if (job.state !== 'dead') throw new Error('Job is not in DLQ');
  const now = dayjs().toISOString();
  db.prepare(`UPDATE jobs SET state='pending', attempts=0, updated_at=?, next_run_at=NULL, worker=NULL WHERE id=?`).run(now, id);
  return get(id);
}

module.exports = { enqueue, statusSummary, list, get, moveToDead, retryFromDlq, updateJob };
