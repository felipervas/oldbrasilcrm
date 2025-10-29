import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useProspects, useCreateProspect, useBulkCreateProspects, Prospect, ProspectStatus } from '@/hooks/useProspects';
import { ProspectCard } from '@/components/ProspectCard';
import { ProspectDetailModal } from '@/components/ProspectDetailModal';
import { ImportarProspects } from '@/components/ImportarProspects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { data: prospects, isLoading } = useProspects();
  const createProspect = useCreateProspect();
  const bulkCreateProspects = useBulkCreateProspects();
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [newProspectModalOpen, setNewProspectModalOpen] = useState(false);
  const [bulkProspectModalOpen, setBulkProspectModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterCidade, setFilterCidade] = useState('todos');
  const [filterPorte, setFilterPorte] = useState('todos');
  const [filterPrioridade, setFilterPrioridade] = useState('todos');
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const { toast } = useToast();

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
  useState(() => {
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
  });

  const filteredProspects = useMemo(() => {
    if (!prospects) return [];

    return prospects.filter((p) => {
      const matchSearch = p.nome_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cidade?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEstado = filterEstado === 'todos' || p.estado === filterEstado;
      const matchCidade = filterCidade === 'todos' || p.cidade === filterCidade;
      const matchPorte = filterPorte === 'todos' || p.porte === filterPorte;
      const matchPrioridade = filterPrioridade === 'todos' || p.prioridade === filterPrioridade;

      return matchSearch && matchEstado && matchCidade && matchPorte && matchPrioridade;
    });
  }, [prospects, searchTerm, filterEstado, filterCidade, filterPorte, filterPrioridade]);

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

  if (isLoading) {
    return <AppLayout><div className="p-8">Carregando...</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pipeline de Vendas</h1>
            <p className="text-muted-foreground">
              Gerencie seus prospects e acompanhe o funil de vendas
            </p>
          </div>
          <div className="flex gap-2">
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
                  <DialogTitle>Adicionar Vários Prospects</DialogTitle>
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
                      Adicionar {bulkProspects.split('\n').filter(l => l.trim()).length} Prospects
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={newProspectModalOpen} onOpenChange={setNewProspectModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Prospect
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Prospect</DialogTitle>
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
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
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

        {/* Kanban Board - Layout otimizado para tela cheia */}
        <div className="flex gap-3 min-h-[calc(100vh-300px)] overflow-x-auto">
          {statusColumns.map((status) => (
            <div key={status} className="flex flex-col min-w-[280px] flex-1">
              <div className="bg-muted rounded-t-lg p-4 sticky top-0 z-10">
                <h3 className="font-semibold">{statusLabels[status]}</h3>
                <p className="text-xs text-muted-foreground">
                  {prospectsByStatus[status].length} {prospectsByStatus[status].length === 1 ? 'prospect' : 'prospects'}
                </p>
              </div>
              <ScrollArea className="flex-1 border border-t-0 rounded-b-lg p-3">
                <div className="space-y-3">
                  {prospectsByStatus[status].map((prospect) => (
                    <ProspectCard
                      key={prospect.id}
                      prospect={prospect}
                      onClick={() => handleCardClick(prospect)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
      </div>

      <ProspectDetailModal
        prospect={selectedProspect}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </AppLayout>
  );
}
