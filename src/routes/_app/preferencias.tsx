import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_app/preferencias")({
  component: () => <ComingSoon title="Preferencias" />,
});
