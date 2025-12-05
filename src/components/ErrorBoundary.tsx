import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
          <div className="max-w-lg w-full bg-slate-800 rounded-lg p-6 text-white">
            <h1 className="text-xl font-bold text-red-400 mb-4">Algo deu errado</h1>
            <p className="text-slate-300 mb-4">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <div className="bg-slate-900 rounded p-3 text-sm overflow-auto max-h-48 mb-4">
              <code className="text-red-300">
                {this.state.error?.message || "Erro desconhecido"}
              </code>
              {this.state.error?.stack && (
                <pre className="text-slate-400 text-xs mt-2 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
