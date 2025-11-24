import { useState, useMemo, useEffect, memo, useCallback } from 'react';
import { useCreateProspect, useBulkCreateProspects, useUpdateProspect, Prospect, ProspectStatus } from '@/hooks/useProspects';
import { useProspectsOptimized } from '@/hooks/useProspectsOptimized';
import { useDebounce } from '@/hooks/useDebounce';
import { ProspectCard } from '@/components/ProspectCard';
import { ProspectDetailModal } from '@/components/ProspectDetailModal';
import { ImportarProspects } from '@/components/ImportarProspects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Users, MapIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProspectQuickActions } from '@/components/prospects/ProspectQuickActions';
import { AgendamentoRapidoModal } from '@/components/prospects/AgendamentoRapidoModal';
import { CriarTarefaModal } from '@/components/prospects/CriarTarefaModal';
import { useIAInsights } from '@/hooks/useIAInsights';
import { useNavigate } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const statusLabels: Record<ProspectStatus, string> = {
  novo: 'Novo',
  em_contato: 'Em Contato',
  aguardando_retorno: 'Aguardando Retorno',
  em_negociacao: 'Em Negociação',
  proposta_enviada: 'Proposta Enviada',
  ganho: 'Ganho',
  perdido: 'Perdido',
  futuro: 'Futuro',
};

const statusColumns: ProspectStatus[] = ['novo', 'em_contato', 'aguardando_retorno', 'em_negociacao', 'proposta_enviada', 'ganho'];

