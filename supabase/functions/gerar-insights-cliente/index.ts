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
    const { clienteId } = await req.json();
    
    if (!clienteId) {
      throw new Error('clienteId é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('*, pedidos(*), interacoes(*)')
      .eq('id', clienteId)
      .single();

    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    // Buscar produtos mais comprados
    const { data: produtosPedidos } = await supabase
      .from('pedidos_produtos')
      .select('produto_id, quantidade, produtos(nome, categoria)')
      .in('pedido_id', cliente.pedidos?.map((p: any) => p.id) || []);

    // Preparar contexto para a IA
    const contexto = {
      nomeCliente: cliente.nome_fantasia,
      cidade: cliente.cidade,
      uf: cliente.uf,
      segmento: cliente.segmento,
      totalPedidos: cliente.pedidos?.length || 0,
      ultimaCompra: cliente.ultima_compra_data,
      totalComprado: cliente.total_comprado,
      produtosComprados: produtosPedidos?.map((pp: any) => ({
        nome: pp.produtos?.nome,
        categoria: pp.produtos?.categoria,
        quantidade: pp.quantidade
      })) || [],
      ultimasInteracoes: cliente.interacoes?.slice(-5).map((i: any) => ({
        tipo: i.tipo,
        resultado: i.resultado,
        data: i.data_hora
      })) || []
    };

    const prompt = `Analise este cliente e forneça insights estratégicos para vendas:

Cliente: ${contexto.nomeCliente}
Localização: ${contexto.cidade}/${contexto.uf}
Segmento: ${contexto.segmento || 'Não informado'}
Total de Pedidos: ${contexto.totalPedidos}
Última Compra: ${contexto.ultimaCompra || 'Nunca'}
Total Comprado: R$ ${contexto.totalComprado || 0}

Produtos mais comprados:
${contexto.produtosComprados.map(p => `- ${p.nome} (${p.quantidade}x)`).join('\n')}

Últimas interações:
${contexto.ultimasInteracoes.map(i => `- ${i.tipo}: ${i.resultado} em ${i.data}`).join('\n')}

Forneça em formato JSON:
{
  "resumo": "Análise breve do perfil do cliente",
  "produtosRecomendados": ["produto1", "produto2", "produto3"],
  "oportunidadeUpsell": "Descrição da oportunidade de venda adicional",
  "riscos": "Possíveis riscos de perder o cliente",
  "proximaAcao": "Ação recomendada para próximo contato",
  "previsaoProximaCompra": "Estimativa de quando o cliente deve comprar novamente"
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
          { role: 'system', content: 'Você é um especialista em análise de vendas B2B. Responda sempre em JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro da IA:', aiResponse.status, errorText);
      throw new Error(`Erro ao gerar insights: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Extrair JSON do conteúdo
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    return new Response(JSON.stringify(insights), {
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