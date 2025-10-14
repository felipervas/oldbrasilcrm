import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, clienteId, fileName } = await req.json();

    if (!pdfBase64 || !clienteId) {
      throw new Error("Dados incompletos");
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Extrair apenas a parte base64 (remover o prefixo data:application/pdf;base64,)
    const base64Content = pdfBase64.split(',')[1] || pdfBase64;

    // Chamar Lovable AI para extrair informações do PDF
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
                text: `Analise este pedido/nota fiscal e extraia as informações principais.
                
Retorne APENAS um JSON válido com esta estrutura:
{
  "numero_pedido": "número do pedido",
  "data_pedido": "YYYY-MM-DD",
  "valor_total": número decimal,
  "valor_unitario": número decimal médio dos produtos,
  "observacoes": "resumo com produtos principais"
}

IMPORTANTE:
- Extraia o valor total
- Calcule um valor unitário médio dos produtos
- Nas observações, liste os principais produtos
- Converta valores para números (remova R$, símbolos)
- Retorne apenas o JSON, sem markdown`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Content}`
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
