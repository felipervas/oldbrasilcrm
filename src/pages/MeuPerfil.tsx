import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useColaboradorEventos } from "@/hooks/useColaboradorEventos";
import { useHistoricoEquipe } from "@/hooks/useHistoricoEquipe";
import { AgendasEquipe } from "@/components/AgendasEquipe";
import { useDebounce } from "@/hooks/useDebounce";
import { Checkbox } from "@/components/ui/checkbox";
import { useRelatorioDiario, EventoDia } from '@/hooks/useRelatorioDiario';
import { useMapboxRotaOtimizada } from '@/hooks/useMapboxRotaOtimizada';
import { useIAInsights } from '@/hooks/useIAInsights';
import { AgendamentoRapidoModal } from '@/components/prospects/AgendamentoRapidoModal';
import { Users, CheckCircle2, Clock, AlertCircle, Calendar, Phone, Mail, MapPin, Plus, Edit, Trash, History, Trophy, List, CalendarDays, Lightbulb, Package, Navigation, ExternalLink, Route, Loader2 } from "lucide-react";
import { EventoVisitaCard } from '@/components/relatorio/EventoVisitaCard';
import { EventoTarefaCard } from '@/components/relatorio/EventoTarefaCard';
import { EventoGeralCard } from '@/components/relatorio/EventoGeralCard';
import { format, isSameDay } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';

