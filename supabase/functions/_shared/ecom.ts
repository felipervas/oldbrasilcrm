// Utilitários compartilhados do motor de e-commerce.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function erro(mensagem: string, status = 400): Response {
  return json({ error: mensagem }, status);
}

// Cliente com service role: as edge functions são a única porta de escrita
// do carrinho/checkout — toda validação de preço/estoque acontece aqui.
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface ProdutoEcom {
  id: string;
  nome: string;
  nome_loja: string | null;
  ativo: boolean;
  visivel_loja: boolean;
  tipo_venda: string | null;
  preco_base: number | null;
  preco_por_kg: number | null;
  preco_promocional: number | null;
  peso_embalagem_kg: number | null;
  peso_unidade_kg: number | null;
  saldo_estoque: number | null;
  controlar_estoque: boolean;
  altura_cm: number | null;
  largura_cm: number | null;
  comprimento_cm: number | null;
  produto_imagens?: { url: string; ordem: number }[];
}

export const PRODUTO_SELECT = `
  id, nome, nome_loja, ativo, visivel_loja, tipo_venda,
  preco_base, preco_por_kg, preco_promocional,
  peso_embalagem_kg, peso_unidade_kg, saldo_estoque, controlar_estoque,
  altura_cm, largura_cm, comprimento_cm,
  produto_imagens(url, ordem)
`;

const round2 = (n: number) => Math.round(n * 100) / 100;

// Preço da unidade de venda: produtos vendidos por kg têm o preço da
// embalagem (preco_por_kg * peso_embalagem_kg); os demais usam preco_base.
export function precoUnitario(p: ProdutoEcom): number {
  let base = 0;
  if (p.tipo_venda === "kg" && p.preco_por_kg && p.peso_embalagem_kg) {
    base = p.preco_por_kg * p.peso_embalagem_kg;
  } else if (p.preco_base) {
    base = p.preco_base;
  } else if (p.preco_por_kg && p.peso_embalagem_kg) {
    base = p.preco_por_kg * p.peso_embalagem_kg;
  }
  if (p.preco_promocional && p.preco_promocional > 0 && p.preco_promocional < base) {
    return round2(p.preco_promocional);
  }
  return round2(base);
}

export function pesoKg(p: ProdutoEcom): number {
  return p.peso_embalagem_kg || p.peso_unidade_kg || 0.3;
}

export function imagemPrincipal(p: ProdutoEcom): string | null {
  const imgs = (p.produto_imagens || []).slice().sort((a, b) => a.ordem - b.ordem);
  return imgs[0]?.url || null;
}

export interface ItemFrete {
  produto: ProdutoEcom;
  quantidade: number;
}

export interface OpcaoFrete {
  servico: string;
  nome: string;
  valor: number;
  prazo_dias: number;
  transportadora: string;
}

const limparCep = (cep: string) => (cep || "").replace(/\D/g, "");

// ---------------------------------------------------------------------------
// Cálculo de frete em cascata:
//   1. Melhor Envio (MELHORENVIO_TOKEN) — cotação real de Correios + privadas
//   2. API oficial dos Correios (CORREIOS_USUARIO / CORREIOS_CODIGO_ACESSO /
//      CORREIOS_CARTAO_POSTAGEM) — contrato próprio
//   3. Tabela local ecom_frete_regras — contingência sempre disponível
// ---------------------------------------------------------------------------
export async function calcularFreteOpcoes(
  supabase: SupabaseClient,
  cepDestino: string,
  itens: ItemFrete[],
): Promise<{ opcoes: OpcaoFrete[]; subtotal: number; peso_kg: number }> {
  const cep = limparCep(cepDestino);
  if (cep.length !== 8) throw new Error("CEP de destino inválido");

  const { data: config } = await supabase
    .from("ecom_config").select("*").eq("id", 1).single();

  const cepOrigem = limparCep(config?.cep_origem || "01310100");
  const prazoPostagem = config?.prazo_postagem_dias ?? 2;

  let pesoTotal = 0;
  let subtotal = 0;
  let altura = 2, largura = 11, comprimento = 16; // mínimos aceitos pelos Correios
  for (const { produto, quantidade } of itens) {
    pesoTotal += pesoKg(produto) * quantidade;
    subtotal += precoUnitario(produto) * quantidade;
    altura = Math.min(105, altura + (produto.altura_cm || 10) * quantidade);
    largura = Math.max(largura, Math.min(105, produto.largura_cm || 15));
    comprimento = Math.max(comprimento, Math.min(105, produto.comprimento_cm || 20));
  }
  pesoTotal = Math.max(0.1, round2(pesoTotal));
  subtotal = round2(subtotal);

  let opcoes: OpcaoFrete[] = [];

  const meToken = Deno.env.get("MELHORENVIO_TOKEN");
  if (meToken) {
    try {
      opcoes = await cotarMelhorEnvio(meToken, cepOrigem, cep, pesoTotal, {
        altura, largura, comprimento,
      }, subtotal, prazoPostagem);
    } catch (e) {
      console.error("Melhor Envio falhou, tentando próximo provedor:", e);
    }
  }

  if (opcoes.length === 0 && Deno.env.get("CORREIOS_USUARIO")) {
    try {
      opcoes = await cotarCorreios(cepOrigem, cep, pesoTotal, {
        altura, largura, comprimento,
      }, prazoPostagem);
    } catch (e) {
      console.error("API Correios falhou, usando tabela local:", e);
    }
  }

  if (opcoes.length === 0) {
    opcoes = await cotarTabelaLocal(supabase, cep, pesoTotal, prazoPostagem);
  }

  // Frete grátis acima de um valor configurado
  if (config?.frete_gratis_acima && subtotal >= config.frete_gratis_acima && opcoes.length > 0) {
    const maisBarata = opcoes.reduce((a, b) => (a.valor <= b.valor ? a : b));
    maisBarata.valor = 0;
    maisBarata.nome = `${maisBarata.nome} (Frete grátis)`;
  }

  opcoes.sort((a, b) => a.valor - b.valor);
  return { opcoes, subtotal, peso_kg: pesoTotal };
}

