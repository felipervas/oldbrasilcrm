import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlaybookResposta {
  id?: string;
  opportunity_id: string;
  stage_id: string;
  item_checklist: string;
  resposta: Record<string, any>;
  respondido_por?: string | null;
  respondido_em?: string;
}

/** Carrega respostas por (opp, stage) e expõe upsert. */
export function usePlaybookRespostas(opportunityId: string | undefined, stageId: string | undefined) {
  const [respostas, setRespostas] = useState<Record<string, PlaybookResposta>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!opportunityId || !stageId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("playbook_respostas")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .eq("stage_id", stageId);
    const map: Record<string, PlaybookResposta> = {};
    (data ?? []).forEach((r: PlaybookResposta) => { map[r.item_checklist] = r; });
    setRespostas(map);
    setLoading(false);
  }, [opportunityId, stageId]);

  useEffect(() => { load(); }, [load]);

  const upsertResposta = useCallback(async (
    item: string,
    resposta: Record<string, any>,
    userId: string,
  ) => {
    if (!opportunityId || !stageId) return { error: new Error("Sem ids") };
    const payload = {
      opportunity_id: opportunityId,
      stage_id: stageId,
      item_checklist: item,
      resposta,
      respondido_por: userId,
      respondido_em: new Date().toISOString(),
    };
    const { data, error } = await (supabase as any)
      .from("playbook_respostas")
      .upsert(payload, { onConflict: "opportunity_id,stage_id,item_checklist" })
      .select()
      .single();
    if (!error && data) {
      setRespostas(prev => ({ ...prev, [item]: data }));
    }
    return { error };
  }, [opportunityId, stageId]);

  return { respostas, loading, upsertResposta, refetch: load };
}

/**
 * Configuração dos itens do checklist que precisam de campos.
 * Identificados por substring case-insensitive no texto do item.
 * Se não bater nada, é simples checkbox.
 */
export type FormFieldKind =
  | { kind: "select_text"; options: string[]; placeholder?: string; required: ("opcao" | "texto")[] }
  | { kind: "phone_validate"; placeholder?: string }
  | { kind: "url_text"; placeholder?: string };

export interface PlaybookFieldConfig {
  matcher: (item: string) => boolean;
  field: FormFieldKind;
  label: string;
}

export const PLAYBOOK_FIELD_CONFIGS: PlaybookFieldConfig[] = [
  {
    matcher: (item) => /origem do lead/i.test(item),
    label: "Origem do lead",
    field: {
      kind: "select_text",
      options: ["Instagram", "Indicação", "Google", "Feira", "Site", "Outro"],
      placeholder: "Detalhes da origem (opcional)",
      required: ["opcao"],
    },
  },
  {
    matcher: (item) => /validar telefone|telefone.*whats|whats.*telefone/i.test(item),
    label: "Telefone validado",
    field: { kind: "phone_validate", placeholder: "(00) 00000-0000" },
  },
  {
    matcher: (item) => /instagram|google/i.test(item) && /pesquisar|loja/i.test(item),
    label: "Pesquisa Instagram/Google",
    field: { kind: "url_text", placeholder: "URL do perfil ou link" },
  },
];

export function getFieldConfig(item: string): PlaybookFieldConfig | null {
  return PLAYBOOK_FIELD_CONFIGS.find(c => c.matcher(item)) ?? null;
}

/** Decide se a resposta atual é considerada "completa" para marcar como concluído. */
export function isRespostaCompleta(item: string, resposta: Record<string, any> | undefined): boolean {
  if (!resposta) return false;
  const cfg = getFieldConfig(item);
  if (!cfg) return !!resposta._done;
  switch (cfg.field.kind) {
    case "select_text":
      return !!(resposta.opcao && String(resposta.opcao).trim());
    case "phone_validate":
      return !!(resposta.telefone && String(resposta.telefone).replace(/\D/g, "").length >= 10);
    case "url_text":
      return !!(resposta.url && String(resposta.url).trim());
  }
}
