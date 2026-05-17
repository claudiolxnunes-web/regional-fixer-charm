import * as React from "react";
import { AlertTriangle, RefreshCw, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Catches runtime errors thrown while rendering a route — including
 * "X is not defined" (missing symbol / broken import) — and shows a
 * readable message instead of a blank screen.
 */
export class RouteErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[RouteErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isMissingSymbol = /is not defined|Cannot find name|is not a function/i.test(error.message);

    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="max-w-xl w-full border border-destructive/30 bg-destructive/5 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <AlertTriangle className="size-5" />
            Erro ao renderizar esta página
          </div>
          <div className="text-sm">
            <p className="font-medium text-foreground">{error.message}</p>
            {isMissingSymbol && (
              <p className="text-muted-foreground mt-2">
                Provável símbolo ausente ou import quebrado. Verifique se o componente
                referenciado está exportado e importado corretamente.
              </p>
            )}
          </div>
          {error.stack && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Stack trace</summary>
              <pre className="mt-2 p-2 bg-background rounded border overflow-auto max-h-64">{error.stack}</pre>
            </details>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={this.reset} variant="outline">
              <RefreshCw className="size-4 mr-1" /> Tentar novamente
            </Button>
            <Button size="sm" onClick={() => location.reload()}>Recarregar página</Button>
          </div>
        </div>
      </div>
    );
  }
}
