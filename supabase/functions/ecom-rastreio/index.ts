// Consulta pública de pedido/rastreio: o cliente informa número do pedido +
// e-mail e recebe status, histórico e link de rastreamento nos Correios.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, erro, json } from "../_shared/ecom.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = adminClient();
    const { numero, email } = await req.json().catch(() => ({}));
    if (!numero || !email) return erro("Informe o número do pedido e o e-mail da compra");

    const { data: pedido } = await supabase
      .from("ecom_pedidos")
      .select("id, numero, status, codigo_rastreio, frete_servico, frete_prazo_dias, total, created_at")
      .eq("numero", parseInt(numero))
      .eq("cliente_email", String(email).trim().toLowerCase())
      .maybeSingle();

    if (!pedido) return erro("Pedido não encontrado — confira o número e o e-mail", 404);

    const { data: eventos } = await supabase
      .from("ecom_pedido_eventos")
      .select("tipo, descricao, created_at")
      .eq("pedido_id", pedido.id)
      .order("created_at", { ascending: true });

    return json({
      numero: pedido.numero,
      status: pedido.status,
      total: pedido.total,
      criado_em: pedido.created_at,
      frete_servico: pedido.frete_servico,
      prazo_dias: pedido.frete_prazo_dias,
      codigo_rastreio: pedido.codigo_rastreio,
      url_rastreio: pedido.codigo_rastreio
        ? `https://rastreamento.correios.com.br/app/index.php?objetos=${pedido.codigo_rastreio}`
        : null,
      eventos: eventos || [],
    });
  } catch (e) {
    console.error("ecom-rastreio:", e);
    return erro(e instanceof Error ? e.message : "Erro interno", 500);
  }
});
