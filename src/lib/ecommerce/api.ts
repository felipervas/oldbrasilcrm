// Cliente tipado das edge functions do e-commerce.
// O carrinho é identificado por um session_token guardado no localStorage,
// então funciona para visitantes sem login (como na NuvemShop).
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "ecom_session_token";

export const getSessionToken = () => localStorage.getItem(TOKEN_KEY);
const setSessionToken = (token: string | null) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
};

export interface CarrinhoItem {
  item_id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  imagem: string | null;
  disponivel: boolean;
}

export interface Carrinho {
  id: string | null;
  session_token: string | null;
  status: string;
  itens: CarrinhoItem[];
  subtotal: number;
  cupom: { codigo: string; desconto: number; frete_gratis: boolean } | null;
  desconto: number;
  total: number;
}

export interface OpcaoFrete {
  servico: string;
  nome: string;
  valor: number;
  prazo_dias: number;
  transportadora: string;
}

export interface CheckoutInput {
  cliente: { nome: string; email: string; telefone?: string; cpf_cnpj?: string };
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro?: string;
    cidade: string;
    uf: string;
  };
  frete_servico: string;
  observacoes?: string;
}

export interface CheckoutResultado {
  pedido_id: string;
  numero: number;
  total: number;
  subtotal: number;
  desconto: number;
  frete_valor: number;
  frete_servico: string;
  prazo_dias: number;
  /** URL do Checkout Pro do Mercado Pago; redirecione o cliente para cá */
  init_point: string | null;
}

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    // O corpo de erro das functions vem como { error: "mensagem" }
    let mensagem = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json();
      if (ctx?.error) mensagem = ctx.error;
    } catch { /* mantém a mensagem original */ }
    throw new Error(mensagem);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

async function carrinhoAction(action: string, extra: Record<string, unknown> = {}): Promise<Carrinho> {
  const carrinho = await invoke<Carrinho>("ecom-carrinho", {
    action,
    session_token: getSessionToken(),
    ...extra,
  });
  setSessionToken(carrinho.session_token);
  return carrinho;
}

export const ecomApi = {
  getCarrinho: () => carrinhoAction("get"),
  adicionarItem: (produto_id: string, quantidade = 1) =>
    carrinhoAction("add", { produto_id, quantidade }),
  atualizarItem: (produto_id: string, quantidade: number) =>
    carrinhoAction("update", { produto_id, quantidade }),
  removerItem: (produto_id: string) => carrinhoAction("remove", { produto_id }),
  aplicarCupom: (cupom_codigo: string) => carrinhoAction("aplicar_cupom", { cupom_codigo }),
  removerCupom: () => carrinhoAction("remover_cupom"),
  limparCarrinho: () => carrinhoAction("limpar"),

  calcularFrete: (cep_destino: string) =>
    invoke<{ opcoes: OpcaoFrete[]; subtotal: number; peso_kg: number }>("ecom-frete", {
      cep_destino,
      session_token: getSessionToken(),
    }),

  calcularFreteProduto: (cep_destino: string, produto_id: string, quantidade = 1) =>
    invoke<{ opcoes: OpcaoFrete[]; subtotal: number; peso_kg: number }>("ecom-frete", {
      cep_destino,
      itens: [{ produto_id, quantidade }],
    }),

  checkout: (input: CheckoutInput) =>
    invoke<CheckoutResultado>("ecom-checkout", {
      session_token: getSessionToken(),
      ...input,
    }),

  rastrearPedido: (numero: number | string, email: string) =>
    invoke("ecom-rastreio", { numero, email }),
};
