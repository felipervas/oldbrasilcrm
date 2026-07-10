// Webhook do Mercado Pago: atualiza pagamento e pedido, baixa/devolve estoque.
// Configure em https://www.mercadopago.com.br/developers (ou deixe que a
// notification_url enviada na preferência cuide disso automaticamente).
//
// Segurança: o webhook nunca confia no corpo recebido — apenas extrai o ID e
// consulta o pagamento diretamente na API do Mercado Pago com o access token.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders } from "../_shared/ecom.ts";

const ok = () => new Response("ok", { status: 200, headers: corsHeaders });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    // Formatos possíveis: {type:'payment', data:{id}} | ?topic=payment&id=123
    const tipo = body?.type || body?.topic || url.searchParams.get("topic") || url.searchParams.get("type");
    const paymentId = body?.data?.id || url.searchParams.get("id") || body?.resource;

    if (tipo !== "payment" || !paymentId) return ok();

    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN não configurado");
      return ok();
    }

    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${mpToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!mpResp.ok) {
      console.error(`Pagamento ${paymentId} não encontrado no MP (HTTP ${mpResp.status})`);
      return ok();
    }
    const pagamento = await mpResp.json();
    const pedidoId = pagamento.external_reference;
    if (!pedidoId) return ok();

    const supabase = adminClient();
    const { data: pedido } = await supabase
      .from("ecom_pedidos")
      .select("id, numero, status")
      .eq("id", pedidoId)
      .maybeSingle();
    if (!pedido) {
      console.error(`Pedido ${pedidoId} não encontrado para pagamento ${paymentId}`);
      return ok();
    }

    // approved | pending | in_process | rejected | refunded | charged_back | cancelled
    const statusMp: string = pagamento.status;
    const mapaStatus: Record<string, string> = {
      approved: "aprovado",
      pending: "pendente",
      in_process: "pendente",
      rejected: "recusado",
      refunded: "estornado",
      charged_back: "estornado",
      cancelled: "cancelado",
    };

    await supabase.from("ecom_pagamentos").upsert({
      pedido_id: pedido.id,
      gateway: "mercadopago",
      mp_payment_id: String(pagamento.id),
      metodo: pagamento.payment_method_id || pagamento.payment_type_id,
      status: mapaStatus[statusMp] || "pendente",
      valor: pagamento.transaction_amount || 0,
      parcelas: pagamento.installments || null,
      payload: {
        status: statusMp,
        status_detail: pagamento.status_detail,
        date_approved: pagamento.date_approved,
      },
    }, { onConflict: "mp_payment_id" });

    if (statusMp === "approved" && pedido.status === "aguardando_pagamento") {
      await supabase.from("ecom_pedidos").update({ status: "pago" }).eq("id", pedido.id);
      await supabase.rpc("ecom_baixar_estoque", { p_pedido_id: pedido.id });
      await supabase.from("ecom_pedido_eventos").insert({
        pedido_id: pedido.id,
        tipo: "pagamento_aprovado",
        descricao: `Pagamento aprovado (${pagamento.payment_method_id || "mercadopago"})`,
        dados: { mp_payment_id: pagamento.id, valor: pagamento.transaction_amount },
      });
    } else if (statusMp === "rejected") {
      await supabase.from("ecom_pedido_eventos").insert({
        pedido_id: pedido.id,
        tipo: "pagamento_recusado",
        descricao: `Pagamento recusado: ${pagamento.status_detail || "sem detalhe"}`,
        dados: { mp_payment_id: pagamento.id },
      });
    } else if (["refunded", "charged_back", "cancelled"].includes(statusMp)) {
      const eraPago = ["pago", "em_separacao", "enviado", "entregue"].includes(pedido.status);
      const novoStatus = statusMp === "cancelled" ? "cancelado" : "reembolsado";
      await supabase.from("ecom_pedidos").update({ status: novoStatus }).eq("id", pedido.id);
      if (eraPago) {
        await supabase.rpc("ecom_devolver_estoque", { p_pedido_id: pedido.id });
      }
      await supabase.from("ecom_pedido_eventos").insert({
        pedido_id: pedido.id,
        tipo: statusMp === "cancelled" ? "pedido_cancelado" : "pedido_reembolsado",
        descricao: `Status do Mercado Pago: ${statusMp}`,
        dados: { mp_payment_id: pagamento.id },
      });
    }

    return ok();
  } catch (e) {
    // Sempre responde 200 para o MP não reenfileirar indefinidamente;
    // o erro fica registrado nos logs da função.
    console.error("ecom-webhook-mercadopago:", e);
    return ok();
  }
});
