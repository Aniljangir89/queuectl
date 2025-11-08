import React, { useState, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import LoadingSpinner from './LoadingSpinner';

export default function WorkerControls({ onStart, onStop, status, isLoading }) {
  const [workerCount, setWorkerCount] = useState(1);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const { showToast } = useToast();
  
  const activeWorkers = status?.activeWorkers || 0;
  const maxWorkers = 10;

  const handleStartWorkers = useCallback(async () => {
    try {
      setIsStarting(true);
      await onStart(workerCount);
      showToast('Workers started successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to start workers', 'error');
    } finally {
      setIsStarting(false);
    }
  }, [workerCount, onStart, showToast]);

  const handleStopWorkers = useCallback(async () => {
    try {
      setIsStopping(true);
      await onStop();
      showToast('Workers stopped successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to stop workers', 'error');
    } finally {
      setIsStopping(false);
    }
  }, [onStop, showToast]);

  return (
    <div className="worker-controls" role="region" aria-label="Worker Management">
      {isLoading ? (
        <div className="worker-loading">
          <LoadingSpinner />
          <p>Loading worker status...</p>
        </div>
      ) : (
        <>
          <div className="worker-status">
            <div className="status-indicator">
              <span className="status-label">Active Workers:</span>
              <span 
                className={`status-value ${activeWorkers > 0 ? 'status-active' : ''}`}
                role="status"
                aria-live="polite"
              >
                {activeWorkers}
              </span>
            </div>
            {activeWorkers > 0 && (
              <p className="status-message">
                {activeWorkers} worker{activeWorkers > 1 ? 's' : ''} currently processing jobs
              </p>
            )}
          </div>
          
          <div className="worker-actions">
            <div className="worker-count">
              <label htmlFor="workerCount">
                Worker Count:
                <span className="worker-count-help" title={`Maximum ${maxWorkers} workers allowed`}>
                  (1-{maxWorkers})
                </span>
              </label>
              <div className="worker-count-control">
                <button
                  type="button"
                  className="worker-count-btn"
                  onClick={() => setWorkerCount(c => Math.max(1, c - 1))}
                  disabled={workerCount <= 1 || isStarting}
                  aria-label="Decrease worker count"
                >
                  -
                </button>
                <input
                  id="workerCount"
                  type="number"
                  min="1"
                  max={maxWorkers}
                  value={workerCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) {
                      setWorkerCount(Math.max(1, Math.min(value, maxWorkers)));
                    }
                  }}
                  className="worker-count-input"
                  aria-label="Number of workers"
                />
                <button
                  type="button"
                  className="worker-count-btn"
                  onClick={() => setWorkerCount(c => Math.min(maxWorkers, c + 1))}
                  disabled={workerCount >= maxWorkers || isStarting}
                  aria-label="Increase worker count"
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="worker-buttons">
              <button 
                className="btn btn-primary"
                onClick={handleStartWorkers}
                disabled={isStarting || isStopping}
                aria-busy={isStarting}
              >
                {isStarting ? (
                  <>
                    <LoadingSpinner size="small" />
                    Starting...
                  </>
                ) : (
                  'Start Workers'
                )}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={handleStopWorkers}
                disabled={activeWorkers === 0 || isStarting || isStopping}
                aria-busy={isStopping}
              >
                {isStopping ? (
                  <>
                    <LoadingSpinner size="small" />
                    Stopping...
                  </>
                ) : (
                  'Stop All Workers'
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}