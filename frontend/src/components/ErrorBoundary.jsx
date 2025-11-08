import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(/* error */) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary p-4 bg-red-50 rounded">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-red-700">
            {this.state.error ? this.state.error.toString() : 'Unexpected error'}
          </p>

          <div className="mt-4 flex gap-2">
            <button
              className="btn btn-primary px-3 py-1 bg-blue-600 text-white rounded"
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                // reload optional:
                // window.location.reload();
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
