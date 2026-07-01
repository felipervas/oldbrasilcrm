import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Normaliza um telefone brasileiro para apenas dígitos com DDI 55.
 */
export function normalizePhoneBR(phone: string | null | undefined): string | null {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("55")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);

  if (digits.length === 11 && digits[2] === "0") {
    digits = `${digits.slice(0, 2)}${digits.slice(3)}`;
  }

  if (digits.length !== 10 && digits.length !== 11) return null;

  return `55${digits}`;
}

/**
 * Copia a mensagem para o clipboard de forma síncrona-amigável (fire-and-forget).
 * Usa execCommand como fallback para garantir que rode dentro do gesto do usuário.
 */
function copyMessageToClipboard(message: string): boolean {
  if (!message) return false;
  try {
    // Tentativa moderna (assíncrona, mas iniciada no gesto)
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(message).catch(() => {
        /* silencioso */
      });
    }
  } catch {
    /* silencioso */
  }

  // Fallback síncrono via textarea + execCommand (mantém compat em navegadores antigos / contextos não-seguros)
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = message;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {
      /* silencioso */
    }
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

function buildWaMeUrl(phone: string): string {
  // Apenas o número com DDI; SEM ?text= para evitar bloqueios de pré-preenchimento.
  return `https://wa.me/${phone}`;
}

/**
 * Abre o WhatsApp de forma síncrona no gesto do usuário.
 *
 * Estratégia:
 *  1. Copia a mensagem para o clipboard (try/catch silencioso).
 *  2. Abre wa.me/NUMERO (sem ?text=) numa nova aba.
 *  3. Se popup foi bloqueado, fallback via <a target="_blank">.click().
 *  4. Mostra um toast informando que a mensagem foi copiada.
 */
export function openWhatsApp(phone: string | null | undefined, message?: string): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const normalized = normalizePhoneBR(phone);
  if (!normalized) return false;

  const trimmed = message?.trim() ?? "";

  // 1) Clipboard primeiro (no gesto do usuário)
  if (trimmed) {
    copyMessageToClipboard(trimmed);
  }

  // 2) Abrir wa.me em nova aba
  const url = buildWaMeUrl(normalized);
  console.log("[WA] openWhatsApp chamado", { telefone: normalized });
  const popup = window.open(url, "_blank", "noopener,noreferrer");

  if (!popup) {
    // 3) Fallback anchor click
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  // 4) Toast de feedback
  if (trimmed) {
    toast.success("Mensagem copiada — cole no WhatsApp (Ctrl+V)");
  } else {
    toast.success("WhatsApp aberto");
  }

  return true;
}

/**
 * Substitui variáveis no formato {{variavel}} dentro de um template.
 */
export function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

/**
 * Registra o envio de WhatsApp na timeline de interações do cliente.
 */
export async function registerWhatsAppInteraction(params: {
  clientId: string;
  userId: string;
  message: string;
  subject?: string;
  opportunityId?: string | null;
}): Promise<void> {
  const { clientId, userId, message, subject = "WhatsApp enviado", opportunityId = null } = params;

  await supabase.from("interactions").insert({
    client_id: clientId,
    created_by: userId,
    type: "whatsapp_enviado",
    subject,
    description: message,
    opportunity_id: opportunityId,
  });

  await supabase.from("clientes").update({ updated_at: new Date().toISOString() }).eq("id", clientId);
}

/**
 * Templates padrão (fallback caso o usuário não tenha customizado).
 */
export const DEFAULT_TEMPLATES: Record<string, { titulo: string; conteudo: string; descricao: string }> = {
  saudacao_inicial: {
    titulo: "Saudação inicial",
    descricao: "Primeiro contato com o cliente",
    conteudo: "Olá {{cliente}}, aqui é {{vendedor}}, tudo bem? Passando para te apresentar nossas novidades.",
  },
  followup_quente: {
    titulo: "Follow-up quente",
    descricao: "Para clientes engajados na negociação",
    conteudo: "Olá {{cliente}}! Tem interesse em receber uma proposta com os produtos que conversamos?",
  },
  confirmacao_pedido: {
    titulo: "Confirmação de pedido",
    descricao: "Após confirmar um pedido",
    conteudo: "Olá {{cliente}}, seu pedido #{{pedido_numero}} no valor de R$ {{pedido_total}} foi confirmado. Previsão de entrega: {{entrega_data}}. Qualquer dúvida estou à disposição, {{vendedor}}.",
  },
  lembrete_entrega: {
    titulo: "Lembrete de entrega",
    descricao: "Lembrar cliente da data prevista",
    conteudo: "Olá {{cliente}}, passando para lembrar que sua entrega do pedido #{{pedido_numero}} está prevista para {{entrega_data}}. Até logo!",
  },
  reativacao_cliente: {
    titulo: "Reativação cliente em risco",
    descricao: "Reaproximar clientes inativos",
    conteudo: "Olá {{cliente}}, faz um tempinho que não nos falamos. Separei algumas novidades que podem interessar sua loja. Posso te mandar?",
  },
  followup_pipeline: {
    titulo: "Follow-up por etapa do funil",
    descricao: "Contextual à etapa do pipeline",
    conteudo: "Olá {{cliente}}, tudo bem? Passando para dar continuidade na nossa conversa sobre {{etapa_funil}}. Conseguiu avaliar a proposta?",
  },
  lembrete_visita: {
    titulo: "Lembrete de visita",
    descricao: "Confirmar visita agendada",
    conteudo: "Olá {{cliente}}, aqui é {{vendedor}}. Estou passando para confirmar nossa visita em {{entrega_data}}. Está tudo certo?",
  },
};
