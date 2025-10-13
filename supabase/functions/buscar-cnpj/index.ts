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
    const { cnpj } = await req.json();
    
    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'CNPJ é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpar CNPJ (remover pontuação)
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');

    console.log('Buscando CNPJ:', cnpjLimpo);

    // Tentar API BrasilAPI primeiro (mais confiável)
    try {
      const brasilApiResponse = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
        { 
          headers: { 'User-Agent': 'Lovable-CRM/1.0' },
          signal: AbortSignal.timeout(8000)
        }
      );

      if (brasilApiResponse.ok) {
        const data = await brasilApiResponse.json();
        
        return new Response(
          JSON.stringify({
            razao_social: data.razao_social || data.nome,
            nome_fantasia: data.nome_fantasia || data.razao_social,
            cnpj: data.cnpj,
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            cidade: data.municipio,
            uf: data.uf,
            cep: data.cep,
            telefone: data.ddd_telefone_1 || data.telefone,
            email: data.email,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      console.log('BrasilAPI falhou, tentando ReceitaWS:', error);
    }

    // Fallback: ReceitaWS
    const receitaResponse = await fetch(
      `https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`,
      { 
        headers: { 'User-Agent': 'Lovable-CRM/1.0' },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!receitaResponse.ok) {
      throw new Error('CNPJ não encontrado em nenhuma API');
    }

    const data = await receitaResponse.json();

    if (data.status === 'ERROR') {
      throw new Error(data.message || 'CNPJ não encontrado');
    }

    return new Response(
      JSON.stringify({
        razao_social: data.nome,
        nome_fantasia: data.fantasia || data.nome,
        cnpj: data.cnpj,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.municipio,
        uf: data.uf,
        cep: data.cep,
        telefone: data.telefone,
        email: data.email,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Não foi possível buscar os dados do CNPJ', 
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});