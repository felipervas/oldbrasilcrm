// Checkout: converte o carrinho em pedido e cria a preferência de pagamento
// no Mercado Pago (PIX, cartão e boleto via Checkout Pro).
//
// Tudo é revalidado no servidor: preços, estoque, cupom e frete — o valor
// enviado pelo front nunca é usado para cobrança.
//
// Entrada:
// {
//   session_token,
//   cliente: { nome, email, telefone?, cpf_cnpj? },
//   endereco: { cep, logradouro, numero, complemento?, bairro?, cidade, uf },
//   frete_servico,           // id retornado por ecom-frete (ex.: "correios_03298")
//   observacoes?
// }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminClient, calcularFreteOpcoes, corsHeaders, erro, json,
  montarCarrinho, precoUnitario, PRODUTO_SELECT, ProdutoEcom,
} from "../_shared/ecom.ts";

const round2 = (n: number) => Math.round(n * 100) / 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = adminClient();
    const body = await req.json().catch(() => ({}));
    const { session_token, cliente, endereco, frete_servico, observacoes } = body;

    if (!session_token) return erro("session_token é obrigatório");
    if (!cliente?.nome || !cliente?.email) return erro("Nome e e-mail do cliente são obrigatórios");
    if (!endereco?.cep || !endereco?.logradouro || !endereco?.numero || !endereco?.cidade || !endereco?.uf) {
      return erro("Endereço de entrega incompleto");
    }
    if (!frete_servico) return erro("Selecione uma opção de frete");

    const { data: config } = await supabase
      .from("ecom_config").select("*").eq("id", 1).single();
    if (config && config.checkout_ativo === false) {
      return erro("O checkout está temporariamente desativado", 503);
    }

    // Carrinho da sessão
    const { data: carrinhoRow } = await supabase
      .from("ecom_carrinhos")
      .select("id, cupom_id")
      .eq("session_token", session_token)
      .eq("status", "aberto")
      .maybeSingle();
    if (!carrinhoRow) return erro("Carrinho não encontrado ou já finalizado", 404);

    const { data: linhas } = await supabase
      .from("ecom_carrinho_itens")
      .select(`quantidade, produto_id, produtos(${PRODUTO_SELECT})`)
      .eq("carrinho_id", carrinhoRow.id);

    const itens = (linhas || []).filter((l: any) => l.produtos);
    if (itens.length === 0) return erro("Carrinho vazio");

    // Revalidação de disponibilidade e estoque
    for (const linha of itens as any[]) {
      const p = linha.produtos as ProdutoEcom;
      if (!p.ativo || !p.visivel_loja) {
        return erro(`O produto "${p.nome_loja || p.nome}" não está mais disponível`);
      }
      if (p.controlar_estoque && (p.saldo_estoque ?? 0) < linha.quantidade) {
        return erro(`Estoque insuficiente para "${p.nome_loja || p.nome}": restam ${p.saldo_estoque ?? 0}`);
      }
    }

    // Totais recalculados no servidor (inclui cupom via montarCarrinho)
    const carrinho = await montarCarrinho(supabase, carrinhoRow.id);
    const subtotal = carrinho.subtotal;
    const desconto = carrinho.desconto;

    // Frete recotado no servidor; o front só escolhe o serviço
    const { opcoes } = await calcularFreteOpcoes(
      supabase,
      endereco.cep,
      (itens as any[]).map((l) => ({ produto: l.produtos, quantidade: l.quantidade })),
    );
    const opcaoFrete = opcoes.find((o) => o.servico === frete_servico);
    if (!opcaoFrete) return erro("Opção de frete inválida — recalcule o frete");

    const freteValor = carrinho.cupom?.frete_gratis ? 0 : opcaoFrete.valor;
    const total = round2(Math.max(0, subtotal - desconto) + freteValor);

    // Cliente (guest checkout: upsert por e-mail)
    const { data: clienteRow, error: clienteErr } = await supabase
      .from("ecom_clientes")
      .upsert({
        email: cliente.email.trim().toLowerCase(),
        nome: cliente.nome,
        telefone: cliente.telefone || null,
        cpf_cnpj: cliente.cpf_cnpj || null,
      }, { onConflict: "email" })
      .select("id")
      .single();
    if (clienteErr) throw clienteErr;

    // Pedido
    const { data: pedido, error: pedidoErr } = await supabase
      .from("ecom_pedidos")
      .insert({
        carrinho_id: carrinhoRow.id,
        cliente_id: clienteRow.id,
        cliente_nome: cliente.nome,
        cliente_email: cliente.email.trim().toLowerCase(),
        cliente_telefone: cliente.telefone || null,
        cliente_cpf_cnpj: cliente.cpf_cnpj || null,
        endereco_entrega: {
          cep: endereco.cep,
          logradouro: endereco.logradouro,
          numero: endereco.numero,
          complemento: endereco.complemento || null,
          bairro: endereco.bairro || null,
          cidade: endereco.cidade,
          uf: endereco.uf,
        },
        subtotal,
        desconto,
        cupom_codigo: carrinho.cupom?.codigo || null,
        frete_valor: freteValor,
        frete_servico: opcaoFrete.nome,
        frete_prazo_dias: opcaoFrete.prazo_dias,
        total,
        observacoes: observacoes || null,
      })
      .select("id, numero")
      .single();
    if (pedidoErr) throw pedidoErr;

    const itensPedido = (itens as any[]).map((l) => {
      const p = l.produtos as ProdutoEcom;
      const preco = precoUnitario(p);
      return {
        pedido_id: pedido.id,
        produto_id: l.produto_id,
        nome_produto: p.nome_loja || p.nome,
        quantidade: l.quantidade,
        preco_unitario: preco,
        total: round2(preco * l.quantidade),
      };
    });
    const { error: itensErr } = await supabase.from("ecom_pedido_itens").insert(itensPedido);
    if (itensErr) throw itensErr;

    await supabase.from("ecom_pedido_eventos").insert({
      pedido_id: pedido.id,
      tipo: "pedido_criado",
      descricao: `Pedido #${pedido.numero} criado no checkout`,
    });

    // Consome o cupom e fecha o carrinho
    if (carrinhoRow.cupom_id) {
      const { data: cupomAtual } = await supabase
        .from("ecom_cupons").select("usos").eq("id", carrinhoRow.cupom_id).single();
      if (cupomAtual) {
        await supabase.from("ecom_cupons")
          .update({ usos: (cupomAtual.usos || 0) + 1 })
          .eq("id", carrinhoRow.cupom_id);
      }
    }
    await supabase.from("ecom_carrinhos")
      .update({ status: "convertido", cliente_id: clienteRow.id })
      .eq("id", carrinhoRow.id);

    // Pagamento via Mercado Pago Checkout Pro
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    let init_point: string | null = null;

    if (mpToken) {
      const lojaUrl = Deno.env.get("ECOM_STORE_URL") || req.headers.get("origin") || "";
      const notificationUrl =
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/ecom-webhook-mercadopago`;

      const preferencia = {
        external_reference: pedido.id,
        items: itensPedido.map((i) => ({
          id: i.produto_id,
          title: i.nome_produto,
          quantity: i.quantidade,
          unit_price: i.preco_unitario,
          currency_id: "BRL",
        })),
        payer: {
          name: cliente.nome,
          email: cliente.email.trim().toLowerCase(),
          phone: cliente.telefone ? { number: cliente.telefone } : undefined,
        },
        shipments: freteValor > 0 ? { cost: freteValor, mode: "not_specified" } : undefined,
        back_urls: lojaUrl ? {
          success: `${lojaUrl}/pedido/${pedido.numero}?status=sucesso`,
          pending: `${lojaUrl}/pedido/${pedido.numero}?status=pendente`,
          failure: `${lojaUrl}/pedido/${pedido.numero}?status=falha`,
        } : undefined,
        auto_return: lojaUrl ? "approved" : undefined,
        notification_url: notificationUrl,
        statement_descriptor: (config?.nome_loja || "LOJA").substring(0, 22),
      };

      // Cupom: aplica o desconto proporcionalmente nos itens, já que a API de
      // preferência não tem campo de desconto global.
      if (desconto > 0 && subtotal > 0) {
        const fator = (subtotal - desconto) / subtotal;
        preferencia.items = preferencia.items.map((i: any) => ({
          ...i,
          unit_price: round2(i.unit_price * fator),
        }));
      }

      const mpResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferencia),
        signal: AbortSignal.timeout(15000),
      });

      if (mpResp.ok) {
        const pref = await mpResp.json();
        init_point = pref.init_point;
        await supabase.from("ecom_pedidos")
          .update({ mp_preference_id: pref.id }).eq("id", pedido.id);
        await supabase.from("ecom_pagamentos").insert({
          pedido_id: pedido.id,
          gateway: "mercadopago",
          status: "pendente",
          valor: total,
        });
      } else {
        const mpErro = await mpResp.text();
        console.error("Mercado Pago recusou a preferência:", mpErro);
        await supabase.from("ecom_pedido_eventos").insert({
          pedido_id: pedido.id,
          tipo: "erro_pagamento",
          descricao: "Falha ao criar preferência no Mercado Pago",
          dados: { status: mpResp.status },
        });
      }
    }

    return json({
      pedido_id: pedido.id,
      numero: pedido.numero,
      total,
      subtotal,
      desconto,
      frete_valor: freteValor,
      frete_servico: opcaoFrete.nome,
      prazo_dias: opcaoFrete.prazo_dias,
      // URL do Checkout Pro do Mercado Pago (null se o gateway não está configurado)
      init_point,
    });
  } catch (e) {
    console.error("ecom-checkout:", e);
    return erro(e instanceof Error ? e.message : "Erro interno", 500);
  }
});
