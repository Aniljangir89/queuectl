import React, { useState } from 'react';

export default function JobManagement({ jobs, onRetry }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Filter jobs based on search term
  const filteredJobs = jobs.filter(job => 
    job.command?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const JobDetailsModal = ({ job, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Job Details</h3>
        <div className="job-details">
          <div className="detail-row">
            <span>ID:</span>
            <span>{job.id}</span>
          </div>
          <div className="detail-row">
            <span>Command:</span>
            <span>{job.command}</span>
          </div>
          <div className="detail-row">
            <span>State:</span>
            <span className={`job-state state-${job.state}`}>{job.state}</span>
          </div>
          <div className="detail-row">
            <span>Attempts:</span>
            <span>{job.attempts}</span>
          </div>
          {job.error && (
            <div className="detail-row">
              <span>Error:</span>
              <pre className="error-details">{job.error}</pre>
            </div>
          )}
        </div>
        {job.state === 'dead' && (
          <button 
            className="btn btn-danger"
            onClick={() => {
              onRetry(job.id);
              onClose();
            }}
          >
            Retry Job
          </button>
        )}
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="job-management">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search jobs by command, ID, or state..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1); // Reset to first page when searching
          }}
          className="search-input"
        />
      </div>

      <table className="jobs-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Command</th>
            <th>State</th>
            <th>Attempts</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedJobs.map(job => (
            <tr key={job.id || Math.random()} onClick={() => setSelectedJob(job)}>
              <td>{job.id?.slice(0, 8) || '—'}</td>
              <td className="job-command">{job.command || '-'}</td>
              <td>
                <span className={`job-state state-${job.state}`}>
                  {job.state || '-'}
                </span>
              </td>
              <td>{typeof job.attempts === 'number' ? job.attempts : '-'}</td>
              <td>
                {job.state === 'dead' && (
                  <button 
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry(job.id);
                    }}
                  >
                    Retry
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {selectedJob && (
        <JobDetailsModal 
          job={selectedJob} 
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}