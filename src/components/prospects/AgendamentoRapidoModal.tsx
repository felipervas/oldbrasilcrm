import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Sparkles } from 'lucide-react';
import { Prospect } from '@/hooks/useProspects';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIAInsights } from '@/hooks/useIAInsights';

interface AgendamentoRapidoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect | null;
  onSuccess: () => void;
}

export const AgendamentoRapidoModal = ({
  open,
  onOpenChange,
  prospect,
  onSuccess,
}: AgendamentoRapidoModalProps) => {
  const { toast } = useToast();
  const { generateInsights } = useIAInsights();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    data_visita: '',
    horario_inicio: '',
    horario_fim: '',
    observacoes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospect) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Criar visita
      const { data: visita, error: visitaError } = await supabase
        .from('prospect_visitas')
        .insert({
          prospect_id: prospect.id,
          responsavel_id: user.id,
          data_visita: formData.data_visita,
          horario_inicio: formData.horario_inicio || null,
          horario_fim: formData.horario_fim || null,
          observacoes: formData.observacoes || null,
          status: 'agendada',
        })
        .select()
        .single();

      if (visitaError) throw visitaError;

      // 2. Criar evento no colaborador
      const { error: eventoError } = await supabase
        .from('colaborador_eventos')
        .insert({
          colaborador_id: user.id,
          titulo: `Visita: ${prospect.nome_empresa}`,
          descricao: `Visita agendada ao prospect ${prospect.nome_empresa}`,
          data: formData.data_visita,
          horario: formData.horario_inicio || null,
          tipo: 'visita',
        });

      if (eventoError) throw eventoError;

      // 3. Disparar IA automaticamente
      toast({
        title: '✅ Visita agendada!',
        description: 'Gerando insights sobre o prospect...',
      });

      generateInsights({
        prospectId: prospect.id,
        nomeEmpresa: prospect.nome_empresa,
        segmento: prospect.segmento,
        cidade: prospect.cidade,
      });

      onOpenChange(false);
      setFormData({
        data_visita: '',
        horario_inicio: '',
        horario_fim: '',
        observacoes: '',
      });
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao agendar visita:', error);
      toast({
        title: 'Erro ao agendar visita',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendar Visita - {prospect?.nome_empresa}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Data *</Label>
            <Input
              type="date"
              value={formData.data_visita}
              onChange={(e) => setFormData({ ...formData, data_visita: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Horário Início</Label>
              <Input
                type="time"
                value={formData.horario_inicio}
                onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })}
              />
            </div>
            <div>
              <Label>Horário Fim</Label>
              <Input
                type="time"
                value={formData.horario_fim}
                onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Informações adicionais sobre a visita..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Sparkles className="h-4 w-4 mr-2" />
              {loading ? 'Agendando...' : 'Agendar e Gerar Insights'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
