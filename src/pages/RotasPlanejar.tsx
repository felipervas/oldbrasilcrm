import { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  Lightbulb
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
  const [roteiroIA, setRoteiroIA] = useState<string | null>(null);
  const [loadingRoteiro, setLoadingRoteiro] = useState(false);
  const [enderecoManual, setEnderecoManual] = useState('');
  const [nomeEnderecoManual, setNomeEnderecoManual] = useState('');
  const [adicionandoEndereco, setAdicionandoEndereco] = useState(false);
  
  const { calcularRotaOtimizada, geocodeEndereco, isCalculating } = useMapboxRotaOtimizada();
  const { generateRoteiro } = useIAInsights();
  const { toast } = useToast();
  const [rotaCalculada, setRotaCalculada] = useState<any>(null);

  // Buscar prospects com endereço
  const { data: prospects, isLoading: loadingProspects } = useQuery({
    queryKey: ['prospects-com-endereco'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prospects')
        .select('id, nome_empresa, endereco_completo, latitude, longitude, cidade, segmento')
        .not('endereco_completo', 'is', null)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('nome_empresa')
        .limit(200);
      
      if (error) throw error;
      return (data || []).map(p => ({ ...p, tipo: 'prospect' as const, nome: p.nome_empresa }));
    },
    staleTime: 60000,
  });

  // Buscar clientes com endereço
  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes-com-endereco'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome_fantasia, logradouro, numero, cidade, uf, cep')
        .not('logradouro', 'is', null)
        .not('cidade', 'is', null)
        .eq('ativo', true)
        .order('nome_fantasia')
        .limit(200);
      
      if (error) throw error;
      return (data || []).map(c => {
        const endereco = [
          c.logradouro,
          c.numero,
          c.cidade,
          c.uf,
          c.cep
        ].filter(Boolean).join(', ');
        
        return {
          id: c.id,
          tipo: 'cliente' as const,
          nome: c.nome_fantasia,
          nome_empresa: c.nome_fantasia,
          endereco_completo: endereco,
          cidade: c.cidade,
          segmento: undefined,
          latitude: undefined,
          longitude: undefined
        };
      });
    },
    staleTime: 60000,
  });

  // Buscar vendedores (profiles)
  const { data: vendedores } = useQuery({
    queryKey: ['vendedores'],
    staleTime: 300000, // Cache por 5 minutos
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

  // Combinar e filtrar entidades (prospects + clientes)
  const entidadesCombinadas = useMemo(() => {
    const todasEntidades = [...(prospects || []), ...(clientes || [])];
    if (cidadeFiltro) {
      return todasEntidades.filter(e => e.cidade === cidadeFiltro);
    }
    return todasEntidades;
  }, [prospects, clientes, cidadeFiltro]);

  // Cidades disponíveis (união de prospects e clientes)
  const cidades = useMemo(() => {
    const cidadesSet = new Set<string>();
    prospects?.forEach(p => p.cidade && cidadesSet.add(p.cidade));
    clientes?.forEach(c => c.cidade && cidadesSet.add(c.cidade));
    return Array.from(cidadesSet).sort();
  }, [prospects, clientes]);

  const toggleProspect = (prospect: ProspectSelecionado) => {
    if (prospectsSelecionados.find(p => p.id === prospect.id)) {
      setProspectsSelecionados(prospectsSelecionados.filter(p => p.id !== prospect.id));
    } else {
      setProspectsSelecionados([...prospectsSelecionados, prospect]);
    }
  };

  const handleAdicionarEnderecoManual = async () => {
    if (!enderecoManual.trim() || !nomeEnderecoManual.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome e endereço',
        variant: 'destructive'
      });
      return;
    }

    setAdicionandoEndereco(true);
    try {
      // Geocodificar o endereço
      const coords = await geocodeEndereco(enderecoManual);
      
      if (!coords) {
        toast({
          title: 'Endereço não encontrado',
          description: 'Não foi possível localizar este endereço. Tente ser mais específico.',
          variant: 'destructive'
        });
        return;
      }

      // Adicionar à lista de selecionados
      const novoLocal: ProspectSelecionado = {
        id: `manual-${Date.now()}`,
        nome_empresa: nomeEnderecoManual,
        endereco_completo: enderecoManual,
        latitude: coords.lat,
        longitude: coords.lng,
        cidade: '',
        segmento: 'Manual'
      };

      setProspectsSelecionados([...prospectsSelecionados, novoLocal]);
      setEnderecoManual('');
      setNomeEnderecoManual('');
      
      toast({
        title: '✅ Endereço adicionado!',
        description: `${nomeEnderecoManual} foi adicionado à rota`
      });
    } catch (error) {
      console.error('Erro ao geocodificar:', error);
      toast({
        title: 'Erro ao adicionar endereço',
        description: 'Tente novamente com um endereço mais específico',
        variant: 'destructive'
      });
    } finally {
      setAdicionandoEndereco(false);
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

        // Se for um endereço manual, não criar visita em prospect_visitas
        const isEnderecoManual = prospect.id.startsWith('manual-');
        
        if (!isEnderecoManual) {
          // Criar visita apenas para prospects/clientes reais
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
        }

        // Criar evento na agenda para todos (prospects e endereços manuais)
        const { error: eventoError } = await supabase
          .from('colaborador_eventos')
          .insert({
            colaborador_id: vendedorId,
            titulo: `${isEnderecoManual ? 'Parada' : 'Visita'}: ${prospect.nome_empresa}`,
            descricao: `Rota planejada - ${prospect.endereco_completo || prospect.cidade}`,
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
      setRoteiroIA(null);

    } catch (error) {
      console.error('Erro ao agendar visitas:', error);
      toast({
        title: 'Erro ao agendar visitas',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  };

  const handleGerarRoteiro = async () => {
    if (prospectsSelecionados.length === 0) {
      toast({
        title: 'Selecione prospects',
        description: 'Adicione prospects à rota antes de gerar o roteiro.',
        variant: 'destructive'
      });
      return;
    }

    setLoadingRoteiro(true);
    try {
      const visitas = prospectsSelecionados.map(p => ({
        nome_empresa: p.nome_empresa,
        endereco: p.endereco_completo,
        cidade: p.cidade,
        segmento: p.segmento
      }));

      const result = await generateRoteiro.mutateAsync({ visitas, dataRota });
      setRoteiroIA(result.roteiro);
      
      toast({
        title: '✨ Roteiro gerado!',
        description: 'IA criou um roteiro otimizado para você.'
      });
    } catch (error) {
      console.error('Erro ao gerar roteiro:', error);
      toast({
        title: 'Erro ao gerar roteiro',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive'
      });
    } finally {
      setLoadingRoteiro(false);
    }
  };

  return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Route className="h-8 w-8" />
            Planejar Rotas Inteligentes
          </h1>
          <p className="text-muted-foreground">
            Selecione prospects, clientes ou adicione endereços manualmente para criar rotas otimizadas
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Lista de Prospects */}
          <div className="space-y-4">
            <Card className="p-4">
              <div className="space-y-4">
                <div>
                  <Label>Filtrar por Cidade</Label>
                  <Select value={cidadeFiltro || "todas"} onValueChange={(val) => setCidadeFiltro(val === "todas" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as cidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as cidades</SelectItem>
                      {cidades.map(cidade => (
                        <SelectItem key={cidade} value={cidade}>
                          {cidade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">Adicionar Endereço Manual</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Digite um endereço para adicionar à rota
                  </p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Nome do local (ex: Padaria Central)"
                      value={nomeEnderecoManual}
                      onChange={(e) => setNomeEnderecoManual(e.target.value)}
                    />
                    <Input
                      placeholder="Endereço completo (Rua, Número, Cidade, Estado)"
                      value={enderecoManual}
                      onChange={(e) => setEnderecoManual(e.target.value)}
                    />
                    <Button
                      onClick={handleAdicionarEnderecoManual}
                      disabled={adicionandoEndereco}
                      className="w-full"
                      size="sm"
                    >
                      {adicionandoEndereco ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Localizando...
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 mr-2" />
                          Adicionar à Rota
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t pt-4">
                  <Label className="text-muted-foreground">Selecionados</Label>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {prospectsSelecionados.length}
                  </Badge>
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              {prospectsSelecionados.length > 0 && (
                <Card className="p-4 bg-primary/5">
                  <h4 className="font-semibold mb-3 text-sm">Locais Selecionados:</h4>
                  <div className="space-y-2">
                    {prospectsSelecionados.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm bg-background p-2 rounded">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="truncate">{p.nome_empresa}</span>
                          {p.segmento === 'Manual' && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">Manual</Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleProspect(p)}
                          className="h-6 w-6 p-0 flex-shrink-0"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {loadingProspects || loadingClientes ? (
                [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)
              ) : entidadesCombinadas && entidadesCombinadas.length > 0 ? (
                entidadesCombinadas.map((entidade) => {
                  const isSelected = !!prospectsSelecionados.find(p => p.id === entidade.id);
                  return (
                    <Card 
                      key={`${entidade.tipo}-${entidade.id}`}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => toggleProspect(entidade)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox checked={isSelected} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{entidade.nome}</h4>
                            <Badge variant={entidade.tipo === 'prospect' ? 'secondary' : 'default'} className="text-xs">
                              {entidade.tipo === 'prospect' ? 'Prospect' : 'Cliente'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {entidade.endereco_completo}
                          </p>
                          {entidade.segmento && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {entidade.segmento}
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
                  <h3 className="font-semibold mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-sm text-muted-foreground">
                    {cidadeFiltro 
                      ? `Não há prospects ou clientes com endereço completo em ${cidadeFiltro}.`
                      : 'Não há prospects ou clientes com endereço cadastrado.'}
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

                <Button 
                  className="w-full"
                  variant="outline"
                  size="lg"
                  onClick={handleGerarRoteiro}
                  disabled={prospectsSelecionados.length === 0 || loadingRoteiro}
                >
                  {loadingRoteiro ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando Roteiro...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Gerar Roteiro Inteligente
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {roteiroIA && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">📋 Roteiro Gerado pela IA</h3>
                <div className="prose prose-sm max-w-none text-sm">
                  <pre className="whitespace-pre-wrap text-xs bg-muted p-3 rounded">{roteiroIA}</pre>
                </div>
              </Card>
            )}

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
  );
}