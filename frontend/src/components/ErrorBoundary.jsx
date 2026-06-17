import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans text-center px-4">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <h1 className="text-3xl font-extrabold text-[#22C55E] mb-4">Oops!</h1>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 mb-6">We encountered an unexpected error on this page.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#22C55E] hover:bg-green-600 text-white font-bold px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
