import { supabase } from '@/integrations/supabase/client';

// Função helper para registrar atividades no histórico da equipe
export const registrarAtividade = async (params: {
  acao: string;
  entidade_tipo?: string;
  entidade_id?: string;
  detalhes?: any;
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('historico_equipe')
      .insert({
        user_id: user.id,
        acao: params.acao,
        entidade_tipo: params.entidade_tipo || null,
        entidade_id: params.entidade_id || null,
        detalhes: params.detalhes || null,
      });

    if (error) {
      console.error('Erro ao registrar atividade:', error);
    }
  } catch (error) {
    console.error('Erro ao registrar atividade:', error);
  }
};

// Exemplos de uso:
// await registrarAtividade({ acao: 'criar_pedido', entidade_tipo: 'pedido', entidade_id: novoPedidoId, detalhes: { numero_pedido: '123' } });
// await registrarAtividade({ acao: 'editar_cliente', entidade_tipo: 'cliente', entidade_id: clienteId, detalhes: { nome_fantasia: 'Cliente X' } });
// await registrarAtividade({ acao: 'concluir_tarefa', entidade_tipo: 'tarefa', entidade_id: tarefaId, detalhes: { titulo: 'Tarefa X' } });
