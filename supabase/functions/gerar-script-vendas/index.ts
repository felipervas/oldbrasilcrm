const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clienteNome, segmento, situacao, objetivo } = await req.json();
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const prompt = `Crie um script de vendas personalizado para:

Cliente: ${clienteNome}
Segmento: ${segmento || 'Não informado'}
Situação: ${situacao || 'Primeiro contato'}
Objetivo: ${objetivo || 'Apresentar produtos'}

Estruture o script em formato JSON:
{
  "abertura": "Como iniciar a conversa (2-3 frases)",
  "descoberta": ["pergunta1 para entender necessidades", "pergunta2", "pergunta3"],
  "apresentacao": "Como apresentar a solução (3-4 parágrafos)",
  "objecoes": [
    {"objecao": "Está caro", "resposta": "como responder"},
    {"objecao": "Já tenho fornecedor", "resposta": "como responder"},
    {"objecao": "Preciso pensar", "resposta": "como responder"}
  ],
  "fechamento": "Como conduzir o fechamento",
  "proximoPasso": "Próximo passo sugerido"
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
          { role: 'system', content: 'Você é um consultor de vendas B2B experiente. Responda sempre em JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Erro ao gerar script: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const script = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    return new Response(JSON.stringify(script), {
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