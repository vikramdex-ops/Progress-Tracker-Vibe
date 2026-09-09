import React from "react";

interface Props { children: React.ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center rise-in">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-alert)] border border-[var(--color-red-200)] dark:border-[var(--color-red-800)] flex items-center justify-center mb-4 shadow-sm">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Something went wrong</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 max-w-md leading-relaxed">
            {this.state.error?.message || "An unexpected error occurred while rendering this view."}
          </p>
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-medium text-white hover:brightness-105 shadow-sm cursor-pointer transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-default)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] cursor-pointer transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
