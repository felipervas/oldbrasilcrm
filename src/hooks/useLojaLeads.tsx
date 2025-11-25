import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLojaLeads() {
  const queryClient = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ['loja-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loja_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('loja_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loja-leads'] });
      toast.success('Lead excluído com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao excluir lead:', error);
      toast.error('Erro ao excluir lead');
    },
  });

  const convertToClient = useMutation({
    mutationFn: async ({ leadId, clientData }: { 
      leadId: string; 
      clientData: {
        nome_fantasia: string;
        razao_social?: string;
        cnpj_cpf?: string;
        telefone?: string;
        email?: string;
        cidade?: string;
        uf?: string;
        cep?: string;
        logradouro?: string;
        numero?: string;
        observacoes?: string;
      };
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar o cliente
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          ...clientData,
          responsavel_id: user.id,
          ativo: true,
        })
        .select()
        .single();

      if (clienteError) throw clienteError;

      // Deletar o lead após conversão bem-sucedida
      const { error: deleteError } = await supabase
        .from('loja_leads')
        .delete()
        .eq('id', leadId);

      if (deleteError) throw deleteError;

      return cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loja-leads'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Lead convertido em cliente com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao converter lead:', error);
      toast.error('Erro ao converter lead em cliente');
    },
  });

  return {
    leads,
    isLoading,
    deleteLead,
    convertToClient,
  };
}
