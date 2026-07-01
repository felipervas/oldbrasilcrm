import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlaybookObjection {
  q: string;
  r: string;
}

export interface PlaybookScript {
  id: string;
  stage_id: string;
  objetivo: string;
  checklist: string[];
  script_abordagem: string[];
  perguntas_chave: string[];
  objecoes: PlaybookObjection[];
  criterio_avanco: string;
}

function parseScript(row: any): PlaybookScript {
  return {
    id: row.id,
    stage_id: row.stage_id,
    objetivo: row.objetivo ?? "",
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    script_abordagem: Array.isArray(row.script_abordagem) ? row.script_abordagem : [],
    perguntas_chave: Array.isArray(row.perguntas_chave) ? row.perguntas_chave : [],
    objecoes: Array.isArray(row.objecoes) ? row.objecoes : [],
    criterio_avanco: row.criterio_avanco ?? "",
  };
}

/** Carrega TODOS os scripts do playbook (uma vez). */
export function usePlaybookScripts() {
  const [scripts, setScripts] = useState<PlaybookScript[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("playbook_scripts").select("*");
    setScripts((data ?? []).map(parseScript));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { scripts, loading, refetch: fetch };
}

/** Carrega o script da etapa atual + progresso da oportunidade. */
export function usePlaybookForOpportunity(opportunityId: string | undefined, stageId: string | undefined) {
  const [script, setScript] = useState<PlaybookScript | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [progressId, setProgressId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!opportunityId || !stageId) return;
    setLoading(true);
    const [scriptRes, progressRes] = await Promise.all([
      (supabase as any).from("playbook_scripts").select("*").eq("stage_id", stageId).maybeSingle(),
      (supabase as any).from("opportunity_playbook_progress").select("*")
        .eq("opportunity_id", opportunityId).eq("stage_id", stageId).maybeSingle(),
    ]);
    setScript(scriptRes.data ? parseScript(scriptRes.data) : null);
    setProgress((progressRes.data?.checklist_state ?? {}) as Record<string, boolean>);
    setProgressId(progressRes.data?.id ?? null);
    setLoading(false);
  }, [opportunityId, stageId]);

  useEffect(() => { load(); }, [load]);

  const toggleItem = useCallback(async (itemKey: string, userId: string) => {
    if (!opportunityId || !stageId) return;
    const next = { ...progress, [itemKey]: !progress[itemKey] };
    setProgress(next);
    if (progressId) {
      await (supabase as any).from("opportunity_playbook_progress")
        .update({ checklist_state: next, updated_by: userId })
        .eq("id", progressId);
    } else {
      const { data } = await (supabase as any).from("opportunity_playbook_progress")
        .insert({ opportunity_id: opportunityId, stage_id: stageId, checklist_state: next, updated_by: userId })
        .select("id").single();
      if (data?.id) setProgressId(data.id);
    }
  }, [opportunityId, stageId, progress, progressId]);

  return { script, progress, loading, toggleItem, refetch: load };
}

export async function upsertPlaybookScript(stageId: string, payload: Partial<PlaybookScript>) {
  const data = {
    stage_id: stageId,
    objetivo: payload.objetivo ?? "",
    checklist: payload.checklist ?? [],
    script_abordagem: payload.script_abordagem ?? [],
    perguntas_chave: payload.perguntas_chave ?? [],
    objecoes: payload.objecoes ?? [],
    criterio_avanco: payload.criterio_avanco ?? "",
  };
  return (supabase as any)
    .from("playbook_scripts")
    .upsert(data, { onConflict: "stage_id" })
    .select()
    .single();
}
