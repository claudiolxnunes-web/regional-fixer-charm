import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsService } from "@/services/crm.service";
import { toast } from "sonner";
import type { Client } from "@/types/crm";

export function useClients(q: string = "") {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsService.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: ({ payload, id }: { payload: Partial<Client>; id?: string }) => 
      clientsService.save(payload, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (query.data ?? []).filter((c) =>
    [c.name, c.client_code, c.city, c.cnpj].some((v) => 
      (v ?? "").toLowerCase().includes(q.toLowerCase())
    )
  );

  return {
    ...query,
    clients: query.data ?? [],
    filtered,
    deleteClient: deleteMutation.mutate,
    saveClient: saveMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    isSaving: saveMutation.isPending,
  };
}
