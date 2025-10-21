import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TabelaPreco {
  id: string;
  produto_id: string;
  nome_tabela: string;
  preco_por_kg: number | null;
  ativo: boolean;
  usar_no_site: boolean;
  created_at: string;
  updated_at: string;
}

export const useTabelasPreco = (produtoId?: string) => {
  return useQuery({
    queryKey: ['tabelas-preco', produtoId],
    queryFn: async () => {
      if (!produtoId) return [];
      
      const { data, error } = await supabase
        .from('produto_tabelas_preco')
        .select('*')
        .eq('produto_id', produtoId)
        .order('nome_tabela', { ascending: true });

      if (error) throw error;
      return data as TabelaPreco[];
    },
    enabled: !!produtoId,
  });
};

export const useCreateTabelaPreco = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      produto_id: string;
      nome_tabela: string;
      preco_por_kg: number | null;
      usar_no_site?: boolean;
    }) => {
      const { data: result, error } = await supabase
        .from('produto_tabelas_preco')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tabelas-preco', variables.produto_id] });
      toast({
        title: "✅ Tabela de preço adicionada",
        description: "A tabela foi criada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao criar tabela",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTabelaPreco = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      produto_id: string;
      nome_tabela?: string;
      preco_por_kg?: number | null;
      ativo?: boolean;
      usar_no_site?: boolean;
    }) => {
      const { id, produto_id, ...updateData } = data;
      
      const { data: result, error } = await supabase
        .from('produto_tabelas_preco')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tabelas-preco', variables.produto_id] });
      toast({
        title: "✅ Tabela atualizada",
        description: "As alterações foram salvas",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteTabelaPreco = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; produto_id: string }) => {
      const { error } = await supabase
        .from('produto_tabelas_preco')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tabelas-preco', variables.produto_id] });
      toast({
        title: "✅ Tabela removida",
        description: "A tabela foi excluída com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
