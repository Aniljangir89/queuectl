#!/usr/bin/env node
// src/cli.js
const { program } = require('commander');
const { enqueue, statusSummary, list, retryFromDlq } = require('./queue');
const { startWorkers, stopWorkers } = require('./worker');
const { read: readConfig, write: writeConfig } = require('./config');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

program
  .name('queuectl')
  .description('CLI for QueueCTL - job queue')
  .version('0.1.0');

// ✅ FIXED enqueue command — handles split args (PowerShell safe)
program
  .command('enqueue')
  .description('Add a new job. Accepts either JSON like {"command":"echo hi"} or just a plain command string.')
  .argument('<input...>')
  .action((inputParts) => {
    const input = inputParts.join(' ');
    let obj;

    // If user just typed a command (not JSON), wrap it automatically
    if (!input.trim().startsWith('{')) {
      obj = { command: input };
    } else {
      try {
        obj = JSON.parse(input);
      } catch {
        console.error('❌ Invalid JSON:', input);
        process.exit(1);
      }
    }

    if (!obj.command) {
      console.error('❌ Job must include "command" field');
      process.exit(1);
    }

    obj.id = obj.id || uuidv4();
    obj.state = obj.state || 'pending';
    obj.attempts = obj.attempts || 0;
    obj.max_retries = obj.max_retries || 3;
    obj.created_at = dayjs().toISOString();
    obj.updated_at = obj.created_at;

    const enq = enqueue(obj);
    console.log('✅ Enqueued job:', enq.id);
  });


program
  .command('worker:start')
  .description('Start worker process in foreground')
  .option('--count <n>', 'number of worker threads', parseInt, 1)
  .action((opts) => startWorkers(opts.count || 1));

program
  .command('worker:stop')
  .description('Stop running worker process (reads pid file)')
  .action(() => stopWorkers());

program
  .command('status')
  .description('Show summary of job states')
  .action(() => {
    const rows = statusSummary();
    if (!rows || rows.length === 0) return console.log('No jobs found');
    rows.forEach((r) => console.log(`${r.state}: ${r.count}`));
  });

program
  .command('list')
  .description('List jobs by state')
  .option('--state <state>', 'pending | processing | completed | failed | dead', 'pending')
  .action((opts) => {
    const rows = list(opts.state);
    if (!rows.length) return console.log('No jobs found');
    rows.forEach(
      (j) =>
        console.log(
          `${j.id} | ${j.state} | attempts:${j.attempts} | cmd:${j.command} | next_run_at:${j.next_run_at || '-'}`
        )
    );
  });

program
  .command('dlq:list')
  .description('List DLQ (dead letter queue) jobs')
  .action(() => {
    const rows = list('dead');
    if (!rows.length) return console.log('No dead jobs');
    rows.forEach((r) =>
      console.log(`${r.id} | attempts:${r.attempts} | cmd:${r.command} | last_error:${r.last_error || '-'}`)
    );
  });

program
  .command('dlq:retry <id>')
  .description('Retry a job from DLQ (moves it back to pending)')
  .action((id) => {
    try {
      const job = retryFromDlq(id);
      console.log('🔁 Retried job:', job.id);
    } catch (e) {
      console.error('Error:', e.message);
    }
  });

program
  .command('config:set <key> <value>')
  .description('Set configuration (max_retries, backoff_base, poll_interval_seconds)')
  .action((key, value) => {
    const parsed = isNaN(Number(value)) ? value : Number(value);
    const conf = writeConfig({ [key]: parsed });
    console.log('⚙️  Config updated:', key, '->', conf[key]);
  });

program
  .command('config:get')
  .description('Show current configuration')
  .action(() => console.log(readConfig()));

program.parse(process.argv);
