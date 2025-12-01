import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useFinanceiroBoletos = () => {
  const queryClient = useQueryClient();

  // Buscar todos os boletos
  const { data: boletos = [], isLoading } = useQuery({
    queryKey: ['financeiro-boletos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro')
        .select('*, clientes(nome_fantasia)')
        .eq('tipo', 'receita')
        .not('data_vencimento', 'is', null)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Analisar boleto com IA
  const analisarBoleto = async (arquivo: File): Promise<any> => {
    try {
      const fileExt = arquivo.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `boletos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pedidos')
        .upload(filePath, arquivo);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pedidos')
        .getPublicUrl(filePath);

      const { data, error } = await supabase.functions.invoke('analisar-boleto', {
        body: { imageUrl: publicUrl }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao analisar boleto');
      }

      return {
        ...data.data,
        arquivo_url: publicUrl,
        arquivo_nome: arquivo.name,
      };
    } catch (error: any) {
      console.error('Erro ao analisar boleto:', error);
      throw error;
    }
  };

  // Adicionar boleto
  const adicionarBoleto = useMutation({
    mutationFn: async (dados: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('financeiro').insert({
        cliente_id: dados.cliente_id || null,
        tipo: 'receita',
        usuario_id: user.id,
        descricao: dados.descricao || 'Boleto',
        valor: dados.valor,
        data_vencimento: dados.data_vencimento,
        beneficiario: dados.beneficiario,
        codigo_barras: dados.codigo_barras,
        arquivo_url: dados.arquivo_url,
        arquivo_nome: dados.arquivo_nome,
        status_pagamento: 'pendente',
        categoria: 'boleto',
        data: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-boletos'] });
      queryClient.invalidateQueries({ queryKey: ['boletos-gestor'] });
      toast.success('Boleto adicionado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar boleto: ' + error.message);
    },
  });

  // Marcar como pago
  const marcarComoPago = useMutation({
    mutationFn: async (boletoId: string) => {
      const { error } = await supabase
        .from('financeiro')
        .update({ 
          status_pagamento: 'pago',
          data: new Date().toISOString().split('T')[0]
        })
        .eq('id', boletoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-boletos'] });
      queryClient.invalidateQueries({ queryKey: ['boletos-gestor'] });
      toast.success('Boleto marcado como pago');
    },
    onError: (error: any) => {
      toast.error('Erro ao marcar boleto como pago: ' + error.message);
    },
  });

  // Deletar boleto
  const deletarBoleto = useMutation({
    mutationFn: async (boletoId: string) => {
      const { error } = await supabase
        .from('financeiro')
        .delete()
        .eq('id', boletoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-boletos'] });
      queryClient.invalidateQueries({ queryKey: ['boletos-gestor'] });
      toast.success('Boleto removido');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover boleto: ' + error.message);
    },
  });

  // Calcular totais
  const totais = {
    total: boletos.reduce((sum, b) => sum + (Number(b.valor) || 0), 0),
    pendente: boletos.filter(b => b.status_pagamento === 'pendente').reduce((sum, b) => sum + (Number(b.valor) || 0), 0),
    pago: boletos.filter(b => b.status_pagamento === 'pago').reduce((sum, b) => sum + (Number(b.valor) || 0), 0),
    vencidos: boletos.filter(b => {
      if (!b.data_vencimento || b.status_pagamento === 'pago') return false;
      return new Date(b.data_vencimento) < new Date();
    }).length,
  };

  return {
    boletos,
    isLoading,
    totais,
    analisarBoleto,
    adicionarBoleto: adicionarBoleto.mutate,
    marcarComoPago: marcarComoPago.mutate,
    deletarBoleto: deletarBoleto.mutate,
    isAdicionando: adicionarBoleto.isPending,
  };
};
