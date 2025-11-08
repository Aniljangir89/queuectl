import React from 'react';
import PropTypes from 'prop-types';

export default function LoadingSpinner({ size = 'medium', className = '' }) {
  const sizeClass = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large'
  }[size];

  return (
    <div 
      className={`loading-spinner ${sizeClass} ${className}`.trim()} 
      role="progressbar"
      aria-busy="true"
      aria-label="Loading"
    >
      <svg viewBox="0 0 50 50" className="spinner-svg">
        <circle
          className="spinner-path"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="5"
        />
      </svg>
    </div>
  );
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string
};