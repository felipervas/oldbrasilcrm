import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageBase64 } = await req.json();
    
    if (!imageUrl && !imageBase64) {
      throw new Error('imageUrl ou imageBase64 é obrigatório');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Analisando boleto com IA...');

    // Construir a mensagem para a IA
    const content: any[] = [
      {
        type: "text",
        text: `Analise esta imagem de boleto bancário brasileiro e extraia as seguintes informações em formato JSON:
{
  "valor": number (valor em reais, apenas números),
  "data_vencimento": string (formato YYYY-MM-DD),
  "beneficiario": string (nome da empresa que vai receber),
  "codigo_barras": string (se visível, caso contrário null)
}

IMPORTANTE: 
- Retorne APENAS o JSON, sem texto adicional
- O valor deve ser número decimal (ex: 1500.50)
- A data deve estar no formato YYYY-MM-DD
- Se não conseguir identificar algum campo, use null`
      }
    ];

    // Adicionar a imagem
    if (imageBase64) {
      content.push({
        type: "image_url",
        image_url: {
          url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
        }
      });
    } else if (imageUrl) {
      content.push({
        type: "image_url",
        image_url: {
          url: imageUrl
        }
      });
    }

    // Chamar Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: content
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API Lovable AI:', response.status, errorText);
      throw new Error(`Erro ao analisar boleto: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('IA não retornou resposta');
    }

    console.log('Resposta da IA:', aiResponse);

    // Extrair JSON da resposta
    let resultado;
    try {
      // A IA pode retornar o JSON envolto em ```json ... ```
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      resultado = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Erro ao parsear resposta da IA:', parseError);
      throw new Error('Não foi possível extrair dados do boleto');
    }

    return new Response(JSON.stringify({
      success: true,
      data: resultado
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro em analisar-boleto:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});