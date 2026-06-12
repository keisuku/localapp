import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="bg-destructive/10 text-destructive flex size-16 items-center justify-center rounded-2xl">
            <TriangleAlert className="size-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">エラーが発生しました</h2>
            <p className="text-muted-foreground max-w-md text-sm">
              予期しないエラーが発生しました。再読み込みしても解決しない場合は、
              設定画面からバックアップを取得してデータを保全してください。
            </p>
            <pre className="bg-muted text-muted-foreground mx-auto mt-3 max-w-lg overflow-auto rounded-md p-3 text-left text-xs">
              {this.state.error.message}
            </pre>
          </div>
          <button
            className="bg-primary text-primary-foreground inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-4 text-sm font-medium hover:opacity-90"
            onClick={() => location.reload()}
          >
            <RotateCcw className="size-4" />
            再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
