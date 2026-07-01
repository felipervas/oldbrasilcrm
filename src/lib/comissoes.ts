import { supabase } from "@/integrations/supabase/client";

export type RegraTipo = "base" | "marca" | "produto" | "bonus_meta";

export interface RegraComissao {
  id: string;
  nome: string;
  tipo: RegraTipo;
  alvo_id: string | null;
  alvo_nome: string | null;
  percentual: number;
  meta_percentual_min: number | null;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  ativo: boolean;
}

export interface BreakdownItem {
  produto_nome: string;
  produto_marca: string | null;
  subtotal: number;
  regra_tipo: RegraTipo;
  regra_nome: string;
  percentual: number;
  comissao: number;
}

export interface CalculoComissao {
  valor_bruto: number;
  comissao_base: number;
  comissao_bonus: number;
  comissao_total: number;
  breakdown: BreakdownItem[];
  bonus_aplicado: { nome: string; percentual: number } | null;
  percentual_meta_atingido: number;
}

interface ItemPedidoLite {
  produto_id: string | null;
  produto_nome: string | null;
  produto_marca: string | null;
  subtotal: number;
}

/** Busca regras ativas e aplicáveis na data de referência. */
export async function fetchRegrasAtivas(refDate = new Date()): Promise<RegraComissao[]> {
  const ref = refDate.toISOString().split("T")[0];
  const { data } = await supabase
    .from("regras_comissao" as any)
    .select("*")
    .eq("ativo", true)
    .lte("vigencia_inicio", ref);
  return ((data ?? []) as any[]).filter(
    (r) => !r.vigencia_fim || r.vigencia_fim >= ref
  ) as RegraComissao[];
}

/** Encontra a regra mais específica para um item: produto > marca > base. */
function selecionarRegra(
  item: ItemPedidoLite,
  regras: RegraComissao[]
): RegraComissao | null {
  // Produto (match por id ou por nome)
  const porProduto = regras.find(
    (r) =>
      r.tipo === "produto" &&
      ((item.produto_id && r.alvo_id === item.produto_id) ||
        (item.produto_nome &&
          r.alvo_nome &&
          r.alvo_nome.toLowerCase() === item.produto_nome.toLowerCase()))
  );
  if (porProduto) return porProduto;

  // Marca (match por nome)
  if (item.produto_marca) {
    const porMarca = regras.find(
      (r) =>
        r.tipo === "marca" &&
        ((r.alvo_nome &&
          r.alvo_nome.toLowerCase() === item.produto_marca!.toLowerCase()) ||
          r.nome.toLowerCase() === item.produto_marca!.toLowerCase())
    );
    if (porMarca) return porMarca;
  }

  return regras.find((r) => r.tipo === "base") ?? null;
}

/** Calcula comissão pura (sem bônus de meta). */
export function calcularComissaoBase(
  itens: ItemPedidoLite[],
  regras: RegraComissao[]
): { base: number; breakdown: BreakdownItem[] } {
  const breakdown: BreakdownItem[] = [];
  let totalBase = 0;

  for (const item of itens) {
    const subtotal = Number(item.subtotal ?? 0);
    if (subtotal <= 0) continue;

    const regra = selecionarRegra(item, regras);
    const pct = regra?.percentual ?? 0;
    const comissao = (subtotal * pct) / 100;

    breakdown.push({
      produto_nome: item.produto_nome ?? "—",
      produto_marca: item.produto_marca,
      subtotal,
      regra_tipo: regra?.tipo ?? "base",
      regra_nome: regra?.nome ?? "Sem regra",
      percentual: pct,
      comissao,
    });

    totalBase += comissao;
  }

  return { base: totalBase, breakdown };
}

/**
 * Calcula a comissão total do pedido considerando bônus por meta.
 * O bônus é aplicado sobre o valor bruto do pedido.
 */
