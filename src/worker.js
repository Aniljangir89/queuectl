// src/worker.js
const { db } = require('./db');
const { read: readConfig } = require('./config');
const { spawn } = require('child_process');
const dayjs = require('dayjs');
const fs = require('fs');
const path = require('path');

const PID_PATH = path.join(__dirname, '..', 'data', 'worker.pid');

function pickAndLockJob(workerId) {
  // choose a pending job whose next_run_at is null or <= now
  const now = dayjs().toISOString();
  const pickStmt = db.prepare(`
  SELECT * FROM jobs
  WHERE state='pending' AND (next_run_at IS NULL OR next_run_at <= ?)
  ORDER BY created_at ASC
  LIMIT 1
  `);
  const job = pickStmt.get(now);
  if (!job) return null;

  // attempt to atomically mark it as processing
  const stmt = db.prepare(`
    UPDATE jobs SET state='processing', worker=?, updated_at=?, next_run_at=NULL
    WHERE id=? AND state='pending'
  `);
  const res = stmt.run(workerId, now, job.id);
  if (res.changes === 1) {
    return Object.assign({}, job, { state: 'processing', worker: workerId, updated_at: now });
  }
  return null;
}

function runCommand(job, workerId, onFinish) {
  const child = spawn(job.command, { shell: true });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (d) => stdout += d.toString());
  child.stderr.on('data', (d) => stderr += d.toString());

  child.on('close', (code) => {
    onFinish(code, stdout + (stderr ? `\nERR:${stderr}` : ''));
  });
  child.on('error', (err) => {
    onFinish(-1, '', err.message);
  });

  return child;
}

function computeNextRun(attempts, base) {
  // delay = base ^ attempts seconds
  const delaySeconds = Math.pow(base, attempts);
  return dayjs().add(Math.ceil(delaySeconds), 'second').toISOString();
}

function workerLoop(workerId, opts) {
  const config = readConfig();
  const pollInterval = config.poll_interval_seconds || opts.pollInterval || 2;
  const backoffBase = config.backoff_base || opts.backoffBase || 2;

  let shouldStop = false;
  let runningChild = null;

  async function loop() {
    while (!shouldStop) {
      try {
        const job = pickAndLockJob(workerId);
        if (!job) {
          await new Promise(r => setTimeout(r, pollInterval * 1000));
          continue;
        }

        // Execute job
        await new Promise((resolve) => {
          runningChild = runCommand(job, workerId, (exitCode, output, errMsg) => {
            runningChild = null;
            const now = dayjs().toISOString();
            const attempts = job.attempts + 1;
            const maxRetries = job.max_retries || config.max_retries || 3;

            if (exitCode === 0) {
              db.prepare(`UPDATE jobs SET state='completed', attempts=?, updated_at=?, last_exit_code=?, output=?, worker=NULL WHERE id=?`)
                .run(attempts, now, exitCode, output, job.id);
            } else {
              if (attempts > maxRetries) {
                db.prepare(`UPDATE jobs SET state='dead', attempts=?, updated_at=?, last_exit_code=?, last_error=?, output=?, worker=NULL WHERE id=?`)
                  .run(attempts, now, exitCode, errMsg || 'error', output, job.id);
              } else {
                // schedule retry
                const nextRun = computeNextRun(attempts, backoffBase);
                db.prepare(`UPDATE jobs SET state='pending', attempts=?, next_run_at=?, updated_at=?, last_exit_code=?, last_error=?, output=?, worker=NULL WHERE id=?`)
                  .run(attempts, nextRun, now, exitCode, errMsg || null, output, job.id);
              }
            }
            resolve();
          });
        });

      } catch (err) {
        console.error('Worker error:', err);
        await new Promise(r => setTimeout(r, pollInterval * 1000));
      }
    }
    // finish gracefully
    if (runningChild) {
      console.log(`[worker ${workerId}] waiting for current job to finish...`);
      await new Promise((r) => {
        const check = setInterval(() => {
          if (!runningChild) {
            clearInterval(check);
            r();
          }
        }, 500);
      });
    }
    console.log(`[worker ${workerId}] stopped`);
  }

  loop();

  return {
    stop: () => { shouldStop = true; }
  };
}

function startWorkers(count, opts = {}) {
  // write pid
  fs.writeFileSync(PID_PATH, String(process.pid));
  console.log(`Starting ${count} workers (pid=${process.pid}). Use 'queuectl worker stop' to stop.`);

  const controllers = [];
  for (let i = 0; i < count; i++) {
    const ctrl = workerLoop(`worker-${process.pid}-${i}`, opts);
    controllers.push(ctrl);
  }

  // handle signals -> graceful shutdown
  const shutdown = () => {
    console.log('Shutting down workers...');
    controllers.forEach(c => c.stop());
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function stopWorkers() {
  if (!fs.existsSync(PID_PATH)) {
    console.error('No worker PID file found. Are workers running?');
    process.exit(1);
  }
  const pid = parseInt(fs.readFileSync(PID_PATH, 'utf8'), 10);
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`Sent SIGTERM to pid ${pid}`);
    fs.unlinkSync(PID_PATH);
  } catch (e) {
    console.error('Failed to stop worker process:', e.message);
    process.exit(1);
  }
}

module.exports = { startWorkers, stopWorkers, PID_PATH };
