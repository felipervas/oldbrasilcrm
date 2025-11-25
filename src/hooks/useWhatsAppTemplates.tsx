import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useWhatsAppTemplates() {
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('ativo', true)
        .order('categoria', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const registrarInteracao = useMutation({
    mutationFn: async (params: {
      clienteId?: string;
      prospectId?: string;
      templateNome: string;
      mensagem: string;
      resumo?: string;
      proximosPasos?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('whatsapp_interacoes')
        .insert({
          cliente_id: params.clienteId || null,
          prospect_id: params.prospectId || null,
          usuario_id: user.id,
          template_usado: params.templateNome,
          mensagem_enviada: params.mensagem,
          resumo: params.resumo || null,
          proximos_passos: params.proximosPasos || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Interação WhatsApp registrada');
    },
    onError: (error) => {
      console.error('Erro ao registrar interação:', error);
      toast.error('Erro ao registrar interação');
    },
  });

  const substituirVariaveis = (template: string, variaveis: Record<string, string>) => {
    let mensagem = template;
    Object.entries(variaveis).forEach(([chave, valor]) => {
      mensagem = mensagem.replace(new RegExp(`{{${chave}}}`, 'g'), valor);
    });
    return mensagem;
  };

  return {
    templates,
    isLoading,
    registrarInteracao,
    substituirVariaveis,
  };
}