export async function calcularComissaoPedido(
  pedidoId: string
): Promise<CalculoComissao | null> {
  // Carrega pedido + itens + regras
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, valor_total, representante_id, vendedor_id, created_at")
    .eq("id", pedidoId)
    .single();
  if (!pedido) return null;

  const vendedorId = (pedido.vendedor_id ?? pedido.representante_id) as string;
  const refDate = new Date(pedido.created_at);

  const [itensRes, regras, metaInfo] = await Promise.all([
    supabase
      .from("itens_pedido")
      .select("produto_id, produto_nome, produto_marca, subtotal")
      .eq("pedido_id", pedidoId),
    fetchRegrasAtivas(refDate),
    obterPercentualMetaAtingido(vendedorId, refDate),
  ]);

  const itens = (itensRes.data ?? []) as ItemPedidoLite[];
  const valorBruto = Number(pedido.valor_total ?? 0);

  const { base, breakdown } = calcularComissaoBase(itens, regras);

  // Bônus por meta — pega o maior bônus elegível
  const bonusElegiveis = regras
    .filter(
      (r) =>
        r.tipo === "bonus_meta" &&
        r.meta_percentual_min !== null &&
        metaInfo.percentualAtingido >= Number(r.meta_percentual_min)
    )
    .sort((a, b) => Number(b.meta_percentual_min) - Number(a.meta_percentual_min));

  const bonusRegra = bonusElegiveis[0] ?? null;
  const bonusValor = bonusRegra ? (valorBruto * Number(bonusRegra.percentual)) / 100 : 0;

  return {
    valor_bruto: valorBruto,
    comissao_base: base,
    comissao_bonus: bonusValor,
    comissao_total: base + bonusValor,
    breakdown,
    bonus_aplicado: bonusRegra
      ? { nome: bonusRegra.nome, percentual: Number(bonusRegra.percentual) }
      : null,
    percentual_meta_atingido: metaInfo.percentualAtingido,
  };
}

/** Persiste o cálculo na tabela pedido_comissoes (upsert por pedido_id). */
export async function salvarComissaoPedido(pedidoId: string) {
  const calc = await calcularComissaoPedido(pedidoId);
  if (!calc) return null;

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("representante_id, vendedor_id")
    .eq("id", pedidoId)
    .single();
  const vendedorId = (pedido?.vendedor_id ?? pedido?.representante_id) as string;

  // Apaga existente e insere novo (UNIQUE em pedido_id)
  await supabase.from("pedido_comissoes" as any).delete().eq("pedido_id", pedidoId);

  await supabase.from("pedido_comissoes" as any).insert({
    pedido_id: pedidoId,
    vendedor_id: vendedorId,
    valor_bruto: calc.valor_bruto,
    comissao_base: calc.comissao_base,
    comissao_bonus: calc.comissao_bonus,
    comissao_total: calc.comissao_total,
    breakdown: calc.breakdown as any,
  });

  return calc;
}

/**
 * Calcula % atingido da meta no mês de uma data referência.
 * Soma valor_total dos pedidos do mês (status Confirmado/Enviado, não cancelados)
 * e divide pela meta cadastrada do mês.
 */
export async function obterPercentualMetaAtingido(
  vendedorId: string,
  refDate: Date = new Date()
): Promise<{ percentualAtingido: number; vendido: number; meta: number }> {
  const ano = refDate.getFullYear();
  const mes = refDate.getMonth() + 1;
  const inicio = new Date(ano, mes - 1, 1).toISOString();
  const fim = new Date(ano, mes, 0, 23, 59, 59).toISOString();

  const [pedidosRes, metaRes] = await Promise.all([
    supabase
      .from("pedidos")
      .select("valor_total, status")
      .eq("representante_id", vendedorId)
      .in("status", ["Enviado", "Confirmado"])
      .gte("created_at", inicio)
      .lte("created_at", fim),
    supabase
      .from("metas_mensais" as any)
      .select("meta_valor")
      .eq("vendedor_id", vendedorId)
      .eq("ano", ano)
      .eq("mes", mes)
      .maybeSingle(),
  ]);

  const vendido = (pedidosRes.data ?? []).reduce(
    (acc, p: any) => acc + Number(p.valor_total ?? 0),
    0
  );
  const meta = Number((metaRes.data as any)?.meta_valor ?? 0);
  const percentualAtingido = meta > 0 ? (vendido / meta) * 100 : 0;

  return { percentualAtingido, vendido, meta };
}
