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
            role: 'system',
            content: `Você é um assistente especializado em extrair dados de pedidos de PDFs. 
Extraia as seguintes informações do PDF e retorne APENAS um JSON válido sem nenhum texto adicional:
{
  "numero_pedido": "número do pedido ou código",
  "data_pedido": "data no formato YYYY-MM-DD",
  "valor_total": número decimal,
  "observacoes": "quaisquer observações relevantes ou itens do pedido"
}

Se não encontrar algum dado, use null. Para valor_total, tente somar todos os valores se houver múltiplos itens.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia os dados deste pedido em PDF:'
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
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro da IA:', errorText);
      throw new Error(`Erro ao processar com IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices?.[0]?.message?.content || '{}';
    
    // Tentar fazer parse do JSON retornado
    let pedidoData;
    try {
      // Remover possíveis marcadores de código markdown
      const cleanedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      pedidoData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Erro ao fazer parse:', extractedText);
      // Se não conseguir fazer parse, retornar dados vazios
      pedidoData = {
        numero_pedido: null,
        data_pedido: new Date().toISOString().split('T')[0],
        valor_total: 0,
        observacoes: `Dados extraídos do PDF ${fileName}`
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
