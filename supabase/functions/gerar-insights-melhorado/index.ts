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
    
    console.log('Gerando insights melhorados para:', { prospectId, nomeEmpresa, segmento, cidade });

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

    // Buscar produtos cadastrados
    const { data: produtos, error: produtosError } = await supabaseClient
      .from('produtos')
      .select('nome, categoria, subcategoria, descricao')
      .eq('ativo', true)
      .limit(100);

    if (produtosError) {
      console.error('Erro ao buscar produtos:', produtosError);
    }

    const listaProdutos = produtos?.map(p => `${p.nome} (${p.categoria}${p.subcategoria ? ` - ${p.subcategoria}` : ''})`).join('\n') || '';

    const prompt = `Você é um assistente de vendas especializado em produtos de cacau e chocolate para o mercado B2B brasileiro.

IMPORTANTE: Use pesquisa no Google para encontrar informações reais sobre a empresa.

Analise a seguinte empresa:
- Nome: ${nomeEmpresa}
- Segmento: ${segmento || 'Não especificado'}
- Localização: ${cidade || 'Brasil'}

PRODUTOS DISPONÍVEIS NO CATÁLOGO:
${listaProdutos}

Retorne APENAS um JSON válido com esta estrutura exata (sem markdown):
{
  "resumo_empresa": "Uma linha curta e objetiva sobre o tipo de negócio (máx 50 palavras)",
  "produtos_recomendados": ["produto 1", "produto 2"],
  "dicas_abordagem": ["dica curta 1", "dica curta 2"],
  "informacoes_publicas": "Informações essenciais: telefone, site (se encontrar)"
}

REGRAS CRÍTICAS:
1. Use APENAS nomes exatos dos produtos da lista fornecida (máximo 2 produtos)
2. Seja MUITO CONCISO - respostas curtas e diretas
3. Pesquise no Google informações reais sobre "${nomeEmpresa} ${cidade}"
4. Dicas de abordagem devem ter no máximo 10 palavras cada
5. Se não encontrar informações, retorne "Não disponível"`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um assistente de vendas B2B com acesso a pesquisa na internet. SEMPRE pesquise informações reais no Google. Retorne JSON válido sem markdown.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0].message.content;
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

    return new Response(JSON.stringify(savedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
