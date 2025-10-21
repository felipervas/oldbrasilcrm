import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useColaboradorEventos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: eventos, isLoading } = useQuery({
    queryKey: ['colaborador-eventos'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('colaborador_eventos')
        .select('*')
        .eq('colaborador_id', user.id)
        .order('data', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const createEvento = useMutation({
    mutationFn: async (evento: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('colaborador_eventos')
        .insert({ ...evento, colaborador_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-eventos'] });
      toast({ title: 'Evento criado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar evento', description: error.message, variant: 'destructive' });
    },
  });

  const updateEvento = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('colaborador_eventos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-eventos'] });
      toast({ title: 'Evento atualizado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar evento', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEvento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('colaborador_eventos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-eventos'] });
      toast({ title: 'Evento deletado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao deletar evento', description: error.message, variant: 'destructive' });
    },
  });

  return {
    eventos,
    isLoading,
    createEvento,
    updateEvento,
    deleteEvento,
  };
};
