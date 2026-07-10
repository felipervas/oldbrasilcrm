// Cotação de frete (público).
// Entrada: { cep_destino, session_token? , itens?: [{produto_id, quantidade}] }
// Usa o carrinho da sessão quando session_token é enviado; caso contrário,
// cota a lista de itens informada (ex.: página de produto).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminClient, calcularFreteOpcoes, corsHeaders, erro, json,
  ItemFrete, PRODUTO_SELECT, ProdutoEcom,
} from "../_shared/ecom.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = adminClient();
    const { cep_destino, session_token, itens } = await req.json().catch(() => ({}));
    if (!cep_destino) return erro("cep_destino é obrigatório");

    let itensFrete: ItemFrete[] = [];

    if (session_token) {
      const { data: carrinho } = await supabase
        .from("ecom_carrinhos")
        .select("id")
        .eq("session_token", session_token)
        .eq("status", "aberto")
        .maybeSingle();
      if (!carrinho) return erro("Carrinho não encontrado", 404);

      const { data: linhas } = await supabase
        .from("ecom_carrinho_itens")
        .select(`quantidade, produtos(${PRODUTO_SELECT})`)
        .eq("carrinho_id", carrinho.id);
      itensFrete = (linhas || [])
        .filter((l: any) => l.produtos)
        .map((l: any) => ({ produto: l.produtos as ProdutoEcom, quantidade: l.quantidade }));
    } else if (Array.isArray(itens) && itens.length > 0) {
      const ids = itens.map((i: any) => i.produto_id).filter(Boolean);
      const { data: produtos } = await supabase
        .from("produtos")
        .select(PRODUTO_SELECT)
        .in("id", ids);
      itensFrete = itens
        .map((i: any) => ({
          produto: (produtos || []).find((p: any) => p.id === i.produto_id) as ProdutoEcom,
          quantidade: Math.max(1, parseInt(i.quantidade) || 1),
        }))
        .filter((i: any) => i.produto);
    }

    if (itensFrete.length === 0) return erro("Nenhum item para cotar frete");

    const resultado = await calcularFreteOpcoes(supabase, cep_destino, itensFrete);
    return json(resultado);
  } catch (e) {
    console.error("ecom-frete:", e);
    return erro(e instanceof Error ? e.message : "Erro interno", 500);
  }
});
