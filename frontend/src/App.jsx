import { useEffect, useState, useCallback } from 'react';
import './styles/dashboard.css';
import JobManagement from './components/JobManagement';
import WorkerControls from './components/WorkerControls';
import ErrorBoundary from './components/ErrorBoundary';
import { useToast } from './contexts/ToastContext';


function JobRow({ job, onRetry }) {
  const shortId = job?.id?.slice(0, 8) || '—';
  const command = job?.command || '-';
  const state = job?.state || '-';
  const attempts = typeof job?.attempts === 'number' ? job.attempts : '-';

  return (
    <tr>
      <td>{shortId}</td>
      <td className="job-command">{command}</td>
      <td><span className={`job-state state-${state}`}>{state}</span></td>
      <td>{attempts}</td>
      <td>
        {state === 'dead' && (
          <button className="btn btn-danger" onClick={() => onRetry(job.id)}>
            Retry
          </button>
        )}
      </td>
    </tr>
  );
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [stateFilter, setStateFilter] = useState('pending');
  const [command, setCommand] = useState('');
  const [status, setStatus] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast, ToastContainer } = useToast();

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  const api = useCallback(async (path, opts = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...opts,
        headers: {
          'Content-Type': 'application/json',
          ...opts.headers
        },
        signal: controller.signal
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text ? JSON.parse(text).error || text : res.statusText);
      }

      const data = await res.json();
      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setError(null);
    
    try {
      const [jobsResponse, statusResponse] = await Promise.all([
        api(`/api/jobs?state=${stateFilter}`),
        api('/api/status')
      ]);

      setJobs(jobsResponse.data || []);
      setStatus(statusResponse || {});
    } catch (err) {
      setError(err.message);
      if (!quiet) {
        addToast(err.message, 'error');
      }
      setJobs([]);
      setStatus({});
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, [api, stateFilter, addToast]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [stateFilter]);

  const handleAction = async (action) => {
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const enqueue = () => {
    if (!command.trim()) return;
    return handleAction(async () => {
      await api('/api/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      setCommand('');
    });
  };

  const startWorkers = (count = 1) => handleAction(async () => {
    await api('/api/workers/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
  });

  const stopWorkers = () => handleAction(async () => {
    await api('/api/workers/stop', { method: 'POST' });
  });

  const retry = (id) => handleAction(async () => {
    await api('/api/dlq/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  });

  return (
    <ErrorBoundary>
      <div className="dashboard">
        <h1>QueueCTL Dashboard</h1>

        <div className="dashboard-grid">
          <section className="command-section">
            <div className="control-panel">
              <input
                type="text"
                className="command-input"
                value={command}
                onChange={e => setCommand(e.target.value)}
                placeholder="Enter command (e.g., echo hello)"
                onKeyDown={e => e.key === 'Enter' && enqueue()}
              />
              <button 
                className="btn btn-primary"
                onClick={enqueue}
                disabled={!command.trim() || isLoading}
              >
                {isLoading ? 'Enqueueing...' : 'Enqueue'}
              </button>
            </div>
          </section>

          <section className="worker-section">
            <WorkerControls
              onStart={startWorkers}
              onStop={stopWorkers}
              status={status}
              isLoading={isLoading}
            />
          </section>

          <section className="filter-section">
            <div className="filter-controls">
              <label htmlFor="stateFilter">Filter by state:</label>
              <select
                id="stateFilter"
                className="state-filter"
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
                disabled={isLoading}
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="dead">Dead</option>
              </select>
            </div>
          </section>

          <section className="status-section">
            <div className="status-panel">
              <h3>Queue Status</h3>
              {status.queues ? (
                <div className="status-grid">
                  {Object.entries(status.queues).map(([state, data]) => (
                    <div key={state} className={`status-card status-${state}`}>
                      <h4>{state}</h4>
                      <div className="status-count">{data.count}</div>
                      <div className="status-time">
                        Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="status-loading">Loading status...</div>
              )}
            </div>
          </section>

          <section className="jobs-section">
            {isLoading && jobs.length === 0 ? (
              <div className="loading-spinner">Loading jobs...</div>
            ) : (
              <JobManagement 
                jobs={jobs}
                onRetry={retry}
                isLoading={isLoading}
              />
            )}
          </section>
        </div>

        <ToastContainer />
      </div>
    </ErrorBoundary>
  );
}
