import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RegraComissao } from "@/lib/comissoes";

export interface MetaMensal {
  id: string;
  vendedor_id: string;
  ano: number;
  mes: number;
  meta_valor: number;
  observacoes: string | null;
}

export interface PedidoComissao {
  id: string;
  pedido_id: string;
  vendedor_id: string;
  valor_bruto: number;
  comissao_base: number;
  comissao_bonus: number;
  comissao_total: number;
  breakdown: any;
  calculado_em: string;
}

export function useRegrasComissao() {
  const [regras, setRegras] = useState<RegraComissao[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("regras_comissao" as any)
      .select("*")
      .order("tipo")
      .order("nome");
    setRegras((data ?? []) as unknown as RegraComissao[]);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { regras, loading, reload };
}

export function useMetasMensais(ano?: number, mes?: number) {
  const [metas, setMetas] = useState<MetaMensal[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("metas_mensais" as any).select("*").order("ano", { ascending: false }).order("mes", { ascending: false });
    if (ano) query = query.eq("ano", ano);
    if (mes) query = query.eq("mes", mes);
    const { data } = await query;
    setMetas((data ?? []) as unknown as MetaMensal[]);
    setLoading(false);
  }, [ano, mes]);

  useEffect(() => { reload(); }, [reload]);

  return { metas, loading, reload };
}

export function useComissoesPeriodo(ano: number, mes: number) {
  const [comissoes, setComissoes] = useState<PedidoComissao[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const inicio = new Date(ano, mes - 1, 1).toISOString();
    const fim = new Date(ano, mes, 0, 23, 59, 59).toISOString();
    const { data } = await supabase
      .from("pedido_comissoes" as any)
      .select("*")
      .gte("calculado_em", inicio)
      .lte("calculado_em", fim);
    setComissoes((data ?? []) as unknown as PedidoComissao[]);
    setLoading(false);
  }, [ano, mes]);

  useEffect(() => { reload(); }, [reload]);

  return { comissoes, loading, reload };
}
