import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_app/atividades")({
  component: () => <ComingSoon title="Atividades" />,
});
