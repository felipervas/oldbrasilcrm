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
    mutationFn: async ({ leadId, clientData, leadOriginal }: { 
      leadId: string;
      leadOriginal?: any;
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
        bairro?: string;
        referencia?: string;
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

      // Registrar no histórico do cliente
      const historicoObservacao = `Lead convertido da loja\n` +
        `Origem: ${leadOriginal?.origem || 'Não especificada'}\n` +
        `Data do lead: ${new Date(leadOriginal?.created_at).toLocaleDateString('pt-BR')}\n` +
        `Mensagem original: ${leadOriginal?.mensagem || 'Sem mensagem'}`;

      const { error: historicoError } = await supabase
        .from('cliente_historico')
        .insert({
          cliente_id: cliente.id,
          usuario_id: user.id,
          tipo: 'conversao_lead',
          observacao: historicoObservacao,
          referencia_id: leadId,
        });

      if (historicoError) {
        console.error('Erro ao criar histórico:', historicoError);
      }

      // Criar contato inicial se tiver telefone ou email
      if (clientData.telefone || clientData.email) {
        const { error: contatoError } = await supabase
          .from('contatos_clientes')
          .insert({
            cliente_id: cliente.id,
            nome: clientData.nome_fantasia,
            telefone: clientData.telefone || null,
            email: clientData.email || null,
            tipo_contato: 'principal',
            fonte: 'conversao_lead',
            verificado: false,
          });

        if (contatoError) {
          console.error('Erro ao criar contato:', contatoError);
        }
      }

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
