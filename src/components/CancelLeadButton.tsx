import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  opportunityId: string;
  companyId?: string | null;
  status: string;
  onChanged?: () => void;
  className?: string;
  variant?: "button" | "icon";
}

export const LOSS_MOTIVOS = [
  "Preço",
  "Concorrência",
  "Sem interesse no momento",
  "Não respondeu",
  "Cliente fechou com outro fornecedor",
  "Fora do perfil",
  "Outro",
];
const motivos = LOSS_MOTIVOS;

export function CancelLeadButton({ opportunityId, companyId, status, onChanged, className, variant = "button" }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [motivo, setMotivo] = useState<string>("Sem interesse no momento");
  const [observacoes, setObservacoes] = useState("");
  const [busy, setBusy] = useState(false);

  const isLost = status === "lost";

  const handleCancel = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const lossText = observacoes ? `${motivo}: ${observacoes}` : motivo;
      const { error } = await supabase
        .from("opportunities")
        .update({ status: "lost", loss_reason: lossText })
        .eq("id", opportunityId);
      if (error) throw error;

      await supabase.from("timeline_events").insert({
        opportunity_id: opportunityId,
        company_id: companyId ?? null,
        user_id: user.id,
        event_type: "lost",
        description: `Lead cancelado. Motivo: ${lossText}`,
      });

      toast.success("Lead cancelado e registrado no histórico.");
      setOpen(false);
      setObservacoes("");
      onChanged?.();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao cancelar lead.");
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("opportunities")
        .update({ status: "open", loss_reason: null })
        .eq("id", opportunityId);
      if (error) throw error;

      await supabase.from("timeline_events").insert({
        opportunity_id: opportunityId,
        company_id: companyId ?? null,
        user_id: user.id,
        event_type: "note",
        description: "Lead reaberto.",
      });

      toast.success("Lead reaberto.");
      setReopenOpen(false);
      onChanged?.();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao reabrir lead.");
    } finally {
      setBusy(false);
    }
  };

  if (isLost) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReopenOpen(true)}
          className={cn("border-primary/40 text-primary hover:bg-primary/10", className)}
        >
          <RotateCcw className="h-4 w-4 mr-1" /> Reabrir lead
        </Button>

        <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reabrir oportunidade?</DialogTitle>
              <DialogDescription>
                A oportunidade voltará para o status "aberta". O motivo de perda registrado será mantido apenas no histórico.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReopenOpen(false)} disabled={busy}>Cancelar</Button>
              <Button onClick={handleReopen} disabled={busy}>
                {busy ? "Reabrindo..." : "Sim, reabrir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {variant === "icon" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          className={cn("h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive", className)}
          aria-label="Cancelar lead"
          title="Cancelar lead"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className={cn("border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive", className)}
        >
          <XCircle className="h-4 w-4 mr-1" /> Cancelar lead
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Cancelar lead
            </DialogTitle>
            <DialogDescription>
              Marque esta oportunidade como perdida. O registro continuará visível no histórico e em relatórios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {motivos.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações (opcional)</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                placeholder="Detalhes do que aconteceu..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Voltar</Button>
            <Button
              onClick={handleCancel}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Salvando..." : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
