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
    staleTime: 30000, // Cache por 30 segundos para melhor performance
  });

  const createEvento = useMutation({
    mutationFn: async (evento: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Converter horário vazio para null
      const eventoData = {
        ...evento,
        horario: evento.horario || null,
        colaborador_id: user.id
      };

      const { data, error } = await supabase
        .from('colaborador_eventos')
        .insert(eventoData)
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
      // Converter horário vazio para null
      const updateData = {
        ...updates,
        horario: updates.horario || null
      };

      const { data, error } = await supabase
        .from('colaborador_eventos')
        .update(updateData)
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

  const toggleConcluido = useMutation({
    mutationFn: async ({ id, concluido, comentario }: { id: string; concluido: boolean; comentario?: string }) => {
      const { data, error } = await supabase
        .from('colaborador_eventos')
        .update({ concluido, comentario: comentario || null })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, concluido }) => {
      // Optimistic update para melhor UX
      await queryClient.cancelQueries({ queryKey: ['colaborador-eventos'] });
      const previousEventos = queryClient.getQueryData(['colaborador-eventos']);
      
      queryClient.setQueryData(['colaborador-eventos'], (old: any) => 
        old?.map((evento: any) => 
          evento.id === id ? { ...evento, concluido } : evento
        )
      );

      return { previousEventos };
    },
    onError: (_err, _variables, context: any) => {
      queryClient.setQueryData(['colaborador-eventos'], context.previousEventos);
      toast({ title: 'Erro ao atualizar evento', variant: 'destructive' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-eventos'] });
    },
  });

  const createMultipleEventos = useMutation({
    mutationFn: async ({ titulos, data, tipo }: { titulos: string[]; data: string; tipo: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const eventos = titulos.map(titulo => ({
        titulo: titulo.trim(),
        data,
        tipo,
        colaborador_id: user.id,
        concluido: false
      }));

      const { data: insertedData, error } = await supabase
        .from('colaborador_eventos')
        .insert(eventos)
        .select();

      if (error) throw error;
      return insertedData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-eventos'] });
      toast({ title: `${data.length} eventos criados com sucesso!` });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar eventos', description: error.message, variant: 'destructive' });
    },
  });

  return {
    eventos,
    isLoading,
    createEvento,
    updateEvento,
    deleteEvento,
    toggleConcluido,
    createMultipleEventos,
  };
};
