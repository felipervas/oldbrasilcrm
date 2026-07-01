import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BantData {
  id?: string;
  opportunity_id: string;
  budget_texto: string | null;
  budget_valor_estimado: number | null;
  authority_nome: string | null;
  authority_cargo: string | null;
  need_descricao: string | null;
  timing_tipo: string | null; // 'imediato' | '30d' | '60d' | '90d_mais' | 'data'
  timing_data: string | null;
  observacoes: string | null;
}

export function emptyBant(opportunityId: string): BantData {
  return {
    opportunity_id: opportunityId,
    budget_texto: null,
    budget_valor_estimado: null,
    authority_nome: null,
    authority_cargo: null,
    need_descricao: null,
    timing_tipo: null,
    timing_data: null,
    observacoes: null,
  };
}

export function bantCompleteness(b: BantData | null): { completed: number; total: number; isComplete: boolean } {
  if (!b) return { completed: 0, total: 4, isComplete: false };
  const checks = [
    !!(b.budget_texto?.trim() || b.budget_valor_estimado),
    !!(b.authority_nome?.trim() && b.authority_cargo?.trim()),
    !!(b.need_descricao?.trim()),
    !!(b.timing_tipo && (b.timing_tipo !== "data" || b.timing_data)),
  ];
  const completed = checks.filter(Boolean).length;
  return { completed, total: 4, isComplete: completed === 4 };
}

export function useBant(opportunityId: string | undefined) {
  const [bant, setBant] = useState<BantData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!opportunityId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("qualificacao_bant")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .maybeSingle();
    setBant(data ?? emptyBant(opportunityId));
    setLoading(false);
  }, [opportunityId]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (payload: BantData, userId: string) => {
    const data = { ...payload, opportunity_id: opportunityId, updated_by: userId };
    const { data: saved, error } = await (supabase as any)
      .from("qualificacao_bant")
      .upsert(data, { onConflict: "opportunity_id" })
      .select()
      .single();
    if (!error && saved) setBant(saved);
    return { error };
  }, [opportunityId]);

  return { bant, setBant, loading, save, refetch: load };
}
