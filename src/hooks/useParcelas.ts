import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Parcela {
  id: string;
  pedido_id: string;
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  vencimento: string;
  status: string;
  pago_em: string | null;
  observacoes: string | null;
}

export function useParcelas(pedidoId?: string | null) {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    if (!pedidoId) { setParcelas([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("pedido_parcelas")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("numero_parcela");
    setParcelas((data as Parcela[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, [pedidoId]);

  const replaceAll = async (
    pid: string,
    novas: Array<{ numero_parcela: number; total_parcelas: number; valor: number; vencimento: string }>
  ) => {
    await supabase.from("pedido_parcelas").delete().eq("pedido_id", pid);
    if (novas.length > 0) {
      await supabase.from("pedido_parcelas").insert(
        novas.map((p) => ({ ...p, pedido_id: pid, status: "pendente" }))
      );
    }
    if (pid === pedidoId) await fetch();
  };

  const marcarPaga = async (id: string, pago: boolean) => {
    await supabase
      .from("pedido_parcelas")
      .update({ status: pago ? "pago" : "pendente", pago_em: pago ? new Date().toISOString() : null })
      .eq("id", id);
    await fetch();
  };

  return { parcelas, loading, fetch, replaceAll, marcarPaga };
}
