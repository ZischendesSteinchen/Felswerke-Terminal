import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  widgetId: string;
  widgetType: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[WidgetErrorBoundary] Widget "${this.props.widgetType}" (${this.props.widgetId}) crashed:`,
      error,
      info,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="h-full flex flex-col items-center justify-center gap-3 p-4"
          style={{ backgroundColor: '#0a0e17' }}
        >
          <span className="text-red-400 text-xs font-semibold font-mono">
            Widget error
          </span>
          <span className="text-[10px] text-red-300/70 font-mono max-w-[240px] text-center break-words">
            {this.state.error?.message}
          </span>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs text-cyan-400 font-mono hover:underline"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
