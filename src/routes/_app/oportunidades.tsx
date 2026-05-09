import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_app/oportunidades")({
  component: () => <ComingSoon title="Oportunidades" />,
});
