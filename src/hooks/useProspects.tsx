import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ProspectStatus = 'novo' | 'em_contato' | 'aguardando_retorno' | 'em_negociacao' | 'proposta_enviada' | 'ganho' | 'perdido' | 'futuro';
export type ProspectPrioridade = 'alta' | 'media' | 'baixa';
export type ProspectPorte = 'Grande' | 'Médio' | 'Pequeno';

export interface Prospect {
  id: string;
  nome_empresa: string;
  cidade?: string;
  estado?: string;
  porte?: ProspectPorte;
  segmento?: string;
  produto_utilizado?: string;
  telefone?: string;
  email?: string;
  site?: string;
  responsavel_id?: string;
  criado_por_id?: string;
  status: ProspectStatus;
  prioridade: ProspectPrioridade;
  data_ultimo_contato?: string;
  data_proximo_contato?: string;
  origem?: string;
  observacoes?: string;
  convertido_cliente_id?: string;
  motivo_perda?: string;
  endereco_completo?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    nome: string;
  };
  criador?: {
    nome: string;
  };
}

export interface ProspectInteracao {
  id: string;
  prospect_id: string;
  usuario_id: string;
  tipo_interacao: 'ligacao' | 'email' | 'whatsapp' | 'visita' | 'reuniao' | 'outro';
  data_interacao: string;
  descricao: string;
  resultado?: 'positivo' | 'neutro' | 'negativo';
  proximo_passo?: string;
  created_at: string;
  profiles?: {
    nome: string;
  };
}

export const useProspects = () => {
  return useQuery({
    queryKey: ['prospects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prospects')
        .select(`
          *,
          profiles:responsavel_id(nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Buscar criadores separadamente para evitar erro de relação
      const prospectsComCriador = await Promise.all(
        (data || []).map(async (prospect) => {
          if (prospect.criado_por_id) {
            const { data: criador } = await supabase
              .from('profiles')
              .select('nome')
              .eq('id', prospect.criado_por_id)
              .single();
            return { ...prospect, criador };
          }
          return prospect;
        })
      );
      
      return prospectsComCriador as Prospect[];
    },
  });
};

export const useProspectInteracoes = (prospectId: string) => {
  return useQuery({
    queryKey: ['prospect-interacoes', prospectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prospect_interacoes')
        .select('*, profiles(nome)')
        .eq('prospect_id', prospectId)
        .order('data_interacao', { ascending: false });

      if (error) throw error;
      return data as ProspectInteracao[];
    },
    enabled: !!prospectId,
  });
};

export const useCreateProspect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prospect: { nome_empresa: string } & Omit<Partial<Prospect>, 'id' | 'created_at' | 'updated_at' | 'profiles' | 'criador' | 'nome_empresa'>) => {
      // Pegar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('prospects')
        .insert([{
          ...prospect,
          criado_por_id: user?.id,
        } as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar prospect:', error);
      toast.error('Erro ao cadastrar prospect');
    },
  });
};

export const useUpdateProspect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Prospect> & { id: string }) => {
      // Remove campos de relacionamento que não existem como colunas no banco
      const { profiles, criador, ...validUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('prospects')
        .update(validUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar prospect:', error);
      toast.error('Erro ao atualizar prospect');
    },
  });
};

export const useDeleteProspect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect deletado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar prospect:', error);
      toast.error('Erro ao deletar prospect');
    },
  });
};

export const useCreateInteracao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interacao: { prospect_id: string; tipo_interacao: 'ligacao' | 'email' | 'whatsapp' | 'visita' | 'reuniao' | 'outro'; descricao: string } & Omit<Partial<ProspectInteracao>, 'id' | 'created_at' | 'profiles' | 'usuario_id' | 'prospect_id' | 'tipo_interacao' | 'descricao'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('prospect_interacoes')
        .insert([{ ...interacao, usuario_id: user.id } as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-interacoes', variables.prospect_id] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Interação registrada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar interação:', error);
      toast.error('Erro ao registrar interação');
    },
  });
};

export const useUpdateInteracao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prospect_id, ...updates }: Partial<ProspectInteracao> & { id: string; prospect_id: string }) => {
      const { data, error } = await supabase
        .from('prospect_interacoes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-interacoes', variables.prospect_id] });
      toast.success('Interação atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar interação:', error);
      toast.error('Erro ao atualizar interação');
    },
  });
};

export const useDeleteInteracao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prospect_id }: { id: string; prospect_id: string }) => {
      const { error } = await supabase
        .from('prospect_interacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-interacoes', variables.prospect_id] });
      toast.success('Interação deletada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar interação:', error);
      toast.error('Erro ao deletar interação');
    },
  });
};

export const useBulkCreateProspects = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prospects: Omit<Partial<Prospect>, 'id' | 'created_at' | 'updated_at' | 'profiles' | 'criador'>[]) => {
      // Pegar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('prospects')
        .insert(prospects.map(p => ({
          ...p,
          criado_por_id: user?.id,
        })) as any)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success(`${data.length} prospects importados com sucesso!`);
    },
    onError: (error) => {
      console.error('Erro ao importar prospects:', error);
      toast.error('Erro ao importar prospects');
    },
  });
};
