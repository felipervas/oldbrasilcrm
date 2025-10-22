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
          *,
          marcas(id, nome),
          produto_imagens(id, url, ordem)
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('nome', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Erro ao carregar produtos:", error);
        throw error;
      }
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
      console.log('🔄 Atualizando produto:', id, data);
      
      // FASE 2: Usar dados já sanitizados do Dialog
      const sanitizedData = data;

      const { data: resultData, error } = await supabase
        .from('produtos')
        .update(sanitizedData)
        .eq('id', id)
        .select();

      if (error) {
        console.error("❌ Erro ao atualizar produto:", error);
        
        // Tratamento específico para erro de duplicate key
        if (error.code === '23505') {
          if (error.message.includes('produtos_sku_key')) {
            throw new Error('Este SKU já está em uso. Deixe vazio ou use outro valor.');
          }
          throw new Error('Valor duplicado. Verifique os dados e tente novamente.');
        }
        
        throw error;
      }

      console.log('✅ Produto atualizado com sucesso:', resultData);

      // Log de auditoria
      try {
        await supabase.from('loja_audit_log').insert({
          acao: 'editar_produto',
          entidade_tipo: 'produto',
          entidade_id: id,
          detalhes: sanitizedData,
        });
      } catch (auditError) {
        console.warn("⚠️ Erro ao criar log de auditoria:", auditError);
      }

      return resultData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerenciar-produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
    onError: (error: any) => {
      console.error("❌ Erro na mutation:", error);
      toast({
        title: "❌ Erro ao salvar",
        description: error.message || "Erro ao atualizar produto",
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

export const useToggleVisibilidadeProduto = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, visivel }: { id: string; visivel: boolean }) => {
      const { error } = await supabase
        .from('produtos')
        .update({ visivel_loja: visivel })
        .eq('id', id);

      if (error) throw error;

      // Log de auditoria
      await supabase.from('loja_audit_log').insert({
        acao: visivel ? 'mostrar_produto' : 'ocultar_produto',
        entidade_tipo: 'produto',
        entidade_id: id,
      });
    },
    onSuccess: (_, { visivel }) => {
      queryClient.invalidateQueries({ queryKey: ['gerenciar-produtos'] });
      toast({
        title: visivel ? "✅ Produto visível na loja" : "❌ Produto oculto",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar visibilidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useToggleDestaqueProduto = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, destaque }: { id: string; destaque: boolean }) => {
      const { error } = await supabase
        .from('produtos')
        .update({ destaque_loja: destaque })
        .eq('id', id);

      if (error) throw error;

      // Log de auditoria
      await supabase.from('loja_audit_log').insert({
        acao: destaque ? 'adicionar_destaque' : 'remover_destaque',
        entidade_tipo: 'produto',
        entidade_id: id,
      });
    },
    onSuccess: (_, { destaque }) => {
      queryClient.invalidateQueries({ queryKey: ['gerenciar-produtos'] });
      toast({
        title: destaque ? "⭐ Produto em destaque" : "Destaque removido",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar destaque",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
