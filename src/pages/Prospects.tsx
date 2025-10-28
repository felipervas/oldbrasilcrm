import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useProspects, useCreateProspect, Prospect, ProspectStatus } from '@/hooks/useProspects';
import { ProspectCard } from '@/components/ProspectCard';
import { ProspectDetailModal } from '@/components/ProspectDetailModal';
import { ImportarProspects } from '@/components/ImportarProspects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [newProspectModalOpen, setNewProspectModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterPorte, setFilterPorte] = useState('todos');
  const [filterPrioridade, setFilterPrioridade] = useState('todos');

  const [novoProspect, setNovoProspect] = useState({
    nome_empresa: '',
    cidade: '',
    estado: '',
    porte: 'Médio' as 'Grande' | 'Médio' | 'Pequeno',
    produto_utilizado: '',
    telefone: '',
    email: '',
    prioridade: 'media' as 'alta' | 'media' | 'baixa',
    observacoes: '',
  });

  const filteredProspects = useMemo(() => {
    if (!prospects) return [];

    return prospects.filter((p) => {
      const matchSearch = p.nome_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cidade?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEstado = filterEstado === 'todos' || p.estado === filterEstado;
      const matchPorte = filterPorte === 'todos' || p.porte === filterPorte;
      const matchPrioridade = filterPrioridade === 'todos' || p.prioridade === filterPrioridade;

      return matchSearch && matchEstado && matchPorte && matchPrioridade;
    });
  }, [prospects, searchTerm, filterEstado, filterPorte, filterPrioridade]);

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

  const handleCreateProspect = () => {
    createProspect.mutate(novoProspect);
    setNewProspectModalOpen(false);
    setNovoProspect({
      nome_empresa: '',
      cidade: '',
      estado: '',
      porte: 'Médio',
      produto_utilizado: '',
      telefone: '',
      email: '',
      prioridade: 'media',
      observacoes: '',
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

        {/* Kanban Board */}
        <div className="grid grid-cols-6 gap-4 min-h-[600px]">
          {statusColumns.map((status) => (
            <div key={status} className="flex flex-col">
              <div className="bg-muted rounded-t-lg p-3 sticky top-0 z-10">
                <h3 className="font-semibold text-sm">{statusLabels[status]}</h3>
                <p className="text-xs text-muted-foreground">
                  {prospectsByStatus[status].length} {prospectsByStatus[status].length === 1 ? 'prospect' : 'prospects'}
                </p>
              </div>
              <ScrollArea className="flex-1 border border-t-0 rounded-b-lg p-2">
                <div className="space-y-2">
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
