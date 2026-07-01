import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPosition, reverseGeocode } from "@/lib/geo";

export interface Visita {
  id: string;
  vendedor_id: string;
  cliente_id: string;
  rota_id: string | null;
  pedido_id: string | null;
  data_visita: string;
  check_in_at: string;
  check_out_at: string | null;
  latitude: number | null;
  longitude: number | null;
  endereco_aprox: string | null;
  motivo: string | null;
  resultado: string;
  valor_gerado: number;
  observacoes: string | null;
  status: string;
}

export function useVisitas(filters?: { from?: string; to?: string; vendedorId?: string }) {
  const { user } = useAuth();
  const [visitas, setVisitas] = useState<Array<Visita & { cliente?: { nome_loja: string } | null }>>([]);
  const [loading, setLoading] = useState(false);

  const fetchVisitas = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("visitas")
      .select("*, cliente:clientes(nome_loja)")
      .order("check_in_at", { ascending: false })
      .limit(500);
    if (filters?.from) q = q.gte("data_visita", filters.from);
    if (filters?.to) q = q.lte("data_visita", filters.to);
    if (filters?.vendedorId) q = q.eq("vendedor_id", filters.vendedorId);
    const { data } = await q;
    setVisitas((data as any) ?? []);
    setLoading(false);
  }, [user?.id, filters?.from, filters?.to, filters?.vendedorId]);

  useEffect(() => {
    fetchVisitas();
  }, [fetchVisitas]);

  return { visitas, loading, refetch: fetchVisitas };
}

/**
 * Faz check-in: pega geolocalização, registra na tabela visitas e cria
 * uma interação tipo "visita_check_in" na timeline do cliente.
 */
export async function fazerCheckIn(params: {
  userId: string;
  clienteId: string;
  motivo?: string | null;
}): Promise<{ visitaId: string | null; error: Error | null }> {
  const coord = await getCurrentPosition();
  let endereco: string | null = null;
  if (coord) {
    endereco = await reverseGeocode(coord);
  }

  const { data, error } = await supabase
    .from("visitas")
    .insert({
      vendedor_id: params.userId,
      cliente_id: params.clienteId,
      latitude: coord?.lat ?? null,
      longitude: coord?.lng ?? null,
      endereco_aprox: endereco,
      motivo: params.motivo ?? null,
      status: "em_andamento",
      resultado: "em_andamento",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { visitaId: null, error: error ?? new Error("Falha ao registrar check-in") };
  }

  // Cria interação na timeline
  await supabase.from("interactions").insert({
    client_id: params.clienteId,
    created_by: params.userId,
    type: "visita_check_in",
    subject: "Check-in de visita",
    description: endereco
      ? `Check-in registrado em: ${endereco}`
      : coord
        ? `Check-in registrado nas coordenadas ${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`
        : "Check-in registrado (sem geolocalização)",
  });

  await supabase
    .from("clientes")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.clienteId);

  return { visitaId: data.id, error: null };
}

/**
 * Faz check-out de uma visita: salva resultado, observações e cria interação.
 */
export async function fazerCheckOut(params: {
  visitaId: string;
  clienteId: string;
  userId: string;
  resultado: string;
  observacoes?: string;
  valorGerado?: number;
  pedidoId?: string | null;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("visitas")
    .update({
      check_out_at: new Date().toISOString(),
      resultado: params.resultado,
      observacoes: params.observacoes ?? null,
      valor_gerado: params.valorGerado ?? 0,
      pedido_id: params.pedidoId ?? null,
      status: "finalizada",
    })
    .eq("id", params.visitaId);

  if (error) return { error };

  const labelResult: Record<string, string> = {
    vendeu: "✅ Vendeu",
    vai_pensar: "🤔 Vai pensar",
    sem_interesse: "❌ Sem interesse",
    nao_encontrado: "🚪 Não encontrado",
  };

  await supabase.from("interactions").insert({
    client_id: params.clienteId,
    created_by: params.userId,
    type: "visita_finalizada",
    subject: `Visita finalizada — ${labelResult[params.resultado] ?? params.resultado}`,
    description: params.observacoes || null,
  });

  return { error: null };
}
