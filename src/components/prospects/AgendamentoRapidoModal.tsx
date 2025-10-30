import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Sparkles } from 'lucide-react';
import { Prospect, useProspects } from '@/hooks/useProspects';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIAInsights } from '@/hooks/useIAInsights';

interface AgendamentoRapidoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect?: Prospect | null;
  onSuccess: () => void;
}

export const AgendamentoRapidoModal = ({
  open,
  onOpenChange,
  prospect: prospectProp,
  onSuccess,
}: AgendamentoRapidoModalProps) => {
  const { toast } = useToast();
  const { generateInsights } = useIAInsights();
  const { data: prospects = [] } = useProspects();
  const [loading, setLoading] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState<string>('');
  const [formData, setFormData] = useState({
    data_visita: '',
    horario_inicio: '',
    horario_fim: '',
    observacoes: '',
  });

  useEffect(() => {
    if (prospectProp) {
      setSelectedProspectId(prospectProp.id);
    }
  }, [prospectProp]);

  const selectedProspect = prospectProp || prospects.find(p => p.id === selectedProspectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProspect) {
      toast({
        title: 'Erro',
        description: 'Selecione um prospect',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Erro de autenticação',
          description: 'Faça login novamente',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      console.log('🚀 Iniciando agendamento para:', selectedProspect.nome_empresa);

      // 1. Criar visita no banco
      const { error: visitaError } = await supabase
        .from('prospect_visitas')
        .insert({
          prospect_id: selectedProspect.id,
          responsavel_id: user.id,
          data_visita: formData.data_visita,
          horario_inicio: formData.horario_inicio || null,
          horario_fim: formData.horario_fim || null,
          observacoes: formData.observacoes || null,
          status: 'agendada',
        });

      if (visitaError) {
        console.error('❌ Erro ao criar visita:', visitaError);
        throw new Error(`Erro ao criar visita: ${visitaError.message}`);
      }

      console.log('✅ Visita criada com sucesso');

      // 2. Criar evento no calendário do colaborador
      const { error: eventoError } = await supabase
        .from('colaborador_eventos')
        .insert({
          colaborador_id: user.id,
          titulo: `Visita: ${selectedProspect.nome_empresa}`,
          descricao: `Visita agendada ao prospect ${selectedProspect.nome_empresa}${formData.observacoes ? ` - ${formData.observacoes}` : ''}`,
          data: formData.data_visita,
          horario: formData.horario_inicio || null,
          tipo: 'visita',
          concluido: false,
        });

      if (eventoError) {
        console.error('❌ Erro ao criar evento:', eventoError);
        throw new Error(`Erro ao criar evento: ${eventoError.message}`);
      }

      console.log('✅ Evento criado no calendário');

      // Sucesso! Mostrar toast e fechar modal
      toast({
        title: '✅ Visita agendada com sucesso!',
        description: `Visita marcada para ${new Date(formData.data_visita).toLocaleDateString('pt-BR')}`,
      });

      // 3. Tentar gerar insights em background (não bloqueia)
      console.log('🧠 Tentando gerar insights...');
      try {
        await generateInsights({
          prospectId: selectedProspect.id,
          nomeEmpresa: selectedProspect.nome_empresa,
          segmento: selectedProspect.segmento || '',
          cidade: selectedProspect.cidade || '',
        });
        console.log('✅ Insights gerados com sucesso');
      } catch (insightError) {
        console.log('⚠️ Insights não puderam ser gerados (não crítico):', insightError);
        // Não mostra erro ao usuário pois insights são opcionais
      }

      // Resetar formulário e fechar
      setFormData({
        data_visita: '',
        horario_inicio: '',
        horario_fim: '',
        observacoes: '',
      });
      setSelectedProspectId('');
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      console.error('❌ Erro no agendamento:', error);
      toast({
        title: 'Erro ao agendar visita',
        description: error.message || 'Verifique os dados e tente novamente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendar Visita
          </DialogTitle>
          <DialogDescription>
            Agende uma visita e gere insights automaticamente
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!prospectProp && (
            <div>
              <Label>Prospect *</Label>
              <Select value={selectedProspectId} onValueChange={setSelectedProspectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o prospect" />
                </SelectTrigger>
                <SelectContent>
                  {prospects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_empresa} - {p.cidade || 'Sem cidade'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {prospectProp && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{prospectProp.nome_empresa}</p>
              <p className="text-xs text-muted-foreground">{prospectProp.cidade}</p>
            </div>
          )}

          <div>
            <Label>Data *</Label>
            <Input
              type="date"
              value={formData.data_visita}
              onChange={(e) => setFormData({ ...formData, data_visita: e.target.value })}
              required
              min={new Date().toISOString().split('T')[0]}
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
            <Button type="submit" disabled={loading || !selectedProspect}>
              <Calendar className="h-4 w-4 mr-2" />
              {loading ? 'Agendando...' : 'Agendar Visita'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
