/**
 * Algoritmo de priorização de visitas para o vendedor.
 * Combina pesos de diferentes sinais (em risco, pipeline quente, tarefa hoje, etc.)
 * para gerar um score por cliente e o motivo principal da visita.
 */

export type MotivoVisita =
  | "tarefa_hoje"
  | "em_risco"
  | "pipeline_quente"
  | "ultima_visita_antiga"
  | "sem_pedido_mes"
  | "agendado"
  | "extra";

export const MOTIVO_LABEL: Record<MotivoVisita, string> = {
  tarefa_hoje: "Tarefa Hoje",
  em_risco: "Em Risco",
  pipeline_quente: "Quente",
  ultima_visita_antiga: "Última visita > 20d",
  sem_pedido_mes: "Reativar",
  agendado: "Agendado",
  extra: "Extra",
};

export const MOTIVO_COLOR: Record<MotivoVisita, string> = {
  tarefa_hoje: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30",
  em_risco: "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30",
  pipeline_quente: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30",
  ultima_visita_antiga: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30",
  sem_pedido_mes: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30",
  agendado: "bg-secondary/20 text-secondary border border-secondary/40",
  extra: "bg-muted text-muted-foreground border",
};

const PESOS: Record<MotivoVisita, number> = {
  em_risco: 10,
  agendado: 9,
  tarefa_hoje: 9,
  pipeline_quente: 8,
  sem_pedido_mes: 6,
  ultima_visita_antiga: 5,
  extra: 1,
};

export interface ClientePrioridadeInput {
  cliente: {
    id: string;
    nome_loja: string;
    endereco?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    telefone?: string | null;
    celular?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    data_ultima_compra?: string | null;
    dias_ultima_compra?: number | null;
  };
  /** Última visita realizada (visitas table) */
  ultimaVisita?: { check_in_at: string } | null;
  /** Tem follow-up agendado para hoje */
  tarefaHoje?: { id: string; subject: string; due_time?: string | null } | null;
  /** Oportunidade quente vinculada */
  oportunidadeQuente?: { id: string; title: string } | null;
  /** Tem pedido no mês corrente */
  temPedidoMes?: boolean;
}

export interface ClientePrioridadeResult {
  clienteId: string;
  score: number;
  motivos: MotivoVisita[];
  motivoPrincipal: MotivoVisita;
  diasSemContato: number | null;
  diasUltimaVisita: number | null;
  horarioSugerido?: string | null;
}

function diffDays(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function priorizarCliente(input: ClientePrioridadeInput): ClientePrioridadeResult {
  const motivos: MotivoVisita[] = [];
  let score = 0;

  const diasSemContato = input.cliente.dias_ultima_compra ?? diffDays(input.cliente.data_ultima_compra);
  const diasUltimaVisita = diffDays(input.ultimaVisita?.check_in_at);

  if (input.tarefaHoje) {
    motivos.push("tarefa_hoje");
    score += PESOS.tarefa_hoje;
  }
  if (diasSemContato !== null && diasSemContato >= 30) {
    motivos.push("em_risco");
    score += PESOS.em_risco;
  }
  if (input.oportunidadeQuente) {
    motivos.push("pipeline_quente");
    score += PESOS.pipeline_quente;
  }
  if (diasUltimaVisita !== null && diasUltimaVisita > 20) {
    motivos.push("ultima_visita_antiga");
    score += PESOS.ultima_visita_antiga;
  }
  if (input.temPedidoMes === false) {
    motivos.push("sem_pedido_mes");
    score += PESOS.sem_pedido_mes;
  }

  const motivoPrincipal: MotivoVisita = motivos.length
    ? [...motivos].sort((a, b) => PESOS[b] - PESOS[a])[0]
    : "extra";

  return {
    clienteId: input.cliente.id,
    score,
    motivos,
    motivoPrincipal,
    diasSemContato,
    diasUltimaVisita,
    horarioSugerido: input.tarefaHoje?.due_time ?? null,
  };
}
