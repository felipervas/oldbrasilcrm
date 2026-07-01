import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeRetencao, RetencaoResult, RetencaoMetrics } from "@/lib/retencao";

/**
 * Hook em LOTE: traz métricas de retenção para todos os clientes acessíveis ao usuário.
 * Tolerante a falha — se a view não existir ou a query falhar, devolve mapa vazio
 * (status default "ativo" / dias null) em vez de quebrar a árvore React.
 */
export function useClientesRetencao() {
  const [data, setData] = useState<Map<string, RetencaoResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("cliente_retencao_metrics" as any)
        .select("*")
        .limit(5000);
      if (error) throw error;
      const map = new Map<string, RetencaoResult>();
      (rows ?? []).forEach((r: any) => {
        const m: RetencaoMetrics = {
          ultima_compra_data: r.ultima_compra_data,
          total_pedidos: Number(r.total_pedidos ?? 0),
          dias_desde_ultima_compra:
            r.dias_desde_ultima_compra == null ? null : Number(r.dias_desde_ultima_compra),
          intervalo_medio_dias:
            r.intervalo_medio_dias == null ? null : Number(r.intervalo_medio_dias),
        };
        map.set(r.cliente_id, computeRetencao(m));
      });
      setData(map);
      setError(null);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn("[useClientesRetencao] fallback (map vazio):", e?.message ?? e);
      setData(new Map());
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch().catch((e) => {
      // eslint-disable-next-line no-console
      console.warn("[useClientesRetencao] fetch crashed:", e);
    });
  }, [fetch]);

  return { retencaoMap: data, loading, error, refetch: fetch };
}

/**
 * Hook por CLIENTE: traz a métrica de um único cliente. Tolerante a falha.
 */
export function useClienteRetencao(clienteId: string | null | undefined) {
  const [result, setResult] = useState<RetencaoResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clienteId) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("cliente_retencao_metrics" as any)
          .select("*")
          .eq("cliente_id", clienteId)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        if (data) {
          const m: RetencaoMetrics = {
            ultima_compra_data: (data as any).ultima_compra_data,
            total_pedidos: Number((data as any).total_pedidos ?? 0),
            dias_desde_ultima_compra:
              (data as any).dias_desde_ultima_compra == null
                ? null
                : Number((data as any).dias_desde_ultima_compra),
            intervalo_medio_dias:
              (data as any).intervalo_medio_dias == null
                ? null
                : Number((data as any).intervalo_medio_dias),
          };
          setResult(computeRetencao(m));
        } else {
          setResult(null);
        }
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.warn("[useClienteRetencao] fallback:", e?.message ?? e);
        if (!active) return;
        setResult(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [clienteId]);

  return { retencao: result, loading };
}
