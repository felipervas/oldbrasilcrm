import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface Interaction {
  id: string;
  client_id: string;
  opportunity_id: string | null;
  type: string;
  subject: string | null;
  description: string | null;
  interaction_date: string;
  created_by: string;
  photo_url: string | null;
  created_at: string;
}

export function useInteractions(clientId?: string) {
  const { user } = useAuth();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("interactions")
      .select("*")
      .order("interaction_date", { ascending: false });
    if (clientId) query = query.eq("client_id", clientId);
    const { data } = await query;
    setInteractions((data as Interaction[]) ?? []);
    setLoading(false);
  }, [user?.id, clientId]);

  const create = async (payload: Omit<Interaction, "id" | "created_at" | "created_by">) => {
    if (!user) return { error: new Error("Not authenticated") };
    const { error } = await supabase.from("interactions").insert({
      ...payload,
      created_by: user.id,
    });
    if (!error) {
      // Update client's updated_at
      await supabase.from("clientes").update({ updated_at: new Date().toISOString() }).eq("id", payload.client_id);
      await fetch();
    }
    return { error };
  };

  return { interactions, loading, fetch, create };
}
