// Gera follow-ups automáticos para clientes em "atencao", "em_risco" ou "inativo".
// Nunca duplica: se já existir followup pendente do tipo "retencao" para o cliente, ignora.
// Chamado pelo client-side (uma vez por dia por usuário, controlado por localStorage).

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Mantém os limiares aqui também — sincronizados com src/lib/retencao.ts
const DIAS_ATENCAO = 30;
const DIAS_EM_RISCO = 45;
const DIAS_INATIVO = 60;
const RATIO_ATENCAO = 1.5;
const RATIO_EM_RISCO = 2.0;

type Status = "ativo" | "atencao" | "em_risco" | "inativo" | "novo";

function classifica(dias: number | null, media: number | null, total: number): Status {
  const ratio = dias != null && media && media > 0 ? dias / media : null;
  if (total === 0 || dias == null) return "novo";
  if (dias > DIAS_INATIVO) return "inativo";
  if (dias > DIAS_EM_RISCO || (ratio != null && ratio >= RATIO_EM_RISCO)) return "em_risco";
  if (dias > DIAS_ATENCAO || (ratio != null && ratio >= RATIO_ATENCAO)) return "atencao";
  return "ativo";
}

function sugestao(status: Status) {
  switch (status) {
    case "atencao":
      return { acao: "Enviar mensagem por WhatsApp para reativar contato.", tipo: "whatsapp" };
    case "em_risco":
      return { acao: "Ligar para entender o que está acontecendo.", tipo: "ligacao" };
    case "inativo":
      return { acao: "Enviar oferta de recuperação personalizada.", tipo: "outro" };
    default:
      return { acao: "Acompanhar normalmente.", tipo: "outro" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthenticated", detail: userErr?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: userData.user.id };

    // 1) Pega clientes do vendedor (RLS já restringe)
    const { data: clientes, error: cErr } = await supabase
      .from("clientes")
      .select("id, nome_loja, representante_id, status")
      .neq("status", "inativo")
      .limit(5000);
    if (cErr) throw cErr;

    if (!clientes || clientes.length === 0) {
      return new Response(JSON.stringify({ created: 0, skipped: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clienteIds = clientes.map((c) => c.id);

    // Helper para fazer .in() em lotes (evita URL muito longa → 400 Bad Request)
    async function fetchInBatches<T>(
      ids: string[],
      fetcher: (chunk: string[]) => Promise<{ data: T[] | null; error: any }>,
    ): Promise<T[]> {
      const size = 200;
      const out: T[] = [];
      for (let i = 0; i < ids.length; i += size) {
        const chunk = ids.slice(i, i + size);
        const { data, error } = await fetcher(chunk);
        if (error) throw error;
        if (data) out.push(...data);
      }
      return out;
    }

    // 2) Métricas em lote
    const metricas = await fetchInBatches<any>(clienteIds, (chunk) =>
      supabase.from("cliente_retencao_metrics").select("*").in("cliente_id", chunk),
    );

    const metricMap = new Map<string, any>();
    metricas.forEach((m: any) => metricMap.set(m.cliente_id, m));

    // 3) Follow-ups de retenção já existentes (pendentes) — pra não duplicar
    const existentes = await fetchInBatches<any>(clienteIds, (chunk) =>
      supabase
        .from("followups")
        .select("client_id")
        .eq("type", "retencao")
        .eq("status", "pendente")
        .in("client_id", chunk),
    );
    const jaTem = new Set(existentes.map((f: any) => f.client_id));


    const hoje = new Date().toISOString().slice(0, 10);
    const novos: any[] = [];
    let skipped = 0;

    for (const c of clientes) {
      if (jaTem.has(c.id)) {
        skipped++;
        continue;
      }
      const m = metricMap.get(c.id);
      const dias = m?.dias_desde_ultima_compra == null ? null : Number(m.dias_desde_ultima_compra);
      const media = m?.intervalo_medio_dias == null ? null : Number(m.intervalo_medio_dias);
      const total = Number(m?.total_pedidos ?? 0);
      const status = classifica(dias, media, total);
      if (status === "ativo" || status === "novo") {
        skipped++;
        continue;
      }
      const sug = sugestao(status);
      const motivo =
        media && dias != null
          ? `${dias} dias sem pedir — média do cliente é ${Math.round(media)} dias`
          : dias != null
          ? `${dias} dias sem pedir`
          : "Cliente sem compras recentes";

      novos.push({
        client_id: c.id,
        assigned_to: c.representante_id ?? user.id,
        due_date: hoje,
        type: sug.tipo,
        subject: `Follow-up: ${c.nome_loja}`,
        notes: `[Retenção / ${status}] ${motivo}\nSugestão: ${sug.acao}`,
        status: "pendente",
      });
    }

    let created = 0;
    if (novos.length > 0) {
      // Reatribui type=retencao para todos (mantém type real no notes; usamos campo type do followups)
      // Mas o schema permite usar type livre — vamos usar 'retencao' como type pra facilitar dedup no futuro.
      const payload = novos.map((n) => ({ ...n, type: "retencao" }));
      const { error: insErr, count } = await supabase.from("followups").insert(payload, { count: "exact" });
      if (insErr) throw insErr;
      created = count ?? payload.length;
    }

    return new Response(JSON.stringify({ created, skipped, total_clientes: clientes.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const detail = err?.message || err?.error_description || JSON.stringify(err);
    console.error("[gerar-followups-retencao]", detail, err);
    return new Response(JSON.stringify({ error: detail }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
