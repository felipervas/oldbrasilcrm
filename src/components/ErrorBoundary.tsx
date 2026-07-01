import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-xl w-full rounded-lg border border-border bg-card p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-destructive mb-2">
              Algo deu errado ao carregar a tela
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || "Erro desconhecido."}
            </p>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64 mb-4">
              {this.state.error?.stack}
            </pre>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm"
              >
                Recarregar
              </button>
              <button
                onClick={this.handleReset}
                className="px-3 py-2 rounded border border-border text-sm"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
