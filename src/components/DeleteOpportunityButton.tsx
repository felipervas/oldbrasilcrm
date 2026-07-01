import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

interface Props {
  opportunityId: string;
  ownerId: string;
  title?: string;
  variant?: "icon" | "button";
  className?: string;
  onDeleted?: () => void;
}

/**
 * Soft delete de oportunidade com confirmação.
 * Permitido se o usuário for o dono OU admin/gestor.
 */
export function DeleteOpportunityButton({ opportunityId, ownerId, title, variant = "icon", className, onDeleted }: Props) {
  const { user } = useAuth();
  const { isAdminOrGestor } = useUserRole();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const canDelete = !!user && (user.id === ownerId || isAdminOrGestor);
  if (!canDelete) return null;

  const handleConfirm = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("opportunities")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq("id", opportunityId);
    setBusy(false);
    setOpen(false);
    if (error) {
      toast.error("Erro ao excluir oportunidade");
      return;
    }
    toast.success("Oportunidade excluída");
    onDeleted?.();
  };

  return (
    <>
      {variant === "icon" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive", className)}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          aria-label="Excluir oportunidade"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive", className)}
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Excluir
        </Button>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Excluir oportunidade?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Esta ação é permanente e {title ? <strong>"{title}"</strong> : "a oportunidade"} será removida do pipeline.
              <br />O histórico ficará retido apenas para auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
