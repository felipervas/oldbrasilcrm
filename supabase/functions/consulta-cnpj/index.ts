const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Result = {
  razao_social: string;
  nome_fantasia: string;
  inscricao_estadual: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  source: string;
  ie_warning?: string;
};

function pickIE(data: any): string {
  // BrasilAPI returns array of inscricoes_estaduais [{inscricao_estadual, ativo, ...}]
  if (Array.isArray(data?.inscricoes_estaduais)) {
    const ativa = data.inscricoes_estaduais.find((i: any) => i.ativo) ?? data.inscricoes_estaduais[0];
    if (ativa?.inscricao_estadual) return String(ativa.inscricao_estadual);
  }
  return "";
}

async function fromBrasilAPI(digits: string): Promise<Result | null> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
    if (!res.ok) return null;
    const d = await res.json();
    return {
      razao_social: d.razao_social || "",
      nome_fantasia: d.nome_fantasia || "",
      inscricao_estadual: pickIE(d),
      logradouro: d.logradouro || "",
      numero: d.numero || "",
      complemento: d.complemento || "",
      bairro: d.bairro || "",
      municipio: d.municipio || "",
      uf: d.uf || "",
      cep: d.cep || "",
      telefone: d.ddd_telefone_1 || d.ddd_telefone_2 || "",
      email: d.email || "",
      source: "brasilapi",
    };
  } catch {
    return null;
  }
}

async function fromReceitaWS(digits: string): Promise<Result | null> {
  try {
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${digits}`);
    if (!res.ok) return null;
    const d = await res.json();
    if (d.status === "ERROR") return null;
    return {
      razao_social: d.nome || "",
      nome_fantasia: d.fantasia || "",
      inscricao_estadual: "",
      logradouro: d.logradouro || "",
      numero: d.numero || "",
      complemento: d.complemento || "",
      bairro: d.bairro || "",
      municipio: d.municipio || "",
      uf: d.uf || "",
      cep: (d.cep || "").replace(/\D/g, ""),
      telefone: d.telefone || "",
      email: d.email || "",
      source: "receitaws",
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();
    if (!cnpj || typeof cnpj !== "string") {
      return new Response(JSON.stringify({ error: "CNPJ é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      return new Response(JSON.stringify({ error: "CNPJ inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result = await fromBrasilAPI(digits);
    if (!result) result = await fromReceitaWS(digits);

    if (!result) {
      return new Response(JSON.stringify({ error: "CNPJ não encontrado nas fontes consultadas" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!result.inscricao_estadual) {
      result.ie_warning = "IE não encontrada, preencha manualmente";
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro ao consultar CNPJ", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
