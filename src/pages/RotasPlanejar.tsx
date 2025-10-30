import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMapboxRotaOtimizada } from '@/hooks/useMapboxRotaOtimizada';
import { useIAInsights } from '@/hooks/useIAInsights';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Route, 
  Users, 
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  Navigation,
  CheckCircle2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface ProspectSelecionado {
  id: string;
  nome_empresa: string;
  endereco_completo?: string;
  latitude?: number;
  longitude?: number;
  cidade?: string;
  segmento?: string;
}

export default function RotasPlanejar() {
  const [cidadeFiltro, setCidadeFiltro] = useState<string>('');
  const [prospectsSelecionados, setProspectsSelecionados] = useState<ProspectSelecionado[]>([]);
  const [dataRota, setDataRota] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [horarioInicio, setHorarioInicio] = useState<string>('09:00');
  const [duracaoVisita, setDuracaoVisita] = useState<number>(30);
  const [vendedorId, setVendedorId] = useState<string>('');
  
  const { calcularRotaOtimizada, isCalculating } = useMapboxRotaOtimizada();
  const { toast } = useToast();
  const [rotaCalculada, setRotaCalculada] = useState<any>(null);

  // Buscar prospects com endereço
  const { data: prospects, isLoading: loadingProspects } = useQuery({
    queryKey: ['prospects-com-endereco', cidadeFiltro],
    queryFn: async () => {
      let query = supabase
        .from('prospects')
        .select('*')
        .not('endereco_completo', 'is', null)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (cidadeFiltro) {
        query = query.ilike('cidade', `%${cidadeFiltro}%`);
      }

      const { data, error } = await query.order('nome_empresa');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar vendedores (profiles)
  const { data: vendedores } = useQuery({
    queryKey: ['vendedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome')
        .order('nome');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Pegar usuário atual como vendedor padrão
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !vendedorId) {
        setVendedorId(user.id);
      }
    };
    loadUser();
  }, [vendedorId]);

  // Cidades disponíveis
  const cidades = Array.from(new Set(prospects?.map(p => p.cidade).filter(Boolean))) as string[];

  const toggleProspect = (prospect: ProspectSelecionado) => {
    if (prospectsSelecionados.find(p => p.id === prospect.id)) {
      setProspectsSelecionados(prospectsSelecionados.filter(p => p.id !== prospect.id));
    } else {
      setProspectsSelecionados([...prospectsSelecionados, prospect]);
    }
  };

  const handleCalcularRota = async () => {
    if (prospectsSelecionados.length < 2) {
      toast({
        title: 'Selecione ao menos 2 prospects',
        description: 'É necessário pelo menos 2 endereços para calcular uma rota.',
        variant: 'destructive'
      });
      return;
    }

    const waypoints = prospectsSelecionados
      .filter(p => p.latitude && p.longitude)
      .map(p => ({ lat: p.latitude!, lng: p.longitude! }));

    const rota = await calcularRotaOtimizada(waypoints);
    
    if (rota) {
      setRotaCalculada(rota);
      toast({
        title: '✅ Rota calculada!',
        description: `Distância total: ${rota.distancia_total_km}km | Tempo estimado: ${Math.round(rota.tempo_total_min)}min`
      });
    }
  };

  const handleAgendarVisitas = async () => {
    if (!vendedorId || !dataRota || prospectsSelecionados.length === 0) {
      toast({
        title: 'Preencha todos os campos',
        description: 'Selecione vendedor, data e pelo menos um prospect.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const ordem = rotaCalculada?.ordem_otimizada || prospectsSelecionados.map((_, i) => i);
      let horarioAtual = horarioInicio;

      for (let i = 0; i < prospectsSelecionados.length; i++) {
        const prospect = prospectsSelecionados[ordem[i]];
        const [hora, minuto] = horarioAtual.split(':').map(Number);
        const horarioFim = `${String(hora + Math.floor((minuto + duracaoVisita) / 60)).padStart(2, '0')}:${String((minuto + duracaoVisita) % 60).padStart(2, '0')}`;

        // Criar visita
        const { error: visitaError } = await supabase
          .from('prospect_visitas')
          .insert({
            prospect_id: prospect.id,
            responsavel_id: vendedorId,
            data_visita: dataRota,
            horario_inicio: horarioAtual,
            horario_fim: horarioFim,
            status: 'agendada',
            ordem_rota: i + 1,
            distancia_km: rotaCalculada?.segmentos[i]?.distancia_km || 0,
            tempo_trajeto_min: rotaCalculada?.segmentos[i]?.tempo_min || 0,
          });

        if (visitaError) throw visitaError;

        // Criar evento na agenda
        const { error: eventoError } = await supabase
          .from('colaborador_eventos')
          .insert({
            colaborador_id: vendedorId,
            titulo: `Visita: ${prospect.nome_empresa}`,
            descricao: `Rota planejada - ${prospect.cidade}`,
            data: dataRota,
            horario: horarioAtual,
            tipo: 'visita',
            concluido: false,
          });

        if (eventoError) throw eventoError;

        // Calcular próximo horário (fim + tempo de trajeto)
        const tempoTrajeto = rotaCalculada?.segmentos[i]?.tempo_min || 15;
        const minutosTotal = hora * 60 + minuto + duracaoVisita + tempoTrajeto;
        horarioAtual = `${String(Math.floor(minutosTotal / 60)).padStart(2, '0')}:${String(minutosTotal % 60).padStart(2, '0')}`;
      }

      toast({
        title: '🎉 Rota agendada com sucesso!',
        description: `${prospectsSelecionados.length} visitas foram criadas para ${format(new Date(dataRota), 'dd/MM/yyyy')}.`
      });

      // Limpar seleção
      setProspectsSelecionados([]);
      setRotaCalculada(null);

    } catch (error) {
      console.error('Erro ao agendar visitas:', error);
      toast({
        title: 'Erro ao agendar visitas',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Route className="h-8 w-8" />
            Planejar Rotas Inteligentes
          </h1>
          <p className="text-muted-foreground">
            Selecione prospects, calcule a melhor rota e agende visitas automaticamente
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Lista de Prospects */}
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Label>Filtrar por Cidade</Label>
                  <Select value={cidadeFiltro || undefined} onValueChange={(value) => setCidadeFiltro(value || '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as cidades" />
                    </SelectTrigger>
                    <SelectContent>
                      {cidades.map(cidade => (
                        <SelectItem key={cidade} value={cidade}>{cidade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {cidadeFiltro && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCidadeFiltro('')}
                      className="mt-1 text-xs"
                    >
                      Limpar filtro
                    </Button>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Selecionados</Label>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {prospectsSelecionados.length}
                  </Badge>
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              {loadingProspects ? (
                [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)
              ) : prospects && prospects.length > 0 ? (
                prospects.map((prospect) => {
                  const isSelected = !!prospectsSelecionados.find(p => p.id === prospect.id);
                  return (
                    <Card 
                      key={prospect.id}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => toggleProspect(prospect)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox checked={isSelected} />
                        <div className="flex-1">
                          <h4 className="font-semibold">{prospect.nome_empresa}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {prospect.endereco_completo}
                          </p>
                          {prospect.segmento && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {prospect.segmento}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <Card className="p-12 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Nenhum prospect encontrado</h3>
                  <p className="text-sm text-muted-foreground">
                    {cidadeFiltro 
                      ? `Não há prospects com endereço completo em ${cidadeFiltro}.`
                      : 'Não há prospects com endereço cadastrado.'}
                  </p>
                </Card>
              )}
            </div>
          </div>

          {/* Painel de Agendamento */}
          <div className="space-y-4">
            {prospectsSelecionados.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Calcular Rota</h3>
                <Button 
                  className="w-full"
                  onClick={handleCalcularRota}
                  disabled={isCalculating || prospectsSelecionados.length < 2}
                >
                  {isCalculating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Calculando...
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4 mr-2" />
                      Calcular Melhor Rota
                    </>
                  )}
                </Button>

                {rotaCalculada && (
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distância Total:</span>
                      <span className="font-semibold">{rotaCalculada.distancia_total_km} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tempo de Trajeto:</span>
                      <span className="font-semibold">{Math.round(rotaCalculada.tempo_total_min)} min</span>
                    </div>
                  </div>
                )}
              </Card>
            )}

            <Card className="p-4">
              <h3 className="font-semibold mb-4">Agendar Visitas</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="vendedor">
                    <Users className="h-4 w-4 inline mr-2" />
                    Vendedor Responsável
                  </Label>
                  <Select value={vendedorId} onValueChange={setVendedorId}>
                    <SelectTrigger id="vendedor">
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores?.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="data">
                    <CalendarIcon className="h-4 w-4 inline mr-2" />
                    Data da Rota
                  </Label>
                  <Input
                    id="data"
                    type="date"
                    value={dataRota}
                    onChange={(e) => setDataRota(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="horario">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Horário de Início
                  </Label>
                  <Input
                    id="horario"
                    type="time"
                    value={horarioInicio}
                    onChange={(e) => setHorarioInicio(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="duracao">Duração por Visita (minutos)</Label>
                  <Input
                    id="duracao"
                    type="number"
                    min="15"
                    max="180"
                    step="15"
                    value={duracaoVisita}
                    onChange={(e) => setDuracaoVisita(Number(e.target.value))}
                  />
                </div>

                <Button 
                  className="w-full"
                  size="lg"
                  onClick={handleAgendarVisitas}
                  disabled={prospectsSelecionados.length === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Agendar Todas as Visitas
                </Button>
              </div>
            </Card>

            {prospectsSelecionados.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Ordem de Visitas</h3>
                <div className="space-y-2">
                  {(rotaCalculada?.ordem_otimizada || prospectsSelecionados.map((_, i) => i)).map((idx: number, i: number) => {
                    const prospect = prospectsSelecionados[idx];
                    return (
                      <div key={prospect.id} className="flex items-center gap-2 text-sm p-2 bg-secondary/20 rounded">
                        <Badge variant="secondary">{i + 1}</Badge>
                        <span className="flex-1">{prospect.nome_empresa}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}