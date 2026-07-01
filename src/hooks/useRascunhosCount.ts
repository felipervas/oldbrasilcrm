import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

export function useRascunhosCount() {
  const { user } = useAuth();
  const { isAdminOrGestor } = useUserRole();
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    if (!user) return;
    let q = supabase
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("status", "Rascunho");
    // Todos veem rascunhos
    const { count } = await q;
    setCount(count ?? 0);
  }, [user?.id, isAdminOrGestor]);

  useEffect(() => { refetch(); }, [refetch, pathname]);

  return { count, refetch };
}
