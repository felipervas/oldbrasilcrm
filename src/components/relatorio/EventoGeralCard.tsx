import { memo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { EventoDia } from '@/hooks/useRelatorioDiario';
import { CalendarDays, Clock, MapPin, Navigation, Edit2, Trash, CheckCircle2 } from 'lucide-react';

interface EventoGeralCardProps {
  evento: EventoDia;
}

export const EventoGeralCard = memo(({ evento }: EventoGeralCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [titulo, setTitulo] = useState(evento.titulo);
  const [horario, setHorario] = useState(evento.horario_inicio || '');

  const handleExcluir = async () => {
    if (!confirm('Deseja excluir este evento?')) return;
    
    setExcluindo(true);
    try {
      const { error } = await supabase
        .from('colaborador_eventos')
        .delete()
        .eq('id', evento.id);

      if (error) throw error;

      toast({ title: '✅ Evento excluído' });
      queryClient.invalidateQueries({ queryKey: ['relatorio-diario'] });
      queryClient.invalidateQueries({ queryKey: ['colaborador-eventos'] });
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({ 
        title: 'Erro ao excluir evento', 
        variant: 'destructive' 
      });
    } finally {
      setExcluindo(false);
    }
  };

  const handleSalvarEdicao = async () => {
    try {
      const { error } = await supabase
        .from('colaborador_eventos')
        .update({ 
          titulo: titulo,
          horario: horario || null
        })
        .eq('id', evento.id);

      if (error) throw error;

      toast({ title: '✅ Evento atualizado!' });
      queryClient.invalidateQueries({ queryKey: ['relatorio-diario'] });
      queryClient.invalidateQueries({ queryKey: ['colaborador-eventos'] });
      setEditando(false);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast({ 
        title: 'Erro ao atualizar evento', 
        variant: 'destructive' 
      });
    }
  };

  const handleConcluir = async () => {
    try {
      const { error } = await supabase
        .from('colaborador_eventos')
        .update({ concluido: true })
        .eq('id', evento.id);

      if (error) throw error;

      toast({ title: '✅ Evento concluído!' });
      queryClient.invalidateQueries({ queryKey: ['relatorio-diario'] });
      queryClient.invalidateQueries({ queryKey: ['colaborador-eventos'] });
    } catch (error) {
      console.error('Erro ao concluir:', error);
      toast({ 
        title: 'Erro ao concluir evento', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <CalendarDays className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold truncate">{evento.titulo}</h4>
            {evento.horario_inicio && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {evento.horario_inicio}
              </p>
            )}
          </div>
        </div>
      </div>

      {evento.endereco_completo && (
        <div className="flex items-start gap-2 mb-3 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{evento.endereco_completo}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleConcluir}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Concluir
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => setEditando(true)}
        >
          <Edit2 className="h-3 w-3 mr-1" />
          Editar
        </Button>

        {evento.endereco_completo && (
          <Button 
            size="sm" 
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              const endereco = encodeURIComponent(evento.endereco_completo || '');
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

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input 
                value={titulo} 
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>
            <div>
              <Label>Horário</Label>
              <Input 
                type="time" 
                value={horario} 
                onChange={(e) => setHorario(e.target.value)}
              />
            </div>
            <Button onClick={handleSalvarEdicao} className="w-full">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
});

EventoGeralCard.displayName = 'EventoGeralCard';