async function cotarMelhorEnvio(
  token: string,
  cepOrigem: string,
  cepDestino: string,
  pesoKgTotal: number,
  dim: { altura: number; largura: number; comprimento: number },
  valorDeclarado: number,
  prazoPostagem: number,
): Promise<OpcaoFrete[]> {
  const resp = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/calculate", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "LojaEcom (contato@lojaecom.dev)",
    },
    body: JSON.stringify({
      from: { postal_code: cepOrigem },
      to: { postal_code: cepDestino },
      package: {
        weight: pesoKgTotal,
        width: dim.largura,
        height: dim.altura,
        length: dim.comprimento,
      },
      options: { insurance_value: valorDeclarado, receipt: false, own_hand: false },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`Melhor Envio HTTP ${resp.status}`);
  const data = await resp.json();
  return (Array.isArray(data) ? data : [])
    .filter((o: any) => !o.error && o.price)
    .map((o: any) => ({
      servico: `me_${o.id}`,
      nome: `${o.company?.name || ""} ${o.name}`.trim(),
      valor: round2(parseFloat(o.price)),
      prazo_dias: (o.delivery_time || 0) + prazoPostagem,
      transportadora: o.company?.name || "Melhor Envio",
    }));
}

async function cotarCorreios(
  cepOrigem: string,
  cepDestino: string,
  pesoKgTotal: number,
  dim: { altura: number; largura: number; comprimento: number },
  prazoPostagem: number,
): Promise<OpcaoFrete[]> {
  const usuario = Deno.env.get("CORREIOS_USUARIO")!;
  const codigoAcesso = Deno.env.get("CORREIOS_CODIGO_ACESSO")!;
  const cartao = Deno.env.get("CORREIOS_CARTAO_POSTAGEM")!;

  const auth = await fetch("https://api.correios.com.br/token/v1/autentica/cartaopostagem", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${usuario}:${codigoAcesso}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ numero: cartao }),
    signal: AbortSignal.timeout(10000),
  });
  if (!auth.ok) throw new Error(`Autenticação Correios HTTP ${auth.status}`);
  const { token } = await auth.json();

  // 03298 = PAC contrato, 03220 = SEDEX contrato
  const servicos = [
    { codigo: "03298", nome: "PAC" },
    { codigo: "03220", nome: "SEDEX" },
  ];
  const pesoGramas = Math.ceil(pesoKgTotal * 1000);
  const opcoes: OpcaoFrete[] = [];

  for (const s of servicos) {
    try {
      const params = new URLSearchParams({
        cepOrigem, cepDestino,
        psObjeto: String(pesoGramas),
        tpObjeto: "2",
        comprimento: String(Math.ceil(dim.comprimento)),
        largura: String(Math.ceil(dim.largura)),
        altura: String(Math.ceil(dim.altura)),
      });
      const [precoResp, prazoResp] = await Promise.all([
        fetch(`https://api.correios.com.br/preco/v1/nacional/${s.codigo}?${params}`, {
          headers: { "Authorization": `Bearer ${token}` },
          signal: AbortSignal.timeout(10000),
        }),
        fetch(`https://api.correios.com.br/prazo/v1/nacional/${s.codigo}?cepOrigem=${cepOrigem}&cepDestino=${cepDestino}`, {
          headers: { "Authorization": `Bearer ${token}` },
          signal: AbortSignal.timeout(10000),
        }),
      ]);
      if (!precoResp.ok) continue;
      const preco = await precoResp.json();
      const prazo = prazoResp.ok ? await prazoResp.json() : {};
      const valor = parseFloat(String(preco.pcFinal || preco.pcBase || "0").replace(",", "."));
      if (valor > 0) {
        opcoes.push({
          servico: `correios_${s.codigo}`,
          nome: s.nome,
          valor: round2(valor),
          prazo_dias: (parseInt(prazo.prazoEntrega) || 7) + prazoPostagem,
          transportadora: "Correios",
        });
      }
    } catch (e) {
      console.error(`Cotação Correios ${s.nome} falhou:`, e);
    }
  }
  return opcoes;
}

