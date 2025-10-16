const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, clienteId, fileName } = await req.json();

    if (!imageBase64 || !clienteId) {
      throw new Error("Dados incompletos");
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Extrair apenas a parte base64 (remover o prefixo se existir)
    const base64Content = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const mimeType = imageBase64.includes('image/jpeg') ? 'image/jpeg' : 'image/png';

    console.log('Processando imagem do pedido...');

    // Chamar Lovable AI para extrair informações da imagem do pedido
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
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analise esta imagem de pedido da OLD Brasil e extraia APENAS as seguintes informações:

1. Número do Pedido (campo "Pedido:")
2. Data do pedido (formato YYYY-MM-DD)
3. Valor Total (valor total geral do pedido)
4. Lista de produtos com quantidade e valores para as observações

Retorne APENAS um JSON válido, SEM markdown, SEM explicações, neste formato exato:
{
  "numero_pedido": "491",
  "data_pedido": "2025-10-13",
  "valor_total": 19770.75,
  "observacoes": "LQX02 - LIQUOR DE CACAU XINGU 02 (175kg × R$69,24)\\nMCC01 - MANTEIGA DE CACAU CRYSTAL 01 (75kg × R$80,90)"
}

REGRAS IMPORTANTES:
- numero_pedido: apenas o número, sem prefixos
- data_pedido: formato YYYY-MM-DD
- valor_total: número decimal, sem R$ ou símbolos
- observacoes: lista de produtos separada por \\n, formato "CODIGO - NOME (quantidade × preço)"
- Retorne apenas o JSON puro, sem \`\`\`json ou qualquer markdown`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Content}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro da IA:', errorText);
      throw new Error(`Erro ao processar com IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('Resposta completa da IA:', JSON.stringify(aiData, null, 2));
    
    const extractedText = aiData.choices?.[0]?.message?.content || '{}';
    console.log('Texto extraído:', extractedText);
    
    // Tentar fazer parse do JSON retornado
    let pedidoData;
    try {
      // Remover marcadores de código markdown
      let cleanedText = extractedText.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Encontrar o JSON no texto
      const jsonStart = cleanedText.indexOf('{');
      const jsonEnd = cleanedText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
      }
      
      pedidoData = JSON.parse(cleanedText);
      console.log('Dados parseados:', pedidoData);
    } catch (parseError) {
      console.error('Erro ao fazer parse:', parseError);
      console.error('Texto original:', extractedText);
      // Se não conseguir fazer parse, retornar dados básicos
      pedidoData = {
        numero_pedido: null,
        data_pedido: new Date().toISOString().split('T')[0],
        valor_total: 0,
        valor_unitario: 0,
        observacoes: `Dados extraídos do PDF ${fileName || 'pedido'}\n\nErro ao processar: ${parseError}\n\nTexto retornado:\n${extractedText.substring(0, 500)}`
      };
    }

    return new Response(JSON.stringify(pedidoData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        numero_pedido: null,
        data_pedido: new Date().toISOString().split('T')[0],
        valor_total: 0,
        observacoes: 'Erro ao processar PDF - lançamento manual necessário'
      }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
