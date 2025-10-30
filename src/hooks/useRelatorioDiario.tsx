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
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const eventos: EventoDia[] = [];

      // Buscar visitas do dia
      const { data: visitas, error: visitasError } = await supabase
        .from('prospect_visitas')
        .select(`
          *,
          prospects (
            id,
            nome_empresa,
            endereco_completo,
            segmento,
            cidade
          ),
          prospect_ia_insights (
            resumo_empresa,
            produtos_recomendados,
            dicas_abordagem
          )
        `)
        .eq('responsavel_id', user.id)
        .eq('data_visita', format(data, 'yyyy-MM-dd'))
        .order('horario_inicio', { ascending: true });

      if (visitasError) throw visitasError;

      if (visitas) {
        visitas.forEach((visita: any) => {
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
            insights: visita.prospect_ia_insights ? {
              resumo_empresa: visita.prospect_ia_insights.resumo_empresa,
              produtos_recomendados: visita.prospect_ia_insights.produtos_recomendados,
              dicas_abordagem: visita.prospect_ia_insights.dicas_abordagem,
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
          *,
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