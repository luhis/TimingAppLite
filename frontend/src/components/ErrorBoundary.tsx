/* eslint-disable functional/no-class-inheritance */
import React from "react";
import { trackException } from "../lib/appInsights";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    trackException(error, {
      componentStack: errorInfo.componentStack ?? "",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="section">
          <div className="container has-text-centered">
            <h1 className="title is-4">Something went wrong</h1>
            <p className="has-text-grey">Please try refreshing the page.</p>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