async function cotarTabelaLocal(
  supabase: SupabaseClient,
  cepDestino: string,
  pesoKgTotal: number,
  prazoPostagem: number,
): Promise<OpcaoFrete[]> {
  const { data: regras } = await supabase
    .from("ecom_frete_regras")
    .select("*")
    .eq("ativo", true)
    .order("valor", { ascending: true });

  const cepNum = parseInt(cepDestino, 10);
  const regra = (regras || []).find((r: any) =>
    cepNum >= parseInt(r.cep_inicio, 10) &&
    cepNum <= parseInt(r.cep_fim, 10) &&
    (r.peso_max_kg == null || pesoKgTotal <= r.peso_max_kg)
  );
  if (!regra) return [];
  return [{
    servico: `tabela_${regra.id}`,
    nome: `Entrega padrão (${regra.nome})`,
    valor: round2(regra.valor),
    prazo_dias: regra.prazo_dias + prazoPostagem,
    transportadora: "Tabela da loja",
  }];
}

// ---------------------------------------------------------------------------
// Carrinho: carrega itens com dados atuais de produto e totais recalculados.
// ---------------------------------------------------------------------------
export async function montarCarrinho(supabase: SupabaseClient, carrinhoId: string) {
  const { data: carrinho, error } = await supabase
    .from("ecom_carrinhos")
    .select("id, session_token, status, cupom_id, ecom_cupons(codigo)")
    .eq("id", carrinhoId)
    .single();
  if (error || !carrinho) throw new Error("Carrinho não encontrado");

  const { data: itensRaw } = await supabase
    .from("ecom_carrinho_itens")
    .select(`id, quantidade, produto_id, produtos(${PRODUTO_SELECT})`)
    .eq("carrinho_id", carrinhoId)
    .order("created_at");

  const itens = (itensRaw || [])
    .filter((i: any) => i.produtos)
    .map((i: any) => {
      const p = i.produtos as ProdutoEcom;
      const preco = precoUnitario(p);
      return {
        item_id: i.id,
        produto_id: i.produto_id,
        nome: p.nome_loja || p.nome,
        quantidade: i.quantidade,
        preco_unitario: preco,
        total: round2(preco * i.quantidade),
        imagem: imagemPrincipal(p),
        disponivel: p.ativo && p.visivel_loja &&
          (!p.controlar_estoque || (p.saldo_estoque ?? 0) >= i.quantidade),
      };
    });

  const subtotal = round2(itens.reduce((s, i) => s + i.total, 0));

  let cupom: { codigo: string; desconto: number; frete_gratis: boolean } | null = null;
  const cupomCodigo = (carrinho as any).ecom_cupons?.codigo;
  if (cupomCodigo) {
    const { data: validacao } = await supabase
      .rpc("ecom_validar_cupom", { p_codigo: cupomCodigo, p_subtotal: subtotal });
    if (validacao?.valido) {
      cupom = {
        codigo: validacao.codigo,
        desconto: validacao.desconto || 0,
        frete_gratis: !!validacao.frete_gratis,
      };
    }
  }

  const desconto = cupom?.desconto || 0;
  return {
    id: carrinho.id,
    session_token: carrinho.session_token,
    status: carrinho.status,
    itens,
    subtotal,
    cupom,
    desconto,
    total: round2(Math.max(0, subtotal - desconto)),
  };
}
