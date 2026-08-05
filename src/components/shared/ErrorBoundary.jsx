import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { env } from '@/lib/env';

/**
 * Catches render-time exceptions so one broken screen never blanks the portal.
 * Class component by necessity — hooks cannot express `componentDidCatch`.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    // Replace with your telemetry sink (Sentry, Datadog, ...) in production.
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;
    if (fallback) return typeof fallback === 'function' ? fallback(error, this.handleReset) : fallback;

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-card border border-line bg-surface p-7 text-center shadow-card">
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-danger-soft">
            <AlertTriangle className="size-5 text-danger" aria-hidden="true" />
          </span>

          <h1 className="mt-4 text-lg font-semibold">Something went wrong</h1>
          <p className="mt-1.5 text-[13px] text-ink-soft">
            An unexpected error interrupted this screen. You can retry, or return to the dashboard.
          </p>

          {env.isDev && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-black/5 p-3 text-left text-[11px] text-danger">
              {error.message}
            </pre>
          )}

          <div className="mt-5 flex justify-center gap-2.5">
            <Button variant="primary" onClick={this.handleReset}>
              Try again
            </Button>
            <Button onClick={() => window.location.assign('/')}>Go to dashboard</Button>
          </div>
        </div>
      </div>
    );
  }
}
