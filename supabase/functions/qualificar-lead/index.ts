import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const leadData = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar estatísticas de conversão por segmento
    const { data: stats } = await supabase
      .from('clientes')
      .select('segmento, total_comprado')
      .not('prospect_origem_id', 'is', null);

    const prompt = `Analise este lead e forneça uma qualificação:

Nome: ${leadData.nome}
Email: ${leadData.email || 'Não informado'}
Telefone: ${leadData.telefone || 'Não informado'}
Mensagem: ${leadData.mensagem || 'Sem mensagem'}
Origem: ${leadData.origem || 'Não informada'}

Contexto do mercado:
- Temos ${stats?.length || 0} clientes ativos
- Segmentos mais lucrativos: Alimentação, Confeitaria, Panificação

Forneça em formato JSON:
{
  "score": número de 0-100,
  "qualificacao": "frio|morno|quente",
  "prioridade": "baixa|media|alta",
  "segmentoEstimado": "segmento provável",
  "motivoScore": "explicação do score atribuído",
  "proximoPasso": "ação recomendada",
  "produtosSugeridos": ["produto1", "produto2"]
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
          { role: 'system', content: 'Você é um especialista em qualificação de leads B2B. Responda sempre em JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Erro ao qualificar lead: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const qualificacao = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    return new Response(JSON.stringify(qualificacao), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});