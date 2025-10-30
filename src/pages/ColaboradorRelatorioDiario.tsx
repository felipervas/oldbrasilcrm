import { useState, memo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useRelatorioDiario, EventoDia } from '@/hooks/useRelatorioDiario';
import { EventoVisitaCard } from '@/components/relatorio/EventoVisitaCard';
import { EventoTarefaCard } from '@/components/relatorio/EventoTarefaCard';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CalendarDays, 
  ExternalLink
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ColaboradorRelatorioDiario() {
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const { data: eventos, isLoading } = useRelatorioDiario(dataSelecionada);

  const isHoje = isSameDay(dataSelecionada, new Date());

  const agruparEventosPorPeriodo = (eventos: EventoDia[]) => {
    const manha = eventos.filter(e => {
      const hora = e.horario_inicio ? parseInt(e.horario_inicio.split(':')[0]) : 12;
      return hora >= 6 && hora < 12;
    });
    const tarde = eventos.filter(e => {
      const hora = e.horario_inicio ? parseInt(e.horario_inicio.split(':')[0]) : 14;
      return hora >= 12 && hora < 18;
    });
    const noite = eventos.filter(e => {
      const hora = e.horario_inicio ? parseInt(e.horario_inicio.split(':')[0]) : 20;
      return hora >= 18 || hora < 6;
    });
    const semHorario = eventos.filter(e => !e.horario_inicio);

    return { manha, tarde, noite, semHorario };
  };

  const renderEvento = (evento: EventoDia) => {
    if (evento.tipo === 'visita' && evento.prospect) {
      return <EventoVisitaCard key={evento.id} evento={evento} />;
    }

    if (evento.tipo === 'tarefa' && evento.tarefa) {
      return <EventoTarefaCard key={evento.id} evento={evento} isHoje={isHoje} />;
    }

    return (
      <Card key={evento.id} className="p-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <div>
            <h4 className="font-semibold">{evento.titulo}</h4>
            {evento.horario_inicio && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                {evento.horario_inicio}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">📅 Meu Dia</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie suas atividades diárias de forma inteligente
          </p>
        </div>
        
        <div className="grid md:grid-cols-[300px_1fr] gap-6">
        {/* Sidebar com Calendário */}
        <div className="space-y-4">
          <Card className="p-4">
            <Calendar
              mode="single"
              selected={dataSelecionada}
              onSelect={(date) => date && setDataSelecionada(date)}
              locale={ptBR}
              className="rounded-md"
            />
          </Card>
          
          {eventos && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Resumo do Dia</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visitas:</span>
                  <span className="font-medium">
                    {eventos.filter(e => e.tipo === 'visita').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tarefas:</span>
                  <span className="font-medium">
                    {eventos.filter(e => e.tipo === 'tarefa').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Eventos:</span>
                  <span className="font-medium">
                    {eventos.filter(e => e.tipo === 'evento').length}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6" />
              {format(dataSelecionada, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
            {isHoje && (
              <p className="text-muted-foreground mt-1">
                Aqui está o seu relatório de hoje. Organize suas atividades e tenha um ótimo dia! 🚀
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : eventos && eventos.length > 0 ? (
            <div className="space-y-6">
              {(() => {
                const { manha, tarde, noite, semHorario } = agruparEventosPorPeriodo(eventos);

                return (
                  <>
                    {manha.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          🌅 Manhã (6h - 12h)
                        </h3>
                        <div className="space-y-3">
                          {manha.map(renderEvento)}
                        </div>
                      </div>
                    )}

                    {tarde.length > 0 && (
                      <div>
                        {manha.length > 0 && <Separator className="my-6" />}
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          ☀️ Tarde (12h - 18h)
                        </h3>
                        <div className="space-y-3">
                          {tarde.map(renderEvento)}
                        </div>
                      </div>
                    )}

                    {noite.length > 0 && (
                      <div>
                        {(manha.length > 0 || tarde.length > 0) && <Separator className="my-6" />}
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          🌙 Noite (18h - 6h)
                        </h3>
                        <div className="space-y-3">
                          {noite.map(renderEvento)}
                        </div>
                      </div>
                    )}

                    {semHorario.length > 0 && (
                      <div>
                        {(manha.length > 0 || tarde.length > 0 || noite.length > 0) && (
                          <Separator className="my-6" />
                        )}
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          📋 Sem Horário Definido
                        </h3>
                        <div className="space-y-3">
                          {semHorario.map(renderEvento)}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma atividade agendada</h3>
              <p className="text-muted-foreground mb-4">
                {isHoje 
                  ? 'Você não tem atividades agendadas para hoje.'
                  : 'Não há atividades agendadas para esta data.'}
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/prospects'}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Planejar Visitas
              </Button>
            </Card>
          )}
        </div>
      </div>
      </div>
    </AppLayout>
  );
}