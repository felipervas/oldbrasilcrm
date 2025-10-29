import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prospectId, nomeEmpresa, segmento, cidade } = await req.json();
    
    console.log('Gerando insights para:', { prospectId, nomeEmpresa, segmento, cidade });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Credenciais Supabase não configuradas");
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const prompt = `Você é um assistente de vendas especializado em produtos de cacau e chocolate para o mercado B2B brasileiro.

Analise a seguinte empresa e forneça informações úteis para um vendedor:
- Nome: ${nomeEmpresa}
- Segmento: ${segmento || 'Não especificado'}
- Localização: ${cidade || 'Brasil'}

VALIDAÇÃO DE SEGMENTO:
Primeiro, analise se o segmento "${segmento || 'não informado'}" é coerente com o nome "${nomeEmpresa}".

Retorne APENAS um JSON válido com esta estrutura exata (sem markdown, sem formatação):
{
  "segmento_validado": true,
  "segmento_sugerido": null,
  "resumo_empresa": "Breve descrição do tipo de empresa e seu porte estimado (1-2 frases)",
  "produtos_recomendados": ["produto1", "produto2", "produto3"],
  "dicas_abordagem": ["dica1", "dica2", "dica3"],
  "informacoes_publicas": "Informações relevantes que você encontrar (site, contato, etc) ou 'Informações não disponíveis'"
}

Seja objetivo e focado em ajudar o vendedor a fechar vendas de produtos de cacau.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um assistente de vendas B2B. Retorne sempre JSON válido, sem formatação markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        console.error('Rate limit excedido');
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        console.error('Pagamento necessário');
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('Erro na API de IA:', aiResponse.status, errorText);
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0].message.content;
    
    // Remover markdown code blocks se existir
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log('Resposta da IA:', content);
    
    const insights = JSON.parse(content);

    // Salvar no banco
    const { data: savedData, error: dbError } = await supabaseClient
      .from('prospect_ia_insights')
      .upsert({
        prospect_id: prospectId,
        resumo_empresa: insights.resumo_empresa,
        produtos_recomendados: insights.produtos_recomendados,
        dicas_abordagem: insights.dicas_abordagem,
        informacoes_publicas: insights.informacoes_publicas,
        gerado_em: new Date().toISOString()
      }, {
        onConflict: 'prospect_id'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Erro ao salvar no banco:', dbError);
      throw dbError;
    }

    console.log('Insights salvos com sucesso');

    return new Response(JSON.stringify(savedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});