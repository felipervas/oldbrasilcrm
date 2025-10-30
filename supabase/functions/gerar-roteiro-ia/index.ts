import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visitas, dataRota } = await req.json();
    
    console.log('Gerando roteiro para:', { quantidade: visitas.length, data: dataRota });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const visitasTexto = visitas.map((v: any, i: number) => 
      `${i + 1}. ${v.nome_empresa} - ${v.endereco || v.cidade}${v.horario ? ` às ${v.horario}` : ''}`
    ).join('\n');

    const prompt = `Você é um assistente de planejamento de rotas comerciais.

Crie um roteiro de visitas otimizado para o dia ${dataRota}:

VISITAS PROGRAMADAS:
${visitasTexto}

Gere um roteiro detalhado em markdown com:
1. **Resumo do Dia**: Total de visitas, distância estimada, tempo total
2. **Cronograma**: Ordem otimizada com horários sugeridos
3. **Dicas por Visita**: Preparação, pontos de atenção, oportunidades
4. **Checklist Pré-Rota**: Materiais, documentos, amostras necessárias
5. **Plano B**: Alternativas caso alguma visita não ocorra

Seja prático e focado em maximizar produtividade e vendas.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um especialista em otimização de rotas comerciais B2B.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
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
    const roteiro = aiData.choices[0].message.content;

    return new Response(JSON.stringify({ roteiro }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao gerar roteiro:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
