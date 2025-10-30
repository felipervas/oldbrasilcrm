import { useState, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { EventoDia } from '@/hooks/useRelatorioDiario';
import { format } from 'date-fns';
import { 
  MapPin, 
  Clock, 
  Navigation, 
  Trash, 
  Lightbulb, 
  Package, 
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface EventoVisitaCardProps {
  evento: EventoDia;
}

export const EventoVisitaCard = memo(({ evento }: EventoVisitaCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandido, setExpandido] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const handleExcluir = async () => {
    if (!confirm('Deseja excluir esta visita?')) return;
    
    setExcluindo(true);
    try {
      // Excluir da prospect_visitas
      const { error: visitaError } = await supabase
        .from('prospect_visitas')
        .delete()
        .eq('id', evento.id);

      if (visitaError) throw visitaError;

      // Excluir evento correspondente
      const { error: eventoError } = await supabase
        .from('colaborador_eventos')
        .delete()
        .eq('titulo', `Visita: ${evento.prospect?.nome_empresa}`)
        .eq('data', format(evento.data, 'yyyy-MM-dd'));

      if (eventoError) console.warn('Evento não encontrado:', eventoError);

      toast({ title: '✅ Visita excluída com sucesso' });
      
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['relatorio-diario'] });
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({ 
        title: 'Erro ao excluir visita', 
        variant: 'destructive' 
      });
    } finally {
      setExcluindo(false);
    }
  };

  const handleFeedback = async (status: string) => {
    try {
      const { error } = await supabase
        .from('prospect_visitas')
        .update({ status })
        .eq('id', evento.id);

      if (error) throw error;

      toast({ title: '✅ Status atualizado!' });
      queryClient.invalidateQueries({ queryKey: ['relatorio-diario'] });
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast({ 
        title: 'Erro ao atualizar status', 
        variant: 'destructive' 
      });
    }
  };

  if (!evento.prospect) return null;

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-background">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="font-semibold text-lg truncate">{evento.prospect.nome_empresa}</h4>
            {evento.horario_inicio && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {evento.horario_inicio} {evento.horario_fim && `- ${evento.horario_fim}`}
              </p>
            )}
          </div>
        </div>
        <Badge variant={evento.status === 'realizada' ? 'default' : 'secondary'} className="ml-2 flex-shrink-0">
          {evento.status === 'agendada' && '📅 Agendada'}
          {evento.status === 'realizada' && '✅ Realizada'}
          {evento.status === 'cancelada' && '❌ Cancelada'}
          {evento.status === 'reagendada' && '🔄 Reagendar'}
          {evento.status === 'sem_resposta' && '📵 Sem Resposta'}
          {evento.status === 'ausente' && '🚫 Ausente'}
        </Badge>
      </div>

      {evento.prospect.endereco_completo && (
        <div className="flex items-start gap-2 mb-3 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{evento.prospect.endereco_completo}</span>
        </div>
      )}

      {evento.insights && (
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandido(!expandido)}
            className="w-full justify-between"
          >
            <span className="text-xs font-medium">Insights de IA</span>
            {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {expandido && (
            <div className="space-y-2 mt-2">
              {evento.insights.resumo_empresa && (
                <div className="bg-background/60 rounded-lg p-2">
                  <p className="text-xs font-medium flex items-center gap-1 mb-1">
                    <Lightbulb className="h-3 w-3 text-yellow-500" />
                    Sobre a empresa
                  </p>
                  <p className="text-xs text-muted-foreground">{evento.insights.resumo_empresa}</p>
                </div>
              )}

              {evento.insights.produtos_recomendados && evento.insights.produtos_recomendados.length > 0 && (
                <div className="bg-background/60 rounded-lg p-2">
                  <p className="text-xs font-medium flex items-center gap-1 mb-1">
                    <Package className="h-3 w-3 text-blue-500" />
                    Produtos
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {evento.insights.produtos_recomendados.slice(0, 2).map((produto, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {produto}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {evento.insights.dicas_abordagem && evento.insights.dicas_abordagem.length > 0 && (
                <div className="bg-background/60 rounded-lg p-2">
                  <p className="text-xs font-medium flex items-center gap-1 mb-1">
                    <AlertCircle className="h-3 w-3 text-green-500" />
                    Dicas
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {evento.insights.dicas_abordagem.slice(0, 2).map((dica, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-primary">•</span>
                        <span>{dica}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        <Select onValueChange={handleFeedback}>
          <SelectTrigger className="h-8 text-xs flex-1 min-w-[120px]">
            <SelectValue placeholder="Dar Feedback" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="realizada">✅ Realizada</SelectItem>
            <SelectItem value="cancelada">❌ Cancelada</SelectItem>
            <SelectItem value="reagendada">🔄 Reagendar</SelectItem>
            <SelectItem value="sem_resposta">📵 Sem Resposta</SelectItem>
            <SelectItem value="ausente">🚫 Ausente</SelectItem>
          </SelectContent>
        </Select>

        {evento.prospect.endereco_completo && (
          <Button 
            size="sm" 
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              const endereco = encodeURIComponent(evento.prospect?.endereco_completo || '');
              window.open(`https://www.google.com/maps/search/?api=1&query=${endereco}`, '_blank');
            }}
          >
            <Navigation className="h-3 w-3 mr-1" />
            Navegar
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleExcluir}
          disabled={excluindo}
        >
          <Trash className="h-3 w-3 mr-1" />
          Excluir
        </Button>
      </div>
    </Card>
  );
});

EventoVisitaCard.displayName = 'EventoVisitaCard';
