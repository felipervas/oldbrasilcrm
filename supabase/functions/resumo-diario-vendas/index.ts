const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const hoje = new Date().toISOString().split('T')[0];
    const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sessentaDiasAtras = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // Buscar tarefas atrasadas usando fetch
    const tarefasRes = await fetch(
      `${supabaseUrl}/rest/v1/tarefas?status=eq.pendente&data_prevista=lt.${hoje}&select=*,clientes(nome_fantasia)`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const tarefasAtrasadas = await tarefasRes.json();

    // Buscar clientes em risco
    const clientesRes = await fetch(
      `${supabaseUrl}/rest/v1/clientes?ativo=eq.true&ultima_compra_data=lt.${sessentaDiasAtras}&select=nome_fantasia,ultima_compra_data,total_comprado`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const clientesRisco = await clientesRes.json();

    // Buscar novos leads
    const leadsRes = await fetch(
      `${supabaseUrl}/rest/v1/loja_leads?created_at=gte.${trintaDiasAtras}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const novosLeads = await leadsRes.json();

    // Buscar pedidos recentes
    const pedidosRes = await fetch(
      `${supabaseUrl}/rest/v1/pedidos?created_at=gte.${trintaDiasAtras}&select=valor_total,status`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const pedidosRecentes = await pedidosRes.json();

    const contexto = {
      tarefasAtrasadas: tarefasAtrasadas?.length || 0,
      clientesEmRisco: clientesRisco?.length || 0,
      novosLeads: novosLeads?.length || 0,
      pedidosMes: pedidosRecentes?.length || 0,
      faturamentoMes: pedidosRecentes?.reduce((sum: number, p: any) => sum + (p.valor_total || 0), 0) || 0,
      topClientesRisco: clientesRisco?.slice(0, 5).map((c: any) => ({
        nome: c.nome_fantasia,
        ultimaCompra: c.ultima_compra_data,
        valor: c.total_comprado
      })) || []
    };

    const prompt = `Analise estas métricas de vendas e gere um resumo executivo:

📊 MÉTRICAS:
- Tarefas atrasadas: ${contexto.tarefasAtrasadas}
- Clientes em risco: ${contexto.clientesEmRisco}
- Novos leads (30 dias): ${contexto.novosLeads}
- Pedidos no mês: ${contexto.pedidosMes}
- Faturamento no mês: R$ ${contexto.faturamentoMes.toFixed(2)}

🚨 TOP 5 CLIENTES EM RISCO:
${contexto.topClientesRisco.map((c: any) => `- ${c.nome} (última compra: ${c.ultimaCompra})`).join('\n')}

Forneça em formato JSON:
{
  "resumoGeral": "Análise geral da situação (2-3 parágrafos)",
  "alertasCriticos": ["alerta1", "alerta2", "alerta3"],
  "oportunidades": ["oportunidade1", "oportunidade2"],
  "acoesRecomendadas": [
    {"prioridade": "alta|media|baixa", "acao": "descrição", "prazo": "hoje|esta semana|este mês"},
    ...
  ],
  "metasDia": ["meta1", "meta2", "meta3"]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um analista de vendas estratégico. Responda sempre em JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Erro ao gerar resumo: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const resumo = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    return new Response(JSON.stringify({ ...resumo, metricas: contexto }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});