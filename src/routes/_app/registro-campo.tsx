import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_app/registro-campo")({
  component: () => <ComingSoon title="Registro de Campo" />,
});
