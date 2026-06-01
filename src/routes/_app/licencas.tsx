import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listLicenses, updateLicense, type LicenseRow } from "@/lib/licenses.functions";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Shield, Clock, Ban, RotateCw, Plus, TrendingUp, Users, Calendar } from "lucide-react";

export const Route = createFileRoute("/_app/licencas")({ component: LicencasPage });

function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR");
}

function daysLeft(s: string | null) {
  if (!s) return null;
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86400000);
}

function StatusBadge({ status, end }: { status: string | null; end: string | null }) {
  const dl = daysLeft(end);
  if (status === "canceled") return <Badge variant="destructive">Revogada</Badge>;
  if (status === "past_due") return <Badge className="bg-amber-500 text-white">Pagamento pendente</Badge>;
  if (dl !== null && dl <= 0) return <Badge variant="destructive">Vencida</Badge>;
  if (dl !== null && dl <= 14) return <Badge className="bg-amber-500 text-white">Vence em {dl}d</Badge>;
  return <Badge className="bg-emerald-600 text-white">Ativa</Badge>;
}

function LicensesPage() { /* alias */ return null; }
export { LicensesPage };

function LicencasPage() {
  const { roles } = useAuth();
  const isSA = roles.includes("superadmin");
  const fetch = useServerFn(listLicenses);
  const update = useServerFn(updateLicense);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["licenses"],
    queryFn: () => fetch(),
  });

  const mut = useMutation({
    mutationFn: (vars: { team_id: string; action: "extend" | "revoke" | "reactivate" | "set_end"; days?: number; end_date?: string }) =>
      update({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["licenses"] });
      toast.success("Licença atualizada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao atualizar"),
  });

  const [extending, setExtending] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 grid place-items-center">
            <Shield className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Licenças</h1>
            <p className="text-sm text-muted-foreground">
              {isSA
                ? "Painel de controle de todas as empresas e licenças."
                : "Licença da sua empresa e equipe de vendas."}
            </p>
          </div>
        </div>
        {isSA && data && (
          <div className="flex gap-2">
            <Card className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-none shadow-none">
              <Users className="size-4 text-muted-foreground" />
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Total Licenças</div>
                <div className="text-lg font-bold">{data.length}</div>
              </div>
            </Card>
            <Card className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-none shadow-none">
              <TrendingUp className="size-4 text-emerald-500" />
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Ativas</div>
                <div className="text-lg font-bold">{data.filter(l => l.subscription_status === 'active').length}</div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <Card><CardContent className="p-6 text-muted-foreground">Nenhuma licença encontrada.</CardContent></Card>
      )}

      <div className="grid gap-4">
        {data?.map((lic: LicenseRow) => {
          const dl = daysLeft(lic.current_period_end);
          return (
            <Card key={lic.team_id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div className="min-w-0">
                  <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                    {lic.team_name}
                    <StatusBadge status={lic.subscription_status} end={lic.current_period_end} />
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Titular: {lic.owner_email ?? "—"}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Plano</div>
                    <div className="font-medium capitalize">{lic.plan ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs flex items-center gap-1 mb-1">
                      <Calendar className="size-3" /> Validade
                    </div>
                    <div className="font-semibold">{fmtDate(lic.current_period_end)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Dias restantes</div>
                    <div className={`font-semibold ${(dl !== null && dl <= 7) ? 'text-destructive' : ''}`}>
                      {dl ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Membros / Reps</div>
                    <div className="font-medium">{lic.members_count} / {lic.reps.length}</div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap gap-2">
                  {extending === lic.team_id ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        min={1}
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value) || 30)}
                        className="w-24"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          mut.mutate({ team_id: lic.team_id, action: "extend", days });
                          setExtending(null);
                        }}
                        disabled={mut.isPending}
                      >
                        Confirmar +{days}d
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setExtending(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { setDays(30); setExtending(lic.team_id); }}>
                        <Plus className="size-4 mr-1" /> Estender prazo
                      </Button>
                      {lic.subscription_status !== "active" && (
                        <Button size="sm" variant="outline" onClick={() => mut.mutate({ team_id: lic.team_id, action: "reactivate" })}>
                          <RotateCw className="size-4 mr-1" /> Reativar
                        </Button>
                      )}
                      {isSA && lic.subscription_status !== "canceled" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm(`Revogar licença de "${lic.team_name}"?`)) {
                              mut.mutate({ team_id: lic.team_id, action: "revoke" });
                            }
                          }}
                        >
                          <Ban className="size-4 mr-1" /> Revogar
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {/* Vendedores (apenas admin do time / superadmin) */}
                {lic.reps.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                      <Clock className="size-3" /> Vendedores nesta licença
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lic.reps.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell className="text-muted-foreground">{r.email ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant={r.status === "active" ? "default" : "secondary"}>
                                {r.status === "active" ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