const MeuPerfil = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMeuDia, setSearchMeuDia] = useState('');
  const [dialogMultiplosOpen, setDialogMultiplosOpen] = useState(false);
  const [eventosTexto, setEventosTexto] = useState('');
  const [comentarioEvento, setComentarioEvento] = useState<{[key: string]: string}>({});
  const [agendamentoModalOpen, setAgendamentoModalOpen] = useState(false);
  const [formEvento, setFormEvento] = useState({
    titulo: '',
    descricao: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    horario: '',
    tipo: 'evento'
  });

  // Estados para Planejar Rotas
  const [cidadeFiltro, setCidadeFiltro] = useState<string>('');
  const [prospectsSelecionados, setProspectsSelecionados] = useState<any[]>([]);
  const [dataRota, setDataRota] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [horarioInicio, setHorarioInicio] = useState<string>('09:00');
  const [duracaoVisita, setDuracaoVisita] = useState<number>(30);
  const [vendedorId, setVendedorId] = useState<string>('');
  const [rotaCalculada, setRotaCalculada] = useState<any>(null);

  const { eventos, createEvento, updateEvento, deleteEvento, toggleConcluido, createMultipleEventos } = useColaboradorEventos();
  const { data: historico } = useHistoricoEquipe();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { data: eventosRelatorioDiario, isLoading: loadingRelatorioDiario } = useRelatorioDiario(selectedDate || new Date());
  const { calcularRotaOtimizada, isCalculating } = useMapboxRotaOtimizada();
  const { generateRoteiro } = useIAInsights();
  const [gerandoRoteiro, setGerandoRoteiro] = useState(false);
  const [roteiroMeuDia, setRoteiroMeuDia] = useState<string | null>(null);

  // Buscar prospects com endereço para Planejar Rotas
  const { data: prospects, isLoading: loadingProspects } = useQuery({
    queryKey: ['prospects-com-endereco', cidadeFiltro],
    staleTime: 60000, // Cache por 1 minuto
    queryFn: async () => {
      let query = supabase
        .from('prospects')
        .select('id, nome_empresa, endereco_completo, latitude, longitude, cidade, segmento')
        .not('endereco_completo', 'is', null)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (cidadeFiltro && cidadeFiltro.trim()) {
        query = query.ilike('cidade', `%${cidadeFiltro.trim()}%`);
      }

      const { data, error } = await query
        .order('cidade')
        .order('nome_empresa')
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar vendedores para Planejar Rotas
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

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !vendedorId) {
        setVendedorId(user.id);
      }
    };
    loadUser();
  }, [vendedorId]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Não autenticado",
          description: "Faça login para acessar seu perfil",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      const { data: clientesData } = await supabase
        .from("clientes")
        .select("*")
        .eq("responsavel_id", user.id)
        .order("nome_fantasia");

      setClientes(clientesData || []);

      const { data: tarefasData } = await supabase
        .from("tarefas")
        .select("*, clientes(nome_fantasia)")
        .eq("responsavel_id", user.id)
        .order("data_prevista", { ascending: false });

      setTarefas(tarefasData || []);

    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      toast({
        title: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; icon: any; label: string }> = {
      pendente: { variant: "outline", icon: Clock, label: "Pendente" },
      em_andamento: { variant: "default", icon: AlertCircle, label: "Em Andamento" },
      concluida: { variant: "default", icon: CheckCircle2, label: "Concluída" },
    };
    const config = badges[status] || badges.pendente;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const colors: Record<string, string> = {
      alta: "bg-red-100 text-red-800 border-red-300",
      media: "bg-yellow-100 text-yellow-800 border-yellow-300",
      baixa: "bg-green-100 text-green-800 border-green-300",
    };
    return (
      <Badge variant="outline" className={colors[prioridade] || ""}>
        {prioridade?.toUpperCase()}
      </Badge>
    );
  };

  const tarefasPendentes = tarefas.filter(t => t.status === "pendente" || t.status === "em_andamento");
  const tarefasConcluidas = tarefas.filter(t => t.status === "concluida");

  const clientesFiltrados = useMemo(() => {
    return clientes.filter(cliente => 
      cliente.nome_fantasia?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      cliente.cnpj_cpf?.includes(debouncedSearchTerm) ||
      cliente.cidade?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [clientes, debouncedSearchTerm]);

  const handleSaveEvento = async () => {
    try {
      if (eventoEditando) {
        await updateEvento.mutateAsync({ id: eventoEditando.id, ...formEvento });
      } else {
        await createEvento.mutateAsync(formEvento);
      }
      setDialogOpen(false);
      setEventoEditando(null);
      setFormEvento({
        titulo: '',
        descricao: '',
        data: format(new Date(), 'yyyy-MM-dd'),
        horario: '',
        tipo: 'evento'
      });
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
    }
  };

  const handleEditEvento = (evento: any) => {
    setEventoEditando(evento);
    setFormEvento({
      titulo: evento.titulo,
      descricao: evento.descricao || '',
      data: evento.data,
      horario: evento.horario || '',
      tipo: evento.tipo
    });
    setDialogOpen(true);
  };

  const handleDeleteEvento = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este evento?')) {
      await deleteEvento.mutateAsync(id);
    }
  };

  const eventosDoMes = useMemo(() => {
    return eventos?.filter(e => {
      if (!selectedDate) return false;
      const eventoDate = new Date(e.data);
      return eventoDate.getMonth() === selectedDate.getMonth() &&
             eventoDate.getFullYear() === selectedDate.getFullYear();
    }) || [];
  }, [eventos, selectedDate]);

  const eventosPendentes = useMemo(() => {
    return eventosDoMes.filter(e => !e.concluido);
  }, [eventosDoMes]);

  const eventosConcluidos = useMemo(() => {
    return eventosDoMes.filter(e => e.concluido);
  }, [eventosDoMes]);

  const handleCriarMultiplosEventos = async () => {
    const linhas = eventosTexto.split('\n').filter(l => l.trim());
    if (linhas.length === 0) {
      toast({ title: 'Digite ao menos um evento', variant: 'destructive' });
      return;
    }

    await createMultipleEventos.mutateAsync({
      titulos: linhas,
      data: format(selectedDate || new Date(), 'yyyy-MM-dd'),
      tipo: 'evento'
    });

    setEventosTexto('');
    setDialogMultiplosOpen(false);
  };

  const handleToggleConcluido = async (evento: any) => {
    await toggleConcluido.mutateAsync({
      id: evento.id,
      concluido: !evento.concluido,
      comentario: comentarioEvento[evento.id] || evento.comentario
    });
  };

  const getAcaoLabel = (acao: string) => {
    const labels: Record<string, string> = {
      criar_tarefa: 'Criou tarefa',
      atualizar_tarefa: 'Atualizou tarefa',
      concluir_tarefa: 'Concluiu tarefa',
      criar_pedido: 'Criou pedido',
      editar_pedido: 'Editou pedido',
      criar_cliente: 'Criou cliente',
      editar_cliente: 'Editou cliente',
    };
    return labels[acao] || acao;
  };

  // Funções para Planejar Rotas
  const cidades = Array.from(new Set(prospects?.map(p => p.cidade).filter(Boolean))) as string[];

  const toggleProspect = (prospect: any) => {
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

        const tempoTrajeto = rotaCalculada?.segmentos[i]?.tempo_min || 15;
        const minutosTotal = hora * 60 + minuto + duracaoVisita + tempoTrajeto;
        horarioAtual = `${String(Math.floor(minutosTotal / 60)).padStart(2, '0')}:${String(minutosTotal % 60).padStart(2, '0')}`;
      }

      toast({
        title: '🎉 Rota agendada com sucesso!',
        description: `${prospectsSelecionados.length} visitas foram criadas.`
      });

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

  // Gerar roteiro do meu dia
  const handleGerarRoteiroMeuDia = async () => {
    if (!eventosRelatorioDiario || eventosRelatorioDiario.length === 0) {
      toast({
        title: 'Nenhum evento encontrado',
        description: 'Não há eventos para gerar um roteiro.',
        variant: 'destructive'
      });
      return;
    }

    setGerandoRoteiro(true);
    try {
      const visitas = eventosRelatorioDiario
        .filter(e => (e.tipo === 'visita' && e.prospect) || e.endereco_completo)
        .map(e => ({
          nome_empresa: e.prospect?.nome_empresa || e.titulo,
          endereco: e.prospect?.endereco_completo || e.endereco_completo || '',
          cidade: e.prospect?.cidade || '',
          segmento: e.prospect?.segmento || ''
        }));

      if (visitas.length === 0) {
        toast({
          title: 'Nenhuma visita com endereço',
          description: 'Não há eventos com endereço para gerar roteiro.',
          variant: 'destructive'
        });
        return;
      }

      const dataFormatada = format(selectedDate || new Date(), 'yyyy-MM-dd');
      const result = await generateRoteiro.mutateAsync({ visitas, dataRota: dataFormatada });
      setRoteiroMeuDia(result.roteiro);
      
      toast({
        title: '✨ Roteiro gerado!',
        description: 'IA criou um roteiro otimizado do seu dia.'
      });
    } catch (error) {
      console.error('Erro ao gerar roteiro:', error);
      toast({
        title: 'Erro ao gerar roteiro',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive'
      });
    } finally {
      setGerandoRoteiro(false);
    }
  };

  // Renderizar evento do Meu Dia
  const renderEvento = (evento: EventoDia) => {
    if (evento.tipo === 'visita' && evento.prospect) {
      return <EventoVisitaCard key={evento.id} evento={evento} />;
    }

    if (evento.tipo === 'tarefa' && evento.tarefa) {
      const isHoje = selectedDate ? isSameDay(selectedDate, new Date()) : false;
      return <EventoTarefaCard key={evento.id} evento={evento} isHoje={isHoje} />;
    }

    return <EventoGeralCard key={evento.id} evento={evento} />;
  };

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

  const isHoje = selectedDate ? isSameDay(selectedDate, new Date()) : false;

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <p className="text-muted-foreground">Carregando seu perfil...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Meu Perfil
          </h1>
          <p className="text-muted-foreground">
            {profile?.nome || "Usuário"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            const element = document.getElementById('clientes-tab');
            element?.click();
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientes.length}</div>
            <p className="text-xs text-muted-foreground">
              Clientes sob sua responsabilidade
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            const element = document.getElementById('tarefas-tab');
            element?.click();
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tarefasPendentes.length}</div>
            <p className="text-xs text-muted-foreground">
              Tarefas aguardando conclusão
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            const element = document.getElementById('tarefas-tab');
            element?.click();
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tarefasConcluidas.length}</div>
            <p className="text-xs text-muted-foreground">
              Total de tarefas finalizadas
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="meudia" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="meudia" id="meudia-tab">Meu Dia</TabsTrigger>
          <TabsTrigger value="clientes" id="clientes-tab">Meus Clientes</TabsTrigger>
          <TabsTrigger value="tarefas" id="tarefas-tab">Minhas Tarefas</TabsTrigger>
          <TabsTrigger value="calendario" id="calendario-tab">Calendário</TabsTrigger>
          <TabsTrigger value="agendas" id="agendas-tab">Agendas da Equipe</TabsTrigger>
          <TabsTrigger value="historico" id="historico-tab">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="meudia" className="space-y-6">
          <div className="grid md:grid-cols-[300px_1fr] gap-6">
            <div className="space-y-4">
              <Card className="p-4">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  className="rounded-md"
                />
              </Card>
              
              {eventosRelatorioDiario && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Resumo do Dia</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Visitas:</span>
                      <span className="font-medium">
                        {eventosRelatorioDiario.filter(e => e.tipo === 'visita').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tarefas:</span>
                      <span className="font-medium">
                        {eventosRelatorioDiario.filter(e => e.tipo === 'tarefa').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eventos:</span>
                      <span className="font-medium">
                        {eventosRelatorioDiario.filter(e => e.tipo === 'evento').length}
                      </span>
                    </div>
                  </div>
                </Card>
              )}
            </div>

              <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="w-full sm:w-auto">
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <CalendarDays className="h-5 w-6" />
                    <span className="hidden sm:inline">{selectedDate && format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                    <span className="sm:hidden">{selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                  </h2>
                  {isHoje && (
                    <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                      Aqui está o seu relatório de hoje. Organize suas atividades e tenha um ótimo dia! 🚀
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => setAgendamentoModalOpen(true)}
                    size="sm"
                    variant="outline"
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Agendar Visita</span>
                    <span className="sm:hidden">Visita</span>
                  </Button>
                  <Button
                    onClick={handleGerarRoteiroMeuDia}
                    size="sm"
                    variant="outline"
                    className="gap-2 flex-1 sm:flex-none"
                    disabled={gerandoRoteiro}
                  >
                    {gerandoRoteiro ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-4 w-4" />
                        <span className="hidden sm:inline">Gerar Roteiro IA</span>
                        <span className="sm:hidden">IA</span>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setAgendamentoModalOpen(true)}
                    size="sm"
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Agendar Visita</span>
                    <span className="sm:hidden">Visita</span>
                  </Button>
                </div>
              </div>

              {roteiroMeuDia && (
                <Card className="p-6 bg-gradient-to-br from-primary/5 to-background">
                  <div className="flex items-start gap-3 mb-4">
                    <Lightbulb className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl font-bold mb-2">Roteiro Inteligente do Dia</h3>
                      <p className="text-sm text-muted-foreground">
                        Gerado por IA baseado nas suas atividades do dia
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRoteiroMeuDia(null)}
                      className="ml-auto"
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-sm">{roteiroMeuDia}</div>
                  </div>
                </Card>
              )}

              <Input
                placeholder="🔍 Buscar no seu dia (cliente, tarefa, evento)..."
                value={searchMeuDia}
                onChange={(e) => setSearchMeuDia(e.target.value)}
                className="mb-4"
              />

              {loadingRelatorioDiario ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : eventosRelatorioDiario && eventosRelatorioDiario.length > 0 ? (
                <div className="space-y-6">
                  {(() => {
                    const eventosFiltrados = searchMeuDia 
                      ? eventosRelatorioDiario.filter(e => 
                          e.titulo?.toLowerCase().includes(searchMeuDia.toLowerCase()) ||
                          e.prospect?.nome_empresa?.toLowerCase().includes(searchMeuDia.toLowerCase())
                        )
                      : eventosRelatorioDiario;

                    const { manha, tarde, noite, semHorario } = agruparEventosPorPeriodo(eventosFiltrados);

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
                </Card>
              )}

              <Separator className="my-8" />

              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
                  <Route className="h-6 w-6" />
                  Planejar Rotas
                </h2>
                <p className="text-muted-foreground mb-6">
                  Selecione prospects e crie visitas otimizadas
                </p>

                <div className="grid lg:grid-cols-[1fr_350px] gap-6">
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
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Selecionados</Label>
                          <Badge variant="secondary" className="text-lg px-4 py-2">
                            {prospectsSelecionados.length}
                          </Badge>
                        </div>
                      </div>
                    </Card>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {loadingProspects ? (
                        [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)
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
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      ) : (
                        <Card className="p-8 text-center">
                          <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Nenhum prospect com endereço</p>
                        </Card>
                      )}
                    </div>
                  </div>

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
                              Calcular Rota
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
                          <Label htmlFor="vendedor">Vendedor</Label>
                          <Select value={vendedorId} onValueChange={setVendedorId}>
                            <SelectTrigger id="vendedor">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendedores?.map(v => (
                                <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="data">Data</Label>
                          <Input
                            id="data"
                            type="date"
                            value={dataRota}
                            onChange={(e) => setDataRota(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="horario">Horário Início</Label>
                          <Input
                            id="horario"
                            type="time"
                            value={horarioInicio}
                            onChange={(e) => setHorarioInicio(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="duracao">Duração (min)</Label>
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
                          Agendar Visitas
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clientes Sob Minha Responsabilidade</CardTitle>
              <CardDescription>
                {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'} ativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Buscar por nome, CNPJ ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </div>
              {clientesFiltrados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{searchTerm ? 'Nenhum cliente encontrado com esse termo' : 'Você ainda não tem clientes atribuídos'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientesFiltrados.map((cliente) => (
                    <div
                      key={cliente.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate("/clientes")}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">{cliente.nome_fantasia}</h3>
                          {cliente.razao_social && (
                            <p className="text-sm text-muted-foreground">{cliente.razao_social}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                            {cliente.telefone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {cliente.telefone}
                              </div>
                            )}
                            {cliente.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {cliente.email}
                              </div>
                            )}
                            {cliente.cidade && cliente.uf && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {cliente.cidade}/{cliente.uf}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={cliente.ativo ? "default" : "secondary"}>
                          {cliente.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tarefas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tarefas Pendentes</CardTitle>
              <CardDescription>
                {tarefasPendentes.length} {tarefasPendentes.length === 1 ? 'tarefa' : 'tarefas'} em aberto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tarefasPendentes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma tarefa pendente!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tarefasPendentes.map((tarefa) => (
                    <div
                      key={tarefa.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate("/tarefas")}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{tarefa.titulo}</h3>
                        <div className="flex gap-2">
                          {getPrioridadeBadge(tarefa.prioridade)}
                          {getStatusBadge(tarefa.status)}
                        </div>
                      </div>
                      {tarefa.descricao && (
                        <p className="text-sm text-muted-foreground mb-2">{tarefa.descricao}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {tarefa.data_prevista && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(tarefa.data_prevista).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        {tarefa.clientes && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {tarefa.clientes.nome_fantasia}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tarefas Concluídas</CardTitle>
              <CardDescription>
                {tarefasConcluidas.length} {tarefasConcluidas.length === 1 ? 'tarefa concluída' : 'tarefas concluídas'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tarefasConcluidas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma tarefa concluída ainda</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tarefasConcluidas.map((tarefa) => (
                    <div
                      key={tarefa.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer opacity-75"
                      onClick={() => navigate("/tarefas")}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{tarefa.titulo}</h3>
                        {getStatusBadge(tarefa.status)}
                      </div>
                      {tarefa.descricao && (
                        <p className="text-sm text-muted-foreground mb-2">{tarefa.descricao}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {tarefa.data_conclusao && (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Concluída em {new Date(tarefa.data_conclusao).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        {tarefa.clientes && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {tarefa.clientes.nome_fantasia}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendario" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Meus Compromissos</CardTitle>
                  <CardDescription>Gerencie seus eventos e compromissos</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={dialogMultiplosOpen} onOpenChange={setDialogMultiplosOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <List className="mr-2 h-4 w-4" />
                        Criar Vários
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Múltiplos Eventos</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Lista de Eventos (um por linha)</Label>
                          <Textarea
                            value={eventosTexto}
                            onChange={(e) => setEventosTexto(e.target.value)}
                            placeholder="Calabria&#10;City Pops&#10;Tony"
                            rows={8}
                            className="font-mono"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Digite cada evento em uma linha. Data: {format(selectedDate || new Date(), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <Button onClick={handleCriarMultiplosEventos} className="w-full" disabled={createMultipleEventos.isPending}>
                          {createMultipleEventos.isPending ? 'Criando...' : 'Criar Eventos'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEventoEditando(null);
                        setFormEvento({
                          titulo: '',
                          descricao: '',
                          data: format(new Date(), 'yyyy-MM-dd'),
                          horario: '',
                          tipo: 'evento'
                        });
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Evento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{eventoEditando ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="titulo">Título *</Label>
                          <Input
                            id="titulo"
                            value={formEvento.titulo}
                            onChange={(e) => setFormEvento({...formEvento, titulo: e.target.value})}
                            placeholder="Ex: Reunião com cliente"
                          />
                        </div>
                        <div>
                          <Label htmlFor="descricao">Descrição</Label>
                          <Textarea
                            id="descricao"
                            value={formEvento.descricao}
                            onChange={(e) => setFormEvento({...formEvento, descricao: e.target.value})}
                            placeholder="Detalhes do evento"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="data">Data *</Label>
                            <Input
                              id="data"
                              type="date"
                              value={formEvento.data}
                              onChange={(e) => setFormEvento({...formEvento, data: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="horario">Horário</Label>
                            <Input
                              id="horario"
                              type="time"
                              value={formEvento.horario}
                              onChange={(e) => setFormEvento({...formEvento, horario: e.target.value})}
                            />
                          </div>
                        </div>
                        <Button onClick={handleSaveEvento} className="w-full">
                          {eventoEditando ? 'Atualizar' : 'Criar'} Evento
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-[300px_1fr] gap-6">
                <div>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ptBR}
                    className="rounded-md border"
                  />
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total do mês:</span>
                      <Badge variant="secondary">{eventosDoMes.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pendentes:</span>
                      <Badge variant="outline">{eventosPendentes.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Concluídos:</span>
                      <Badge variant="default">{eventosConcluidos.length}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">Eventos Pendentes</h3>
                    {eventosPendentes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum evento pendente neste mês</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {eventosPendentes.map((evento) => (
                          <div key={evento.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold">{evento.titulo}</h4>
                                {evento.descricao && (
                                  <p className="text-sm text-muted-foreground mt-1">{evento.descricao}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(evento.data), 'dd/MM/yyyy')}
                                  </div>
                                  {evento.horario && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {evento.horario}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEditEvento(evento)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteEvento(evento.id)}>
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <Checkbox
                                checked={evento.concluido}
                                onCheckedChange={() => handleToggleConcluido(evento)}
                              />
                              <Label className="text-sm cursor-pointer">Marcar como concluído</Label>
                            </div>
                            {!evento.concluido && (
                              <div className="mt-2">
                                <Textarea
                                  placeholder="Adicionar comentário (opcional)"
                                  value={comentarioEvento[evento.id] || ''}
                                  onChange={(e) => setComentarioEvento({...comentarioEvento, [evento.id]: e.target.value})}
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {eventosConcluidos.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Eventos Concluídos</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {eventosConcluidos.map((evento) => (
                          <div key={evento.id} className="border rounded-lg p-3 opacity-60">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                                <div>
                                  <h4 className="font-semibold text-sm">{evento.titulo}</h4>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>{format(new Date(evento.data), 'dd/MM/yyyy')}</span>
                                    {evento.horario && <span>• {evento.horario}</span>}
                                  </div>
                                  {evento.comentario && (
                                    <p className="text-xs text-muted-foreground mt-2 italic">"{evento.comentario}"</p>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteEvento(evento.id)}>
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agendas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agendas da Equipe</CardTitle>
              <CardDescription>Visualize os compromissos dos colaboradores</CardDescription>
            </CardHeader>
            <CardContent>
              <AgendasEquipe />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Atividades
              </CardTitle>
              <CardDescription>Últimas 50 atividades da equipe</CardDescription>
            </CardHeader>
            <CardContent>
              {!historico || historico.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma atividade registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{getAcaoLabel(item.acao)}</Badge>
                            <span className="text-sm text-muted-foreground">
                              por {item.profiles?.nome || 'Desconhecido'}
                            </span>
                          </div>
                          {item.detalhes && (
                            <p className="text-sm text-muted-foreground">{item.detalhes}</p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Agendamento Rápido */}
      <AgendamentoRapidoModal
        open={agendamentoModalOpen}
        onOpenChange={setAgendamentoModalOpen}
        onSuccess={() => {
          // Recarregar eventos do dia
          if (selectedDate) {
            setSelectedDate(new Date(selectedDate));
          }
        }}
      />
    </div>
  );
};

export default MeuPerfil;
