import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { registrarAtividade } from '@/hooks/useHistoricoEquipe';

export const useTarefas = (page: number = 0, pageSize: number = 20) => {
  const start = page * pageSize;
  const end = start + pageSize - 1;

  return useQuery({
    queryKey: ['tarefas', page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('tarefas')
        .select('id, titulo, descricao, status, tipo, prioridade, data_prevista, horario, created_at, cliente_id, responsavel_id, clientes(nome_fantasia), profiles(nome)', { count: 'exact' })
        .order('data_prevista', { ascending: true })
        .range(start, end);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateTarefa = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tarefa: any) => {
      const { data, error } = await supabase.from('tarefas').insert(tarefa).select();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast({ title: 'Tarefa criada com sucesso!' });
      
      // Registrar no histórico
      if (data && data[0]) {
        await registrarAtividade({
          acao: 'criar_tarefa',
          entidade_tipo: 'tarefa',
          entidade_id: data[0].id,
          detalhes: { titulo: data[0].titulo, status: data[0].status }
        });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar tarefa', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateTarefa = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from('tarefas').update(updates).eq('id', id).select();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast({ title: 'Tarefa atualizada com sucesso!' });
      
      // Registrar no histórico
      if (data && data[0]) {
        const acao = data[0].status === 'concluida' ? 'concluir_tarefa' : 'atualizar_tarefa';
        await registrarAtividade({
          acao,
          entidade_tipo: 'tarefa',
          entidade_id: variables.id,
          detalhes: { titulo: data[0].titulo, status: data[0].status, mudancas: Object.keys(variables).filter(k => k !== 'id') }
        });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar tarefa', description: error.message, variant: 'destructive' });
    },
  });
};
