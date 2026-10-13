import { pickInscricaoEstadual } from "./ie.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FETCH_TIMEOUT_MS = 8000;

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
  ie_source?: string;
  ie_warning?: string;
};

type IeLookup = {
  ie: string;
  status: "found" | "not_found" | "rate_limited" | "error";
};

async function fromBrasilAPI(digits: string): Promise<Result | null> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      razao_social: d.razao_social || "",
      nome_fantasia: d.nome_fantasia || "",
      inscricao_estadual: pickInscricaoEstadual(d.inscricoes_estaduais, d.uf),
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
  } catch (error) {
    console.warn("BrasilAPI falhou:", String(error));
    return null;
  }
}

async function fromReceitaWS(digits: string): Promise<Result | null> {
  try {
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${digits}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
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
  } catch (error) {
    console.warn("ReceitaWS falhou:", String(error));
    return null;
  }
}

async function fromCnpjWsIE(digits: string, uf: string): Promise<IeLookup> {
  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`, {
      headers: { "User-Agent": "OldBrasilCRM/1.0" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (res.status === 429) return { ie: "", status: "rate_limited" };
    if (!res.ok) return { ie: "", status: "error" };

    const d = await res.json();
    const estabelecimento = d?.estabelecimento ?? {};
    const ufEstabelecimento = estabelecimento?.estado?.sigla || uf;
    const ie = pickInscricaoEstadual(estabelecimento?.inscricoes_estaduais, ufEstabelecimento);

    return ie
      ? { ie, status: "found" }
      : { ie: "", status: "not_found" };
  } catch (error) {
    console.warn("CNPJ.ws falhou:", String(error));
    return { ie: "", status: "error" };
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
      const ieLookup = await fromCnpjWsIE(digits, result.uf);

      if (ieLookup.ie) {
        result.inscricao_estadual = ieLookup.ie;
        result.ie_source = "cnpj.ws";
      } else if (ieLookup.status === "rate_limited") {
        result.ie_warning = "A fonte de IE atingiu o limite de consultas. Tente novamente em alguns segundos ou preencha manualmente";
      } else if (ieLookup.status === "not_found") {
        result.ie_warning = `IE ativa não encontrada${result.uf ? ` para ${result.uf}` : ""}. Confirme se o cliente é contribuinte ou preencha manualmente`;
      } else {
        result.ie_warning = "Não foi possível consultar a IE agora. Tente novamente ou preencha manualmente";
      }
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
