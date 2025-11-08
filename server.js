const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

const { enqueue, list, retryFromDlq, statusSummary, get: getJob } = require('./src/queue');
const { startWorkers, stopWorkers, cleanupStaleWorkers } = require('./src/worker');
const { read: readConfig, write: writeConfig } = require('./src/config');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request parsing
app.use(bodyParser.json());
app.use(morgan('dev')); // Logging

// Error handling middleware
function errorHandler(err, req, res, next) {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
}

// API rate limiting
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', apiLimiter);

// Jobs list with pagination
app.get('/api/jobs', async (req, res) => {
    try {
        const state = req.query.state || 'pending';
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        
        const rows = list(state, { offset, limit });
        res.json({
            page,
            limit,
            data: rows
        });
    } catch (err) {
        next(err);
    }
});

// Job details
app.get('/api/jobs/:id', async (req, res, next) => {
    try {
        const job = getJob(req.params.id);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json(job);
    } catch (err) {
        next(err);
    }
});

// Enqueue new job
app.post('/api/enqueue', async (req, res, next) => {
    try {
        const { command, max_retries } = req.body;
        
        if (!command || typeof command !== 'string') {
            return res.status(400).json({ error: 'Valid command string is required' });
        }
        
        const job = enqueue({ 
            command: command.trim(),
            max_retries: Math.min(Math.max(1, max_retries || 3), 10)
        });
        
        res.status(201).json({
            success: true,
            job
        });
    } catch (err) {
        next(err);
    }
});

// Queue status with worker health
app.get('/api/status', async (req, res, next) => {
    try {
        const summary = statusSummary();
        res.json({
            ...summary,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        next(err);
    }
});

// Worker controls with validation
app.post('/api/workers/start', async (req, res, next) => {
    try {
        const count = Math.min(Math.max(1, parseInt(req.body.count) || 1), 10);
        startWorkers(count);
        res.json({ 
            success: true, 
            workers: count,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        next(err);
    }
});

app.post('/api/workers/stop', async (req, res, next) => {
    try {
        stopWorkers();
        cleanupStaleWorkers();
        res.json({ 
            success: true,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        next(err);
    }
});

// Dead Letter Queue management
app.get('/api/dlq', async (req, res, next) => {
    try {
        const rows = list('dead');
        res.json({
            count: rows.length,
            jobs: rows
        });
    } catch (err) {
        next(err);
    }
});

app.post('/api/dlq/retry', async (req, res, next) => {
    try {
        if (!req.body.id) {
            return res.status(400).json({ error: 'Job ID is required' });
        }
        const job = retryFromDlq(req.body.id);
        res.json({
            success: true,
            job
        });
    } catch (err) {
        if (err.message.includes('not found') || err.message.includes('not in DLQ')) {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
});

// Config management with validation
app.get('/api/config', (req, res, next) => {
    try {
        const config = readConfig();
        res.json(config);
    } catch (err) {
        next(err);
    }
});

app.put('/api/config', (req, res, next) => {
    try {
        const newConfig = req.body;
        if (typeof newConfig !== 'object') {
            return res.status(400).json({ error: 'Invalid configuration format' });
        }
        
        writeConfig(newConfig);
        res.json({
            success: true,
            config: readConfig()
        });
    } catch (err) {
        next(err);
    }
});

// Add error handling middleware last
app.use(errorHandler);

// Cleanup on start
cleanupStaleWorkers();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// ✅ Config management
app.get('/api/config', (req, res) => {
  try {
    const conf = readConfig();
    res.json(conf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const conf = writeConfig(req.body);
    res.json(conf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ API server running at http://localhost:${PORT}`);
});
