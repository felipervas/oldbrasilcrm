import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle2 } from "lucide-react";

interface Props {
  value: string;
  onChange: (userId: string) => void;
  label?: string;
  /** Se true, mostra mesmo para vendedor comum (default: false — só secretaria/gerente). */
  alwaysShow?: boolean;
}

interface Vendedor {
  user_id: string;
  nome: string;
  role: string;
}

/**
 * Seletor "Registrar como vendedor:" que aparece para secretária e gerente.
 * Para vendedor comum, retorna null (não mostra) e o componente pai usa o próprio user.id.
 */
export function VendedorSelect({ value, onChange, label = "Registrar como vendedor", alwaysShow = false }: Props) {
  const { user } = useAuth();
  const { canActAsOther, loading } = useUserRole();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  useEffect(() => {
    if (!canActAsOther && !alwaysShow) return;
    supabase
      .from("profiles")
      .select("user_id, nome, role")
      .order("nome")
      .then(({ data }) => {
        const list = (data ?? []).filter((p: any) => p.role !== "secretaria");
        setVendedores(list as Vendedor[]);
      });
  }, [canActAsOther, alwaysShow]);

  // Auto-seleciona o próprio usuário se nada estiver selecionado
  useEffect(() => {
    if (!value && user) onChange(user.id);
  }, [value, user, onChange]);

  if (loading) return null;
  if (!canActAsOther && !alwaysShow) return null;

  return (
    <div className="space-y-1.5 rounded-lg border-2 border-secondary/40 bg-secondary/5 p-3">
      <Label className="text-xs font-semibold flex items-center gap-1.5 text-secondary-foreground">
        <UserCircle2 className="h-3.5 w-3.5 text-secondary" />
        {label}
      </Label>
      <Select value={value || user?.id || ""} onValueChange={onChange}>
        <SelectTrigger className="min-h-[44px] bg-background">
          <SelectValue placeholder="Selecione o vendedor" />
        </SelectTrigger>
        <SelectContent>
          {vendedores.map((v) => (
            <SelectItem key={v.user_id} value={v.user_id}>
              {v.nome || "Sem nome"}
              {v.user_id === user?.id ? " (você)" : ""}
              {v.role === "gerente" ? " · gerente" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        Os registros serão salvos no nome do vendedor selecionado.
      </p>
    </div>
  );
}
