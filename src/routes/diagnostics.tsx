import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticScreen } from "@/components/DiagnosticScreen";

export const Route = createFileRoute("/diagnostics")({
  component: DiagnosticScreen,
});