export default function Prospects() {
  const { data: prospects, refetch } = useProspectsOptimized();
  const createProspect = useCreateProspect();
  const bulkCreateProspects = useBulkCreateProspects();
  const navigate = useNavigate();
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [newProspectModalOpen, setNewProspectModalOpen] = useState(false);
  const [bulkProspectModalOpen, setBulkProspectModalOpen] = useState(false);
  const [agendamentoModalOpen, setAgendamentoModalOpen] = useState(false);
  const [prospectToSchedule, setProspectToSchedule] = useState<Prospect | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterCidade, setFilterCidade] = useState('todos');
  const [filterPorte, setFilterPorte] = useState('todos');
  const [filterPrioridade, setFilterPrioridade] = useState('todos');
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [tarefaModalOpen, setTarefaModalOpen] = useState(false);
  // Removido ultimasInteracoes - agora vem da view otimizada
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();
  const { generateInsights } = useIAInsights();
  const updateProspectMutation = useUpdateProspect();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [novoProspect, setNovoProspect] = useState({
    nome_empresa: '',
    cidade: '',
    estado: '',
    porte: 'Médio' as 'Grande' | 'Médio' | 'Pequeno',
    segmento: '',
    produto_utilizado: '',
    telefone: '',
    email: '',
    prioridade: 'media' as 'alta' | 'media' | 'baixa',
    observacoes: '',
    responsavel_id: '',
  });

  const [bulkProspects, setBulkProspects] = useState('');
  const [bulkResponsavel, setBulkResponsavel] = useState('');

  // Carregar colaboradores e usuário atual
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setNovoProspect(prev => ({ ...prev, responsavel_id: user.id }));
        setBulkResponsavel(user.id);
      }

      const { data: colabs } = await supabase
        .from('profiles')
        .select('id, nome')
        .order('nome');
      setColaboradores(colabs || []);
    };
    loadData();
  }, []);

  // Removido: agora a view prospects_with_last_interaction já traz ultima_interacao otimizada

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const prospectId = active.id as string;
    
    // Verifica se over.id é um status válido ou se é o ID de um prospect
    let newStatus: ProspectStatus;
    
    if (statusColumns.includes(over.id as ProspectStatus)) {
      // Foi solto diretamente na coluna
      newStatus = over.id as ProspectStatus;
    } else {
      // Foi solto sobre outro prospect - busca o status do prospect de destino
      const targetProspect = prospects?.find(p => p.id === over.id);
      if (!targetProspect) return;
      newStatus = targetProspect.status as ProspectStatus;
    }

    const prospect = prospects?.find(p => p.id === prospectId);
    if (!prospect || prospect.status === newStatus) return;

    try {
      await updateProspectMutation.mutateAsync({
        id: prospectId,
        status: newStatus,
      });

      toast({
        title: "Status atualizado",
        description: `Lead movido para ${statusLabels[newStatus]}`,
      });
    } catch (error) {
      console.error('Erro ao atualizar prospect:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Tente novamente",
        variant: "destructive",
      });
    }
  }, [prospects, updateProspectMutation, toast]);

  // 🚀 OTIMIZAÇÃO: Filtros com useMemo para evitar re-renders
  const filteredProspects = useMemo(() => {
    if (!prospects) return [];

    return prospects.filter((p) => {
      const matchSearch = p.nome_empresa.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        p.cidade?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        p.segmento?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchEstado = filterEstado === 'todos' || p.estado === filterEstado;
      const matchCidade = filterCidade === 'todos' || p.cidade === filterCidade;
      const matchPorte = filterPorte === 'todos' || p.porte === filterPorte;
      const matchPrioridade = filterPrioridade === 'todos' || p.prioridade === filterPrioridade;

      return matchSearch && matchEstado && matchCidade && matchPorte && matchPrioridade;
    });
  }, [prospects, debouncedSearchTerm, filterEstado, filterCidade, filterPorte, filterPrioridade]);

  // 🚀 OTIMIZAÇÃO: Agrupar prospects por status com limitação inicial
  const [columnsLimit, setColumnsLimit] = useState<Record<ProspectStatus, number>>({
    novo: 30,
    em_contato: 30,
    aguardando_retorno: 30,
    em_negociacao: 30,
    proposta_enviada: 30,
    ganho: 30,
    perdido: 30,
    futuro: 30,
  });

  const prospectsByStatus = useMemo(() => {
    const grouped: Record<ProspectStatus, Prospect[]> = {
      novo: [],
      em_contato: [],
      aguardando_retorno: [],
      em_negociacao: [],
      proposta_enviada: [],
      ganho: [],
      perdido: [],
      futuro: [],
    };

    filteredProspects.forEach((prospect) => {
      grouped[prospect.status].push(prospect);
    });

    return grouped;
  }, [filteredProspects]);

  const handleLoadMore = useCallback((status: ProspectStatus) => {
    setColumnsLimit(prev => ({
      ...prev,
      [status]: prev[status] + 30
    }));
  }, []);

  const estados = useMemo(() => {
    if (!prospects) return [];
    return Array.from(new Set(prospects.map((p) => p.estado).filter(Boolean)));
  }, [prospects]);

  const cidades = useMemo(() => {
    if (!prospects) return [];
    return Array.from(new Set(prospects.map((p) => p.cidade).filter(Boolean))).sort();
  }, [prospects]);

  const handleCreateProspect = () => {
    createProspect.mutate(novoProspect);
    setNewProspectModalOpen(false);
    setNovoProspect({
      nome_empresa: '',
      cidade: '',
      estado: '',
      porte: 'Médio',
      segmento: '',
      produto_utilizado: '',
      telefone: '',
      email: '',
      prioridade: 'media',
      observacoes: '',
      responsavel_id: currentUserId,
    });
  };

  const handleBulkCreate = () => {
    const lines = bulkProspects.split('\n').filter(line => line.trim());
    const prospectsToCreate = lines.map(line => ({
      nome_empresa: line.trim(),
      prioridade: 'media' as const,
      responsavel_id: bulkResponsavel || currentUserId,
    }));

    if (prospectsToCreate.length === 0) {
      toast({ title: 'Digite ao menos um nome de empresa', variant: 'destructive' });
      return;
    }

    bulkCreateProspects.mutate(prospectsToCreate, {
      onSuccess: () => {
        setBulkProspectModalOpen(false);
        setBulkProspects('');
        setBulkResponsavel(currentUserId);
      }
    });
  };

  const handleCardClick = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setDetailModalOpen(true);
  };

  const handleAgendarVisita = (prospect: Prospect) => {
    setProspectToSchedule(prospect);
    setAgendamentoModalOpen(true);
  };

  const handleGerarInsights = (prospect: Prospect) => {
    generateInsights({
      prospectId: prospect.id,
      nomeEmpresa: prospect.nome_empresa,
      segmento: prospect.segmento,
      cidade: prospect.cidade,
    });
  };

  const handleRegistrarInteracao = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setDetailModalOpen(true);
  };

  const handleVerMapa = (prospect: Prospect) => {
    if (prospect.endereco_completo) {
      const endereco = encodeURIComponent(prospect.endereco_completo);
      window.open(`https://www.google.com/maps/search/?api=1&query=${endereco}`, '_blank');
    }
  };

  const handleSelectProspect = (prospectId: string, selected: boolean) => {
    setSelectedProspects(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(prospectId);
      } else {
        newSet.delete(prospectId);
      }
      return newSet;
    });
  };

  const handleOpenTarefaModal = () => {
    if (selectedProspects.size === 0) {
      toast({ title: "Selecione pelo menos um lead", variant: "destructive" });
      return;
    }
    setTarefaModalOpen(true);
  };

  const SortableProspectCard = ({ prospect }: { prospect: Prospect }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: prospect.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative group">
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <ProspectQuickActions
            prospect={prospect}
            onAgendarVisita={handleAgendarVisita}
            onGerarInsights={handleGerarInsights}
            onRegistrarInteracao={handleRegistrarInteracao}
            onVerMapa={handleVerMapa}
          />
        </div>
        <div onClick={() => handleCardClick(prospect)}>
          <ProspectCard 
            prospect={prospect as any} 
            onClick={() => {}}
          />
        </div>
      </div>
    );
  };

  // Removido isLoading - React Query gerencia isso automaticamente

  return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="px-2 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Pipeline de Leads</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerencie seus leads e acompanhe o funil de vendas
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => navigate('/rotas/planejar')}>
              <MapIcon className="h-4 w-4 mr-2" />
              Planejar Rotas
            </Button>
            <ImportarProspects />
            <Dialog open={bulkProspectModalOpen} onOpenChange={setBulkProspectModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Adicionar Vários
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Vários Leads</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Empresas (uma por linha)</Label>
                    <Textarea
                      value={bulkProspects}
                      onChange={(e) => setBulkProspects(e.target.value)}
                      placeholder="Digite um nome de empresa por linha:&#10;Empresa A&#10;Empresa B&#10;Empresa C"
                      rows={10}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {bulkProspects.split('\n').filter(l => l.trim()).length} empresas
                    </p>
                  </div>
                  <div>
                    <Label>Quem Prospectou</Label>
                    <Select value={bulkResponsavel} onValueChange={setBulkResponsavel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradores.map((colab) => (
                          <SelectItem key={colab.id} value={colab.id}>
                            {colab.nome} {colab.id === currentUserId && '(Você)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setBulkProspectModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleBulkCreate}>
                      Adicionar {bulkProspects.split('\n').filter(l => l.trim()).length} Leads
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={newProspectModalOpen} onOpenChange={setNewProspectModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Lead
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Lead</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome da Empresa * (Rápido!)</Label>
                    <Input
                      value={novoProspect.nome_empresa}
                      onChange={(e) => setNovoProspect({ ...novoProspect, nome_empresa: e.target.value })}
                      placeholder="Digite apenas o nome da empresa"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <Label>Quem Prospectou</Label>
                    <Select value={novoProspect.responsavel_id} onValueChange={(value) => setNovoProspect({ ...novoProspect, responsavel_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradores.map((colab) => (
                          <SelectItem key={colab.id} value={colab.id}>
                            {colab.nome} {colab.id === currentUserId && '(Você)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer text-sm text-muted-foreground">+ Informações adicionais (opcional)</summary>
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Cidade</Label>
                          <Input
                            value={novoProspect.cidade}
                            onChange={(e) => setNovoProspect({ ...novoProspect, cidade: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Estado</Label>
                          <Input
                            value={novoProspect.estado}
                            onChange={(e) => setNovoProspect({ ...novoProspect, estado: e.target.value })}
                            placeholder="UF"
                            maxLength={2}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Porte</Label>
                          <Select value={novoProspect.porte} onValueChange={(value: any) => setNovoProspect({ ...novoProspect, porte: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Grande">Grande</SelectItem>
                              <SelectItem value="Médio">Médio</SelectItem>
                              <SelectItem value="Pequeno">Pequeno</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Prioridade</Label>
                          <Select value={novoProspect.prioridade} onValueChange={(value: any) => setNovoProspect({ ...novoProspect, prioridade: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alta">Alta</SelectItem>
                              <SelectItem value="media">Média</SelectItem>
                              <SelectItem value="baixa">Baixa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                       <div>
                        <Label>Segmento</Label>
                        <Input
                          value={novoProspect.segmento}
                          onChange={(e) => setNovoProspect({ ...novoProspect, segmento: e.target.value })}
                          placeholder="Ex: Confeitaria, Padaria, Sorveteria"
                        />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input
                          value={novoProspect.telefone}
                          onChange={(e) => setNovoProspect({ ...novoProspect, telefone: e.target.value })}
                        />
                      </div>
                    </div>
                  </details>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setNewProspectModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateProspect} disabled={!novoProspect.nome_empresa}>
                      Cadastrar Rápido
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Estados</SelectItem>
              {estados.map((estado) => (
                <SelectItem key={estado} value={estado!}>
                  {estado}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCidade} onValueChange={setFilterCidade}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Cidades</SelectItem>
              {cidades.map((cidade) => (
                <SelectItem key={cidade} value={cidade!}>
                  {cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPorte} onValueChange={setFilterPorte}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Porte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Portes</SelectItem>
              <SelectItem value="Grande">Grande</SelectItem>
              <SelectItem value="Médio">Médio</SelectItem>
              <SelectItem value="Pequeno">Pequeno</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Kanban Board - Layout otimizado para tela cheia com Drag and Drop */}
        <div className="flex gap-3 md:gap-4 min-h-[calc(100vh-280px)] md:min-h-[calc(100vh-240px)] overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory will-change-scroll"
          style={{ scrollbarWidth: 'thin' }}
        >
          {statusColumns.map((status) => {
            const statusProspects = prospectsByStatus[status] || [];
            const limit = columnsLimit[status];
            const displayedProspects = statusProspects.slice(0, limit);
            const hasMore = statusProspects.length > limit;
            
            return (
              <SortableContext
                key={status}
                id={status}
                items={displayedProspects.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col min-w-[280px] sm:min-w-[320px] flex-1 snap-start transform-gpu h-full">
                  <div 
                    className="bg-muted/80 backdrop-blur-sm rounded-t-lg p-3 sm:p-4 sticky top-0 z-10 border-b"
                    data-status={status}
                  >
                    <h3 className="font-semibold text-sm sm:text-base">{statusLabels[status]}</h3>
                    <p className="text-xs text-muted-foreground">
                      {statusProspects.length} {statusProspects.length === 1 ? 'lead' : 'leads'}
                      {hasMore && ` (mostrando ${limit})`}
                    </p>
                  </div>
                  <ScrollArea className="flex-1 border border-t-0 rounded-b-lg p-2 sm:p-3 h-[calc(100vh-360px)] md:h-[calc(100vh-320px)]">
                    <div className="space-y-3">
                      {displayedProspects.map((prospect) => (
                        <SortableProspectCard key={prospect.id} prospect={prospect} />
                      ))}
                      {hasMore && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadMore(status)}
                          className="w-full"
                        >
                          Carregar mais ({statusProspects.length - limit} restantes)
                        </Button>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </SortableContext>
            );
          })}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="opacity-80 rotate-3">
              <ProspectCard 
                prospect={prospects?.find(p => p.id === activeId) as any} 
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>

      <ProspectDetailModal
        prospect={selectedProspect}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />

      <AgendamentoRapidoModal
        prospect={prospectToSchedule}
        open={agendamentoModalOpen}
        onOpenChange={setAgendamentoModalOpen}
        onSuccess={() => {
          // Fecha o modal e recarrega apenas os dados necessários (mais rápido)
          setAgendamentoModalOpen(false);
          setProspectToSchedule(null);
        }}
      />

      <CriarTarefaModal
        open={tarefaModalOpen}
        onOpenChange={setTarefaModalOpen}
        prospects={(prospects?.filter(p => selectedProspects.has(p.id)) as Prospect[]) || []}
        onSuccess={() => {
          setSelectedProspects(new Set());
          setTarefaModalOpen(false);
        }}
      />
      </DndContext>
  );
}
