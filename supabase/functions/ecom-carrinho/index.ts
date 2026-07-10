// Carrinho de compras da loja (público, identificado por session_token).
// Ações: get | add | update | remove | aplicar_cupom | remover_cupom | limpar
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminClient, corsHeaders, erro, json, montarCarrinho, PRODUTO_SELECT,
} from "../_shared/ecom.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = adminClient();
    const body = await req.json().catch(() => ({}));
    const { action, session_token, produto_id, quantidade, cupom_codigo } = body;

    if (!action) return erro("action é obrigatório");

    // Localiza (ou cria) o carrinho aberto da sessão
    let carrinho: { id: string } | null = null;
    if (session_token) {
      const { data } = await supabase
        .from("ecom_carrinhos")
        .select("id")
        .eq("session_token", session_token)
        .eq("status", "aberto")
        .maybeSingle();
      carrinho = data;
    }

    if (!carrinho) {
      if (action === "get") {
        // Sessão sem carrinho: devolve carrinho vazio sem criar linha no banco
        return json({
          id: null, session_token: null, status: "aberto",
          itens: [], subtotal: 0, cupom: null, desconto: 0, total: 0,
        });
      }
      const { data, error } = await supabase
        .from("ecom_carrinhos")
        .insert({})
        .select("id")
        .single();
      if (error) throw error;
      carrinho = data;
    }

    switch (action) {
      case "get":
        break;

      case "add": {
        if (!produto_id) return erro("produto_id é obrigatório");
        const qtd = Math.max(1, parseInt(quantidade) || 1);

        const { data: produto } = await supabase
          .from("produtos")
          .select(PRODUTO_SELECT)
          .eq("id", produto_id)
          .maybeSingle();
        if (!produto || !produto.ativo || !produto.visivel_loja) {
          return erro("Produto indisponível", 404);
        }

        const { data: existente } = await supabase
          .from("ecom_carrinho_itens")
          .select("id, quantidade")
          .eq("carrinho_id", carrinho.id)
          .eq("produto_id", produto_id)
          .maybeSingle();

        const novaQtd = (existente?.quantidade || 0) + qtd;
        if (produto.controlar_estoque && (produto.saldo_estoque ?? 0) < novaQtd) {
          return erro(`Estoque insuficiente: restam ${produto.saldo_estoque ?? 0} unidade(s)`);
        }

        if (existente) {
          await supabase.from("ecom_carrinho_itens")
            .update({ quantidade: novaQtd }).eq("id", existente.id);
        } else {
          await supabase.from("ecom_carrinho_itens")
            .insert({ carrinho_id: carrinho.id, produto_id, quantidade: qtd });
        }
        break;
      }

      case "update": {
        if (!produto_id) return erro("produto_id é obrigatório");
        const qtd = parseInt(quantidade);
        if (!Number.isFinite(qtd)) return erro("quantidade inválida");

        if (qtd <= 0) {
          await supabase.from("ecom_carrinho_itens")
            .delete().eq("carrinho_id", carrinho.id).eq("produto_id", produto_id);
        } else {
          const { data: produto } = await supabase
            .from("produtos")
            .select("saldo_estoque, controlar_estoque")
            .eq("id", produto_id)
            .maybeSingle();
          if (produto?.controlar_estoque && (produto.saldo_estoque ?? 0) < qtd) {
            return erro(`Estoque insuficiente: restam ${produto.saldo_estoque ?? 0} unidade(s)`);
          }
          await supabase.from("ecom_carrinho_itens")
            .update({ quantidade: qtd })
            .eq("carrinho_id", carrinho.id).eq("produto_id", produto_id);
        }
        break;
      }

      case "remove":
        if (!produto_id) return erro("produto_id é obrigatório");
        await supabase.from("ecom_carrinho_itens")
          .delete().eq("carrinho_id", carrinho.id).eq("produto_id", produto_id);
        break;

      case "aplicar_cupom": {
        if (!cupom_codigo) return erro("cupom_codigo é obrigatório");
        const parcial = await montarCarrinho(supabase, carrinho.id);
        const { data: validacao, error } = await supabase
          .rpc("ecom_validar_cupom", { p_codigo: cupom_codigo, p_subtotal: parcial.subtotal });
        if (error) throw error;
        if (!validacao?.valido) return erro(validacao?.motivo || "Cupom inválido");
        await supabase.from("ecom_carrinhos")
          .update({ cupom_id: validacao.cupom_id }).eq("id", carrinho.id);
        break;
      }

      case "remover_cupom":
        await supabase.from("ecom_carrinhos")
          .update({ cupom_id: null }).eq("id", carrinho.id);
        break;

      case "limpar":
        await supabase.from("ecom_carrinho_itens")
          .delete().eq("carrinho_id", carrinho.id);
        await supabase.from("ecom_carrinhos")
          .update({ cupom_id: null }).eq("id", carrinho.id);
        break;

      default:
        return erro(`Ação desconhecida: ${action}`);
    }

    return json(await montarCarrinho(supabase, carrinho.id));
  } catch (e) {
    console.error("ecom-carrinho:", e);
    return erro(e instanceof Error ? e.message : "Erro interno", 500);
  }
});
