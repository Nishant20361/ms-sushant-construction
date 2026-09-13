import { Component, type ReactNode } from "react";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="container-page flex min-h-screen items-center justify-center py-12">
        <div role="alert" className="card max-w-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">We couldn’t load this page</h1>
          <p className="mt-3 text-slate-600">Please reload the page to try again.</p>
          <button className="btn-primary mt-6" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </main>
    );
  }
}
