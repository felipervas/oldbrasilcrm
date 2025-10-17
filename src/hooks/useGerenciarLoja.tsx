import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useGerenciarProdutos = (searchTerm: string = '') => {
  return useQuery({
    queryKey: ['gerenciar-produtos', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('produtos')
        .select(`
          id,
          nome,
          sku,
          preco_por_kg,
          visivel_loja,
          destaque_loja,
          categoria,
          subcategoria,
          ativo,
          marcas(id, nome),
          produto_imagens(id, url, ordem)
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
};

export const useGerenciarMarcas = () => {
  return useQuery({
    queryKey: ['gerenciar-marcas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marcas')
        .select(`
          id,
          nome,
          slug,
          descricao,
          site,
          ativa
        `)
        .order('nome');

      if (error) throw error;
      return data || [];
    },
  });
};

export const useUpdateProduto = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('produtos')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      // Log de auditoria
      await supabase.from('loja_audit_log').insert({
        acao: 'editar_produto',
        entidade_tipo: 'produto',
        entidade_id: id,
        detalhes: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerenciar-produtos'] });
      toast({
        title: "✅ Produto atualizado",
        description: "As alterações já estão visíveis na loja.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUploadImagemProduto = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ produtoId, file }: { produtoId: string; file: File }) => {
      // Upload da imagem
      const fileExt = file.name.split('.').pop();
      const fileName = `${produtoId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('produto-imagens')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Pegar URL pública
      const { data: urlData } = supabase.storage
        .from('produto-imagens')
        .getPublicUrl(filePath);

      // Pegar ordem atual
      const { data: existingImages } = await supabase
        .from('produto_imagens')
        .select('ordem')
        .eq('produto_id', produtoId)
        .order('ordem', { ascending: false })
        .limit(1);

      const nextOrdem = existingImages && existingImages.length > 0 
        ? existingImages[0].ordem + 1 
        : 0;

      // Inserir registro no banco
      const { error: dbError } = await supabase
        .from('produto_imagens')
        .insert({
          produto_id: produtoId,
          url: urlData.publicUrl,
          ordem: nextOrdem,
        });

      if (dbError) throw dbError;

      // Log de auditoria
      await supabase.from('loja_audit_log').insert({
        acao: 'upload_imagem',
        entidade_tipo: 'produto',
        entidade_id: produtoId,
        detalhes: { url: urlData.publicUrl },
      });

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerenciar-produtos'] });
      toast({
        title: "✅ Imagem adicionada",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRemoveImagemProduto = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ imagemId, url }: { imagemId: string; url: string }) => {
      // Extrair nome do arquivo da URL
      const fileName = url.split('/').pop();
      
      if (fileName) {
        // Deletar do storage
        await supabase.storage
          .from('produto-imagens')
          .remove([fileName]);
      }

      // Deletar registro do banco
      const { error } = await supabase
        .from('produto_imagens')
        .delete()
        .eq('id', imagemId);

      if (error) throw error;

      // Log de auditoria
      await supabase.from('loja_audit_log').insert({
        acao: 'remover_imagem',
        entidade_tipo: 'produto_imagem',
        entidade_id: imagemId,
        detalhes: { url },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerenciar-produtos'] });
      toast({
        title: "✅ Imagem removida",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover imagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateMarca = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('marcas')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      // Log de auditoria
      await supabase.from('loja_audit_log').insert({
        acao: 'editar_marca',
        entidade_tipo: 'marca',
        entidade_id: id,
        detalhes: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerenciar-marcas'] });
      toast({
        title: "✅ Marca atualizada",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar marca",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCreateMarca = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('marcas')
        .insert(data);

      if (error) throw error;

      // Log de auditoria
      await supabase.from('loja_audit_log').insert({
        acao: 'criar_marca',
        entidade_tipo: 'marca',
        detalhes: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerenciar-marcas'] });
      toast({
        title: "✅ Marca criada",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar marca",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
