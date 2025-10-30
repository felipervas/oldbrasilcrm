import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventoDia } from '@/hooks/useRelatorioDiario';
import { Phone, AlertCircle, Clock, Navigation, CheckCircle2 } from 'lucide-react';

interface EventoTarefaCardProps {
  evento: EventoDia;
  isHoje: boolean;
}

export const EventoTarefaCard = memo(({ evento, isHoje }: EventoTarefaCardProps) => {
  if (!evento.tarefa) return null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {evento.tarefa.tipo === 'ligacao' ? (
            <Phone className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{evento.tarefa.titulo}</h4>
            {evento.tarefa.cliente_nome && (
              <p className="text-sm text-muted-foreground truncate">
                Cliente: {evento.tarefa.cliente_nome}
              </p>
            )}
            {evento.horario_inicio && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {evento.horario_inicio}
              </p>
            )}
            {evento.tarefa.descricao && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {evento.tarefa.descricao}
              </p>
            )}
            {evento.endereco_completo && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 truncate">
                <Navigation className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{evento.endereco_completo}</span>
              </p>
            )}
          </div>
        </div>
        <Badge 
          variant={evento.tarefa.prioridade === 'alta' ? 'destructive' : 'secondary'}
          className="ml-2 flex-shrink-0"
        >
          {evento.tarefa.prioridade}
        </Badge>
      </div>
      {evento.status === 'pendente' && isHoje && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1 text-xs h-8">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Concluir
          </Button>
          {evento.endereco_completo && (
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs h-8"
              onClick={() => {
                const endereco = encodeURIComponent(evento.endereco_completo || '');
                window.open(`https://www.google.com/maps/search/?api=1&query=${endereco}`, '_blank');
              }}
            >
              <Navigation className="h-3 w-3 mr-1" />
              Navegar
            </Button>
          )}
        </div>
      )}
    </Card>
  );
});

EventoTarefaCard.displayName = 'EventoTarefaCard';
