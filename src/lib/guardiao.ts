import { differenceInCalendarDays } from "date-fns";
import type { Opportunity } from "@/hooks/useOpportunities";

// Regras do "Guardião do Funil" — uma fonte só, usada pelo Guardião e pelo Bom-dia.
export const PARADO_ALTO = 14; // dias sem movimento = risco alto
export const PARADO_MEDIO = 7;

export interface AlertaFunil {
  opp: Opportunity;
  risco: "alto" | "medio";
  motivos: string[];
  sugestao: string;
  diasParado: number;
}

export function avaliarEsfriamento(opp: Opportunity, hoje0: Date): AlertaFunil | null {
  const status = (opp.status || "").toLowerCase();
  if (["won", "lost", "ganho", "perdido"].includes(status)) return null;

  const ultimoToque = opp.last_interaction_at || opp.updated_at;
  const diasParado = ultimoToque ? differenceInCalendarDays(new Date(), new Date(ultimoToque)) : 999;
  const motivos: string[] = [];
  let risco: "alto" | "medio" | null = null;
  let sugestao = "";

  if (opp.next_action_at && new Date(opp.next_action_at) < hoje0) {
    const dv = differenceInCalendarDays(new Date(), new Date(opp.next_action_at));
    risco = dv >= 3 ? "alto" : "medio";
    motivos.push(`Follow-up venceu há ${dv} dia${dv === 1 ? "" : "s"}`);
    sugestao = "Retomar o contato hoje — ligar ou mandar WhatsApp.";
  }

  if (diasParado >= PARADO_ALTO) {
    risco = "alto";
    motivos.push(`${diasParado} dias sem movimento`);
    if (!sugestao) sugestao = `Faz ${diasParado} dias parado — reaqueça com uma novidade ou amostra.`;
  } else if (diasParado >= PARADO_MEDIO && risco !== "alto") {
    risco = risco || "medio";
    motivos.push(`${diasParado} dias sem contato`);
  }

  if (!opp.next_action_at) {
    risco = risco || "medio";
    motivos.push("Sem próximo passo definido");
    if (!sugestao) sugestao = "Defina o próximo passo e agende um follow-up.";
  }

  if (!risco) return null;
  if (!sugestao) sugestao = "Dar sequência no contato.";
  return { opp, risco, motivos, sugestao, diasParado };
}

export function listarEsfriando(opps: Opportunity[], hoje0: Date): AlertaFunil[] {
  return opps
    .map((o) => avaliarEsfriamento(o, hoje0))
    .filter((a): a is AlertaFunil => a !== null)
    .sort((a, b) => {
      if (a.risco !== b.risco) return a.risco === "alto" ? -1 : 1;
      return (b.opp.estimated_value || 0) - (a.opp.estimated_value || 0);
    });
}

export function waLinkCliente(cli?: { telefone?: string | null; celular?: string | null } | null) {
  const tel = (cli?.celular || cli?.telefone || "").replace(/\D/g, "");
  if (!tel) return null;
  const num = tel.length <= 11 ? `55${tel}` : tel;
  return `https://wa.me/${num}`;
}
