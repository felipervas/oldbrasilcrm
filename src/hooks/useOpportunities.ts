import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface Opportunity {
  id: string;
  title: string;
  company_id: string;
  contact_name: string | null;
  owner_id: string;
  stage_id: string;
  estimated_value: number;
  probability: number;
  temperature: string;
  expected_close_date: string | null;
  last_interaction_at: string | null;
  next_action_at: string | null;
  next_action_description: string | null;
  loss_reason: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  clientes?: { nome_loja: string; cidade: string | null; telefone?: string | null; celular?: string | null } | null;
}

export function useOpportunities() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("opportunities")
      .select("*, clientes(nome_loja, cidade, telefone, celular)")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    setError(error ? new Error(error.message) : null);
    setOpportunities((data as Opportunity[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  const moveToStage = async (opportunityId: string, stageId: string) => {
    const { error } = await supabase
      .from("opportunities")
      .update({ stage_id: stageId })
      .eq("id", opportunityId);
    if (!error) {
      setOpportunities(prev =>
        prev.map(o => o.id === opportunityId ? { ...o, stage_id: stageId } : o)
      );
    }
    return { error };
  };

  const softDelete = async (opportunityId: string) => {
    if (!user) return { error: new Error("Sem usuário") };
    const { error } = await supabase
      .from("opportunities")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq("id", opportunityId);
    if (!error) {
      setOpportunities(prev => prev.filter(o => o.id !== opportunityId));
    }
    return { error };
  };

  return { opportunities, loading, error, refetch: fetch, moveToStage, softDelete };
}
