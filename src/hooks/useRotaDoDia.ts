import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { priorizarCliente, type ClientePrioridadeResult } from "@/lib/priorizacao";

export interface RotaCliente {
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
  prioridade: ClientePrioridadeResult;
  visitaHojeId?: string | null;
}

/**
 * Monta a lista priorizada de clientes para visitar HOJE,
 * combinando: clientes em risco, pipeline quente, follow-ups do dia,
 * última visita antiga, e clientes sem pedido no mês.
 */
export function useRotaDoDia(viewUserId?: string) {
  const { user } = useAuth();
  const { isAdminOrGestor } = useUserRole();
  const [rota, setRota] = useState<RotaCliente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRota = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const targetUserId = viewUserId || user.id;
    const isViewingSelf = targetUserId === user.id;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

    // 1. Clientes do vendedor alvo (ou todos se gestor vendo a si mesmo)
    const clientesQ = supabase
      .from("clientes")
      .select("id,nome_loja,endereco,bairro,cidade,telefone,celular,latitude,longitude,data_ultima_compra,dias_ultima_compra,representante_id,status")
      .eq("status", "ativo")
      .limit(500);
    // Todos veem todos os clientes ativos

    const followupsQ = supabase
      .from("followups")
      .select("id,client_id,subject,due_date,due_time,status")
      .eq("assigned_to", targetUserId)
      .eq("due_date", todayStr)
      .neq("status", "concluido");

    const oportunidadesQ = supabase
      .from("opportunities")
      .select("id,company_id,title,temperature,status")
      .eq("owner_id", targetUserId)
      .eq("status", "open")
      .eq("temperature", "quente");

    const visitasHistoricoQ = supabase
      .from("visitas")
      .select("id,cliente_id,check_in_at,data_visita")
      .eq("vendedor_id", targetUserId)
      .order("check_in_at", { ascending: false })
      .limit(800);

    const pedidosMesQ = supabase
      .from("pedidos")
      .select("cliente_id,created_at")
      .eq("representante_id", targetUserId)
      .gte("created_at", inicioMes);

    const [clientesRes, followupsRes, oportunidadesRes, visitasRes, pedidosRes] = await Promise.all([
      clientesQ,
      followupsQ,
      oportunidadesQ,
      visitasHistoricoQ,
      pedidosMesQ,
    ]);

    const clientes = clientesRes.data ?? [];
    const followups = followupsRes.data ?? [];
    const oportunidades = oportunidadesRes.data ?? [];
    const visitas = visitasRes.data ?? [];
    const pedidos = pedidosRes.data ?? [];

    const followupByClient = new Map<string, any>();
    followups.forEach((f) => followupByClient.set(f.client_id, f));

    const oppByClient = new Map<string, any>();
    oportunidades.forEach((o) => oppByClient.set(o.company_id, o));

    const ultimaVisitaByClient = new Map<string, { check_in_at: string; data_visita: string; id: string }>();
    visitas.forEach((v) => {
      if (!ultimaVisitaByClient.has(v.cliente_id)) {
        ultimaVisitaByClient.set(v.cliente_id, v);
      }
    });

    const visitaHojeByClient = new Map<string, string>();
    visitas
      .filter((v) => v.data_visita === todayStr)
      .forEach((v) => visitaHojeByClient.set(v.cliente_id, v.id));

    const clientesComPedidoMes = new Set(pedidos.map((p) => p.cliente_id));

    const items: RotaCliente[] = clientes
      .map((c) => {
        const prioridade = priorizarCliente({
          cliente: c,
          ultimaVisita: ultimaVisitaByClient.get(c.id) ?? null,
          tarefaHoje: followupByClient.get(c.id) ?? null,
          oportunidadeQuente: oppByClient.get(c.id) ?? null,
          temPedidoMes: clientesComPedidoMes.has(c.id),
        });
        return {
          cliente: c,
          prioridade,
          visitaHojeId: visitaHojeByClient.get(c.id) ?? null,
        };
      })
      .filter((r) => r.prioridade.score > 0)
      .sort((a, b) => b.prioridade.score - a.prioridade.score)
      .slice(0, 30);

    setRota(items);
    setLoading(false);
  }, [user?.id, isAdminOrGestor, viewUserId]);

  useEffect(() => {
    fetchRota();
  }, [fetchRota]);

  return { rota, loading, refetch: fetchRota, setRota };
}
