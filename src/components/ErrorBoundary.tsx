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
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-alert)] border border-[var(--color-red-200)] flex items-center justify-center mb-4">
            <span className="text-xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Something went wrong</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1 max-w-md">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:brightness-90"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
