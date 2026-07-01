import { supabase } from "@/integrations/supabase/client";

/**
 * Cria/atualiza/cancela o followup de feedback de entrega vinculado a um pedido.
 * - Se previsao for null e existir followup, marca como cancelado.
 * - Se previsao for definida e não existir followup, cria.
 * - Se previsao mudou, atualiza due_date do followup existente.
 */
export async function syncFeedbackFollowup(params: {
  pedidoId: string;
  representanteId: string;
  clienteId: string;
  clienteNome: string;
  previsao: string | null; // YYYY-MM-DD
  feedbackFollowupId: string | null;
}): Promise<{ followupId: string | null; error: Error | null }> {
  const { pedidoId, representanteId, clienteId, clienteNome, previsao, feedbackFollowupId } = params;

  // Cancelar quando previsão é removida
  if (!previsao) {
    if (feedbackFollowupId) {
      const { error } = await supabase
        .from("followups")
        .update({ status: "cancelado" })
        .eq("id", feedbackFollowupId);
      if (error) return { followupId: feedbackFollowupId, error };
    }
    return { followupId: null, error: null };
  }

  const subject = `Confirmar entrega — ${clienteNome} (Pedido #${pedidoId.slice(0, 8)})`;
  const notes = `pedido_id:${pedidoId}`;

  // Atualizar followup existente
  if (feedbackFollowupId) {
    const { error } = await supabase
      .from("followups")
      .update({
        due_date: previsao,
        subject,
        notes,
        status: "pendente",
      })
      .eq("id", feedbackFollowupId);
    if (error) return { followupId: feedbackFollowupId, error };
    return { followupId: feedbackFollowupId, error: null };
  }

  // Criar novo followup
  const { data, error } = await supabase
    .from("followups")
    .insert({
      client_id: clienteId,
      assigned_to: representanteId,
      due_date: previsao,
      type: "feedback_entrega",
      subject,
      notes,
      status: "pendente",
    })
    .select("id")
    .single();

  if (error || !data) return { followupId: null, error: error ?? new Error("Erro ao criar followup") };
  return { followupId: data.id, error: null };
}
