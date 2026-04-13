import { Component } from 'react';
import { Link } from 'react-router-dom';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Error already captured in state via getDerivedStateFromError
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  handleRefresh() {
    window.location.reload();
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="bg-warm-bg min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-6">😔</p>
          <h1 className="font-display text-2xl font-bold text-ink mb-2">
            문제가 발생했어요
          </h1>
          <p className="text-ink-sub text-sm mb-8">
            잠시 후 다시 시도해주세요
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-6 overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={this.handleRefresh}
              className="w-full h-12 bg-brand text-white font-semibold rounded-full text-sm hover:bg-brand-hover transition-colors"
            >
              새로고침
            </button>
            <Link
              to="/"
              className="w-full h-12 flex items-center justify-center text-sm font-medium text-ink-sub border border-warm-border rounded-full hover:bg-white transition-colors"
            >
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
