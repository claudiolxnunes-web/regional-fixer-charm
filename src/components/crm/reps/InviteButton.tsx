import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Share2, Mail } from "lucide-react";
import { toast } from "sonner";

export function InviteButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "rep">("rep");
  const [loading, setLoading] = useState(false);

  async function sendEmail() {
    if (!user || !email) return;
    setLoading(true);
    try {
      const { data: tm } = await supabase.from("team_members").select("team_id").eq("user_id", user.id).maybeSingle();
      if (!tm?.team_id) throw new Error("Sem time associado");
      
      const { sendInviteWithTeam } = await import("@/lib/email.functions");
      await sendInviteWithTeam({ data: { email, role, teamId: tm.team_id, createdBy: user.id } });
      
      toast.success("Convite enviado por e-mail!");
      setOpen(false);
      setEmail("");
    } catch (e: any) {
      toast.error(e.message ?? "Falha");
    } finally {
      setLoading(false);
    }
  }

  async function inviteViaWhatsApp() {
    if (!user) return;
    setLoading(true);
    try {
      const { data: tm } = await supabase.from("team_members").select("team_id").eq("user_id", user.id).maybeSingle();
      if (!tm?.team_id) throw new Error("Sem time associado");

      const { data: inv, error } = await supabase
        .from("invites")
        .insert({
          team_id: tm.team_id,
          role,
          created_by: user.id,
        })
        .select("token")
        .single();

      if (error) throw error;

      const base = window.location.origin;
      const link = `${base}/login?invite=${inv.token}`;
      const message = encodeURIComponent(`Olá! Você foi convidado para participar da equipe no AgroGestão CRM como ${role === 'rep' ? 'Vendedor' : role}. Crie sua conta aqui: ${link}`);
      
      window.open(`https://wa.me/?text=${message}`, "_blank");
      toast.success("Link gerado e WhatsApp aberto!");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Share2 className="size-4" /> Convidar Membro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar para a equipe</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Função do novo membro</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rep">Vendedor / Representante</SelectItem>
                <SelectItem value="manager">Gestor</SelectItem>
                <SelectItem value="admin">Administrador (Total)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Convidar por E-mail</Label>
              <div className="flex gap-2">
                <Input 
                  type="email" 
                  placeholder="email@exemplo.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
                <Button onClick={sendEmail} disabled={loading || !email} size="icon" aria-label="Enviar convite por e-mail">
                  <Mail className="size-4" />
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full gap-2 border-green-500/50 hover:bg-green-50 hover:text-green-700 text-green-600"
              onClick={inviteViaWhatsApp}
              disabled={loading}
            >
              <MessageCircle className="size-4" />
              Gerar Link e Enviar via WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
