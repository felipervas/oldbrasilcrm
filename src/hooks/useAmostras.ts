import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Amostra {
  id: string;
  opportunity_id: string | null;
  cliente_id: string;
  produto_id: string;
  produto_nome: string;
  produto_marca: string | null;
  quantidade: number;
  data_envio: string;
  forma_envio: string | null;
  codigo_rastreio: string | null;
  observacoes: string | null;
  status: "enviada" | "recebida" | "aprovada" | "rejeitada" | "sem_retorno";
  feedback_cliente: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Filter {
  opportunityId?: string;
  clienteId?: string;
}

export function useAmostras(filter: Filter = {}) {
  const { user } = useAuth();
  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("amostras_enviadas").select("*").order("data_envio", { ascending: false });
    if (filter.opportunityId) q = q.eq("opportunity_id", filter.opportunityId);
    if (filter.clienteId) q = q.eq("cliente_id", filter.clienteId);
    const { data } = await q;
    setAmostras((data as Amostra[]) ?? []);
    setLoading(false);
  }, [user?.id, filter.opportunityId, filter.clienteId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { amostras, loading, refetch: fetch };
}
