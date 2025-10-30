import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

export interface EventoDia {
  id: string;
  tipo: 'visita' | 'tarefa' | 'evento';
  titulo: string;
  horario_inicio?: string;
  horario_fim?: string;
  data: Date;
  status?: string;
  endereco_completo?: string;
  prospect?: {
    id: string;
    nome_empresa: string;
    endereco_completo?: string;
    segmento?: string;
    cidade?: string;
  };
  insights?: {
    resumo_empresa?: string;
    produtos_recomendados?: string[];
    dicas_abordagem?: string[];
  };
  tarefa?: {
    id: string;
    titulo?: string;
    descricao?: string;
    prioridade?: string;
    tipo?: string;
    cliente_nome?: string;
  };
}

export const useRelatorioDiario = (data: Date) => {
  const dataInicio = startOfDay(data);
  const dataFim = endOfDay(data);

  return useQuery({
    queryKey: ['relatorio-diario', format(data, 'yyyy-MM-dd')],
    staleTime: 30000, // Cache por 30 segundos
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const eventos: EventoDia[] = [];

      // Buscar visitas do dia
      const { data: visitas, error: visitasError } = await supabase
        .from('prospect_visitas')
        .select(`
          id,
          data_visita,
          horario_inicio,
          horario_fim,
          status,
          prospects (
            id,
            nome_empresa,
            endereco_completo,
            segmento,
            cidade
          )
        `)
        .eq('responsavel_id', user.id)
        .eq('data_visita', format(data, 'yyyy-MM-dd'))
        .order('horario_inicio', { ascending: true });

      if (visitasError) throw visitasError;

      if (visitas) {
        // Buscar insights para os prospects das visitas
        const prospectIds = visitas
          .filter((v: any) => v.prospects?.id)
          .map((v: any) => v.prospects.id);

        const { data: insights } = prospectIds.length > 0 
          ? await supabase
              .from('prospect_ia_insights')
              .select('*')
              .in('prospect_id', prospectIds)
          : { data: [] };

        const insightsMap = (insights || []).reduce((acc: any, insight: any) => {
          acc[insight.prospect_id] = insight;
          return acc;
        }, {});

        visitas.forEach((visita: any) => {
          const insight = visita.prospects?.id ? insightsMap[visita.prospects.id] : null;
          
          eventos.push({
            id: visita.id,
            tipo: 'visita',
            titulo: `Visita: ${visita.prospects?.nome_empresa || 'Prospect'}`,
            horario_inicio: visita.horario_inicio,
            horario_fim: visita.horario_fim,
            data: new Date(visita.data_visita),
            status: visita.status,
            prospect: visita.prospects ? {
              id: visita.prospects.id,
              nome_empresa: visita.prospects.nome_empresa,
              endereco_completo: visita.prospects.endereco_completo,
              segmento: visita.prospects.segmento,
              cidade: visita.prospects.cidade,
            } : undefined,
            insights: insight ? {
              resumo_empresa: insight.resumo_empresa,
              produtos_recomendados: insight.produtos_recomendados,
              dicas_abordagem: insight.dicas_abordagem,
            } : undefined,
          });
        });
      }

      // Buscar eventos do colaborador do dia (todos os tipos)
      const { data: eventosColab, error: eventosError } = await supabase
        .from('colaborador_eventos')
        .select('*')
        .eq('colaborador_id', user.id)
        .eq('data', format(data, 'yyyy-MM-dd'))
        .order('horario', { ascending: true });

      if (eventosError) throw eventosError;

      if (eventosColab) {
        eventosColab.forEach((evento: any) => {
          eventos.push({
            id: evento.id,
            tipo: 'evento',
            titulo: evento.titulo,
            horario_inicio: evento.horario,
            data: new Date(evento.data),
          });
        });
      }

      // Buscar tarefas do dia
      const { data: tarefas, error: tarefasError } = await supabase
        .from('tarefas')
        .select(`
          id,
          titulo,
          descricao,
          data_prevista,
          horario,
          status,
          prioridade,
          tipo,
          endereco_completo,
          clientes (
            nome_fantasia
          )
        `)
        .eq('responsavel_id', user.id)
        .eq('data_prevista', format(data, 'yyyy-MM-dd'))
        .in('status', ['pendente', 'em_andamento'])
        .order('horario', { ascending: true });

      if (tarefasError) throw tarefasError;

      if (tarefas) {
        tarefas.forEach((tarefa: any) => {
          eventos.push({
            id: tarefa.id,
            tipo: 'tarefa',
            titulo: tarefa.titulo || 'Tarefa',
            horario_inicio: tarefa.horario,
            data: new Date(tarefa.data_prevista),
            status: tarefa.status,
            endereco_completo: tarefa.endereco_completo,
            tarefa: {
              id: tarefa.id,
              titulo: tarefa.titulo,
              descricao: tarefa.descricao,
              prioridade: tarefa.prioridade,
              tipo: tarefa.tipo,
              cliente_nome: tarefa.clientes?.nome_fantasia,
            }
          });
        });
      }

      // Ordenar todos os eventos por horário
      eventos.sort((a, b) => {
        const timeA = a.horario_inicio || '23:59';
        const timeB = b.horario_inicio || '23:59';
        return timeA.localeCompare(timeB);
      });

      return eventos;
    },
  });
};