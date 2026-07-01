// =============================================================================
// SISTEMA DE RETENÇÃO DE CLIENTES — regras de status e helpers genéricos.
// Mantenha esses limiares aqui e use-os a partir dos hooks/UI.
// Para mudar a régua basta alterar as constantes abaixo.
// =============================================================================

/** Dias sem comprar a partir do qual o cliente entra em "atenção". */
export const DIAS_ATENCAO = 30;
/** Dias sem comprar a partir do qual o cliente entra em "em risco". */
export const DIAS_EM_RISCO = 45;
/** Dias sem comprar a partir do qual o cliente é considerado "inativo". */
export const DIAS_INATIVO = 60;

/** Razão (intervalo atual / intervalo médio) para entrar em "atenção". */
export const RATIO_ATENCAO = 1.5;
/** Razão (intervalo atual / intervalo médio) para entrar em "em risco". */
export const RATIO_EM_RISCO = 2.0;

export type StatusRetencao = "ativo" | "atencao" | "em_risco" | "inativo" | "novo";

export interface RetencaoMetrics {
  ultima_compra_data: string | null;
  total_pedidos: number;
  dias_desde_ultima_compra: number | null;
  intervalo_medio_dias: number | null;
}

export interface RetencaoResult extends RetencaoMetrics {
  intervalo_atual_vs_medio: number | null;
  status_retencao: StatusRetencao;
  motivo_alerta: string;
}

/**
 * Calcula o status de retenção a partir das métricas agregadas (vindas da view).
 * Genérico — não depende de UI nem de página específica.
 *
 * Ordem de prioridade das regras:
 *   1. "novo"     → nenhum pedido confirmado ainda
 *   2. "inativo"  → dias_desde_ultima_compra > DIAS_INATIVO
 *   3. "em_risco" → dias entre (DIAS_EM_RISCO+1, DIAS_INATIVO]   OU ratio >= RATIO_EM_RISCO
 *   4. "atencao"  → dias entre (DIAS_ATENCAO+1, DIAS_EM_RISCO]   OU ratio >= RATIO_ATENCAO
 *   5. "ativo"    → caso contrário
 */
export function computeRetencao(m: RetencaoMetrics): RetencaoResult {
  const dias = m.dias_desde_ultima_compra;
  const media = m.intervalo_medio_dias;
  const ratio = dias != null && media && media > 0 ? dias / media : null;

  let status: StatusRetencao;
  let motivo = "";

  if (m.total_pedidos === 0 || dias == null) {
    status = "novo";
    motivo = "Nunca comprou — primeira abordagem";
  } else if (dias > DIAS_INATIVO) {
    status = "inativo";
    motivo = `${dias} dias sem pedir — cliente inativo`;
  } else if (dias > DIAS_EM_RISCO || (ratio != null && ratio >= RATIO_EM_RISCO)) {
    status = "em_risco";
    motivo =
      ratio != null && ratio >= RATIO_EM_RISCO && media
        ? `${dias} dias sem pedir — média do cliente é ${Math.round(media)} dias`
        : `${dias} dias sem pedir — em risco`;
  } else if (dias > DIAS_ATENCAO || (ratio != null && ratio >= RATIO_ATENCAO)) {
    status = "atencao";
    motivo =
      ratio != null && ratio >= RATIO_ATENCAO && media
        ? `${dias} dias sem pedir — média do cliente é ${Math.round(media)} dias`
        : `${dias} dias sem pedir — atenção`;
  } else {
    status = "ativo";
    motivo = media
      ? `${dias} dias desde a última compra (média ${Math.round(media)} dias)`
      : `${dias} dias desde a última compra`;
  }

  return {
    ...m,
    intervalo_atual_vs_medio: ratio,
    status_retencao: status,
    motivo_alerta: motivo,
  };
}

/** Cores e labels visuais — genéricos, reutilizáveis em qualquer tela. */
export const STATUS_RETENCAO_META: Record<
  StatusRetencao,
  { label: string; badgeClass: string; dotClass: string; ordem: number }
> = {
  ativo: {
    label: "Ativo",
    badgeClass: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
    dotClass: "bg-green-500",
    ordem: 5,
  },
  atencao: {
    label: "Atenção",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    dotClass: "bg-amber-500",
    ordem: 3,
  },
  em_risco: {
    label: "Em Risco",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
    dotClass: "bg-orange-500",
    ordem: 2,
  },
  inativo: {
    label: "Inativo",
    badgeClass: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
    dotClass: "bg-red-500",
    ordem: 1,
  },
  novo: {
    label: "Novo",
    badgeClass: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-gray-400",
    ordem: 4,
  },
};

export function descricaoUltimaCompra(dias: number | null): string {
  if (dias == null) return "Nunca comprou";
  if (dias === 0) return "Comprou hoje";
  if (dias === 1) return "Última compra: 1 dia atrás";
  return `Última compra: ${dias} dias atrás`;
}

/**
 * Sugestão de ação por status de retenção (usado pelo job de follow-up automático).
 */
export function sugestaoAcao(status: StatusRetencao): {
  acao: string;
  prioridade: "baixa" | "media" | "alta";
  tipoFollowup: "whatsapp" | "ligacao" | "outro";
} {
  switch (status) {
    case "atencao":
      return { acao: "Enviar mensagem por WhatsApp para reativar contato.", prioridade: "baixa", tipoFollowup: "whatsapp" };
    case "em_risco":
      return { acao: "Ligar para entender o que está acontecendo.", prioridade: "media", tipoFollowup: "ligacao" };
    case "inativo":
      return { acao: "Enviar oferta de recuperação personalizada.", prioridade: "alta", tipoFollowup: "outro" };
    default:
      return { acao: "Acompanhar normalmente.", prioridade: "baixa", tipoFollowup: "outro" };
  }
}
