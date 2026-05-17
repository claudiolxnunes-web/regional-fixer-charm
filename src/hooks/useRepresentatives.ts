import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { repsService } from "@/services/crm.service";
import { toast } from "sonner";
import type { Representative } from "@/types/crm";

export function useRepresentatives() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["reps"],
    queryFn: () => repsService.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reps"] });
      toast.success("Removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: ({ payload, id }: { payload: Partial<Representative>; id?: string }) => 
      repsService.save(payload, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reps"] });
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    ...query,
    reps: query.data ?? [],
    deleteRep: deleteMutation.mutate,
    saveRep: saveMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    isSaving: saveMutation.isPending,
  };
}
