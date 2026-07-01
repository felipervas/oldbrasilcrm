import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface Followup {
  id: string;
  client_id: string;
  opportunity_id: string | null;
  assigned_to: string;
  due_date: string;
  due_time: string | null;
  type: string | null;
  subject: string;
  notes: string | null;
  status: string;
  created_at: string;
  foi_remarcado?: boolean;
  data_original?: string | null;
  hora_original?: string | null;
  clientes?: { nome_loja: string; cidade: string | null } | null;
}

export function useFollowups(clientId?: string, viewUserId?: string) {
  const { user } = useAuth();
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("followups")
      .select("*, clientes(nome_loja, cidade)")
      .order("due_date", { ascending: true });
    if (clientId) query = query.eq("client_id", clientId);
    if (viewUserId) query = query.eq("assigned_to", viewUserId);
    const { data } = await query;
    setFollowups((data as Followup[]) ?? []);
    setLoading(false);
  }, [user?.id, clientId, viewUserId]);

  const create = async (payload: {
    client_id: string;
    opportunity_id?: string | null;
    due_date: string;
    due_time?: string | null;
    type?: string;
    subject: string;
    notes?: string | null;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };
    const { error } = await supabase.from("followups").insert({
      ...payload,
      assigned_to: user.id,
    });
    if (!error) await fetch();
    return { error };
  };

  const complete = async (id: string) => {
    const { error } = await supabase.from("followups").update({ status: "concluido" }).eq("id", id);
    if (!error) await fetch();
    return { error };
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("followups").update({ status: "cancelado" }).eq("id", id);
    if (!error) await fetch();
    return { error };
  };

  const reschedule = async (
    fu: Followup,
    newDate: string,
    newTime: string | null
  ) => {
    const payload: {
      due_date: string;
      due_time: string | null;
      foi_remarcado: boolean;
      data_original?: string;
      hora_original?: string | null;
    } = {
      due_date: newDate,
      due_time: newTime,
      foi_remarcado: true,
    };
    if (!fu.data_original) {
      payload.data_original = fu.due_date;
      payload.hora_original = fu.due_time;
    }
    const { error } = await supabase.from("followups").update(payload).eq("id", fu.id);
    if (!error) await fetch();
    return { error };
  };

  return { followups, loading, fetch, create, complete, cancel, reschedule };
}
