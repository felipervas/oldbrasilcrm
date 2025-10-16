import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useReceitas = (searchTerm: string = '', categoria: string = 'todos') => {
  return useQuery({
    queryKey: ['receitas', searchTerm, categoria],
    queryFn: async () => {
      let query = supabase
        .from('receitas')
        .select('*, profiles(nome)', { count: 'exact' });

      if (categoria !== 'todos') {
        query = query.eq('categoria', categoria);
      }

      if (searchTerm) {
        query = query.ilike('nome', `%${searchTerm}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useDeleteReceita = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, arquivoUrl }: { id: string; arquivoUrl: string }) => {
      // Deletar arquivo do storage
      const fileName = arquivoUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('receitas').remove([fileName]);
      }

      // Deletar registro do banco
      const { error } = await supabase.from('receitas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas'] });
      toast({ title: 'Receita deletada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao deletar receita', variant: 'destructive' });
    },
  });
};

export const useUploadReceita = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      nome,
      descricao,
      categoria,
      usuarioId,
    }: {
      file: File;
      nome: string;
      descricao?: string;
      categoria?: string;
      usuarioId: string;
    }) => {
      // Upload do arquivo
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('receitas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage.from('receitas').getPublicUrl(fileName);

      // Inserir registro no banco
      const { error: dbError } = await supabase.from('receitas').insert({
        nome,
        descricao,
        categoria,
        arquivo_url: urlData.publicUrl,
        arquivo_nome: file.name,
        usuario_id: usuarioId,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas'] });
      toast({ title: 'Receita adicionada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao adicionar receita', variant: 'destructive' });
    },
  });
};
