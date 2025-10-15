import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useTarefas = (page: number = 0, pageSize: number = 20) => {
  const start = page * pageSize;
  const end = start + pageSize - 1;

  return useQuery({
    queryKey: ['tarefas', page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('tarefas')
        .select('*, clientes(nome_fantasia), profiles(nome)', { count: 'exact' })
        .order('data_prevista', { ascending: true })
        .range(start, end);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast({ title: 'Tarefa criada com sucesso!' });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast({ title: 'Tarefa atualizada com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar tarefa', description: error.message, variant: 'destructive' });
    },
  });
};
