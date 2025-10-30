import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Sparkles, Building2, Users } from 'lucide-react';
import { Prospect, useProspects } from '@/hooks/useProspects';
import { useClientes } from '@/hooks/useClientes';
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
  const { data: clientesData } = useClientes();
  const clientes = clientesData?.data || [];
  const [loading, setLoading] = useState(false);
  const [tipoVisita, setTipoVisita] = useState<'prospect' | 'cliente'>('prospect');
  const [selectedProspectId, setSelectedProspectId] = useState<string>('');
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [formData, setFormData] = useState({
    data_visita: '',
    horario_inicio: '',
    horario_fim: '',
    observacoes: '',
  });

  useEffect(() => {
    if (prospectProp) {
      setSelectedProspectId(prospectProp.id);
      setTipoVisita('prospect');
    }
  }, [prospectProp]);

  const selectedProspect = prospectProp || prospects.find(p => p.id === selectedProspectId);
  const selectedCliente = clientes.find(c => c.id === selectedClienteId);
  const entidadeSelecionada = tipoVisita === 'prospect' ? selectedProspect : selectedCliente;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entidadeSelecionada) {
      toast({
        title: 'Erro',
        description: `Selecione ${tipoVisita === 'prospect' ? 'um prospect' : 'um cliente'}`,
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

      const nomeEntidade = tipoVisita === 'prospect' 
        ? (selectedProspect as any).nome_empresa 
        : (selectedCliente as any).nome_fantasia;

      console.log('🚀 Iniciando agendamento para:', nomeEntidade);

      // 1. Criar visita no banco (apenas se for prospect)
      if (tipoVisita === 'prospect' && selectedProspect) {
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
      }

      // 2. Criar evento no calendário do colaborador
      const { error: eventoError } = await supabase
        .from('colaborador_eventos')
        .insert({
          colaborador_id: user.id,
          titulo: `Visita: ${nomeEntidade}`,
          descricao: `Visita agendada ${tipoVisita === 'prospect' ? 'ao prospect' : 'ao cliente'} ${nomeEntidade}${formData.observacoes ? ` - ${formData.observacoes}` : ''}`,
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

      // 3. Tentar gerar insights em background apenas para prospects (não bloqueia)
      if (tipoVisita === 'prospect' && selectedProspect) {
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
      }

      // Resetar formulário e fechar
      setFormData({
        data_visita: '',
        horario_inicio: '',
        horario_fim: '',
        observacoes: '',
      });
      setSelectedProspectId('');
      setSelectedClienteId('');
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
            <Tabs value={tipoVisita} onValueChange={(v) => setTipoVisita(v as 'prospect' | 'cliente')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="prospect" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Prospects
                </TabsTrigger>
                <TabsTrigger value="cliente" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Clientes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="prospect" className="mt-4">
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
              </TabsContent>
              
              <TabsContent value="cliente" className="mt-4">
                <Label>Cliente *</Label>
                <Select value={selectedClienteId} onValueChange={setSelectedClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_fantasia} - {c.cidade || 'Sem cidade'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
            </Tabs>
          )}
          
          {prospectProp && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Prospect</span>
              </div>
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
            <Button type="submit" disabled={loading || !entidadeSelecionada}>
              <Calendar className="h-4 w-4 mr-2" />
              {loading ? 'Agendando...' : 'Agendar Visita'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
