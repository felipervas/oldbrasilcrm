import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export interface SuggestedProduct {
  produto_id: string;
  nome: string;
  marca: string | null;
  imagem_url: string | null;
  preco: number;
  quantidade_total: number;
  vezes_comprado: number;
}

export interface RecompraData {
  loading: boolean;
  hasHistory: boolean;
  totalPedidos: number;
  intervaloMedio: number | null; // dias entre compras
  diasDesdeUltima: number | null;
  diasParaProxima: number | null; // negativo se já passou da janela
  naJanela: boolean; // está na hora de oferecer
  produtosSugeridos: SuggestedProduct[];
  ultimaCompra: string | null;
}

const EMPTY: RecompraData = {
  loading: true,
  hasHistory: false,
  totalPedidos: 0,
  intervaloMedio: null,
  diasDesdeUltima: null,
  diasParaProxima: null,
  naJanela: false,
  produtosSugeridos: [],
  ultimaCompra: null,
};

/**
 * Analisa o histórico de pedidos de um cliente e retorna sugestões de recompra.
 * - Considera apenas pedidos com status "Confirmado" ou "Enviado".
 * - Calcula intervalo médio entre datas de criação dos pedidos.
 * - "Na janela" quando dias desde a última compra >= 80% do intervalo médio.
 * - Lista os produtos mais recorrentes (somando quantidade × frequência).
 */
export function useRecompraSugestoes(clienteId: string | undefined) {
  const [data, setData] = useState<RecompraData>(EMPTY);

  useEffect(() => {
    if (!clienteId) {
      setData({ ...EMPTY, loading: false });
      return;
    }
    let cancelled = false;
    setData(prev => ({ ...prev, loading: true }));

    (async () => {
      // Busca pedidos do cliente (confirmados ou enviados)
      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("id, created_at, status")
        .eq("cliente_id", clienteId)
        .in("status", ["Confirmado", "Enviado"])
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (!pedidos || pedidos.length === 0) {
        setData({ ...EMPTY, loading: false });
        return;
      }

      // Calcula intervalo médio entre compras
      const datas = pedidos.map(p => new Date(p.created_at));
      let intervaloMedio: number | null = null;
      if (datas.length >= 2) {
        const diffs: number[] = [];
        for (let i = 0; i < datas.length - 1; i++) {
          diffs.push(differenceInDays(datas[i], datas[i + 1]));
        }
        const soma = diffs.reduce((a, b) => a + b, 0);
        intervaloMedio = Math.max(1, Math.round(soma / diffs.length));
      }

      const ultimaCompra = pedidos[0].created_at;
      const diasDesdeUltima = differenceInDays(new Date(), new Date(ultimaCompra));
      const diasParaProxima = intervaloMedio !== null ? intervaloMedio - diasDesdeUltima : null;
      const naJanela = intervaloMedio !== null && diasDesdeUltima >= intervaloMedio * 0.8;

      // Busca itens dos últimos 5 pedidos para ranqueamento
      const ultimosIds = pedidos.slice(0, 5).map(p => p.id);
      const { data: itens } = await supabase
        .from("itens_pedido")
        .select("produto_id, quantidade")
        .in("pedido_id", ultimosIds)
        .not("produto_id", "is", null);

      if (cancelled) return;

      // Agrega por produto_id
      const ranking = new Map<string, { quantidade_total: number; vezes_comprado: number }>();
      (itens ?? []).forEach(it => {
        if (!it.produto_id) return;
        const cur = ranking.get(it.produto_id) ?? { quantidade_total: 0, vezes_comprado: 0 };
        cur.quantidade_total += Number(it.quantidade) || 0;
        cur.vezes_comprado += 1;
        ranking.set(it.produto_id, cur);
      });

      const topIds = Array.from(ranking.entries())
        .sort((a, b) => b[1].vezes_comprado - a[1].vezes_comprado || b[1].quantidade_total - a[1].quantidade_total)
        .slice(0, 5)
        .map(([id]) => id);

      let produtosSugeridos: SuggestedProduct[] = [];
      if (topIds.length > 0) {
        const { data: prods } = await supabase
          .from("produtos")
          .select("id, nome, marca, imagem_url, preco, ativo")
          .in("id", topIds)
          .eq("ativo", true);

        if (cancelled) return;

        produtosSugeridos = (prods ?? [])
          .map(p => {
            const stats = ranking.get(p.id)!;
            return {
              produto_id: p.id,
              nome: p.nome,
              marca: p.marca,
              imagem_url: p.imagem_url,
              preco: Number(p.preco ?? 0),
              quantidade_total: stats.quantidade_total,
              vezes_comprado: stats.vezes_comprado,
            };
          })
          .sort((a, b) => b.vezes_comprado - a.vezes_comprado || b.quantidade_total - a.quantidade_total);
      }

      setData({
        loading: false,
        hasHistory: true,
        totalPedidos: pedidos.length,
        intervaloMedio,
        diasDesdeUltima,
        diasParaProxima,
        naJanela,
        produtosSugeridos,
        ultimaCompra,
      });
    })();

    return () => { cancelled = true; };
  }, [clienteId]);

  return data;
}
