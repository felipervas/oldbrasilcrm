import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Prospect, ProspectInteracao, useProspectInteracoes, useUpdateProspect, useCreateInteracao, useDeleteProspect, useUpdateInteracao, useDeleteInteracao } from '@/hooks/useProspects';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Mail, Globe, Calendar, Trash2, CheckCircle, XCircle, Sparkles, Loader2, Edit, X, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useIAInsights } from '@/hooks/useIAInsights';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Componente para card de interação
const InteracaoCard = ({ interacao, prospectId }: { interacao: ProspectInteracao; prospectId: string }) => {
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({
    tipo_interacao: interacao.tipo_interacao,
    resultado: interacao.resultado,
    descricao: interacao.descricao,
    proximo_passo: interacao.proximo_passo || '',
  });

  const updateInteracao = useUpdateInteracao();
  const deleteInteracao = useDeleteInteracao();

  const getResultadoIcon = (resultado?: string) => {
    if (!resultado) return null;
    switch (resultado) {
      case 'positivo': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'negativo': return <ThumbsDown className="h-4 w-4 text-red-500" />;
      case 'neutro': return <Minus className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const handleSave = () => {
    updateInteracao.mutate({
      id: interacao.id,
      prospect_id: prospectId,
      ...formData,
    });
    setEditando(false);
  };

  const handleDelete = () => {
    deleteInteracao.mutate({ id: interacao.id, prospect_id: prospectId });
  };

  if (editando) {
    return (
      <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Editando Interação</h4>
          <Button variant="ghost" size="sm" onClick={() => setEditando(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={formData.tipo_interacao} onValueChange={(value: any) => setFormData({ ...formData, tipo_interacao: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ligacao">Ligação</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="visita">Visita</SelectItem>
                <SelectItem value="reuniao">Reunião</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Resultado</Label>
            <Select value={formData.resultado || undefined} onValueChange={(value: any) => setFormData({ ...formData, resultado: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positivo">Positivo</SelectItem>
                <SelectItem value="neutro">Neutro</SelectItem>
                <SelectItem value="negativo">Negativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          />
        </div>
        <div>
          <Label>Próximo Passo</Label>
          <Input
            value={formData.proximo_passo}
            onChange={(e) => setFormData({ ...formData, proximo_passo: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">Salvar</Button>
          <Button variant="outline" onClick={() => setEditando(false)}>Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-2 group hover:bg-muted/20 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge>{interacao.tipo_interacao}</Badge>
          {getResultadoIcon(interacao.resultado)}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {format(new Date(interacao.data_interacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-xs text-muted-foreground">Por: {interacao.profiles?.nome}</p>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setEditando(true)}>
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir esta interação? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
      <p className="text-sm">{interacao.descricao}</p>
      {interacao.proximo_passo && (
        <p className="text-sm text-muted-foreground">
          <strong>Próximo passo:</strong> {interacao.proximo_passo}
        </p>
      )}
    </div>
  );
};

interface ProspectDetailModalProps {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProspectDetailModal = ({ prospect, open, onOpenChange }: ProspectDetailModalProps) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Prospect>>({});
  const [novaInteracao, setNovaInteracao] = useState({
    tipo_interacao: 'ligacao' as const,
    descricao: '',
    resultado: '' as 'positivo' | 'neutro' | 'negativo' | '',
    proximo_passo: '',
  });

  const { data: interacoes } = useProspectInteracoes(prospect?.id || '');
  const { insights, isLoading: loadingInsights, generateInsights, isGenerating } = useIAInsights(prospect?.id);
  const updateProspect = useUpdateProspect();
  const createInteracao = useCreateInteracao();
  const deleteProspect = useDeleteProspect();

  if (!prospect) return null;

  const handleGenerateInsights = async () => {
    if (!prospect.id || !prospect.nome_empresa) return;
    
    try {
      await generateInsights({
        prospectId: prospect.id,
        nomeEmpresa: prospect.nome_empresa,
        segmento: prospect.segmento || '',
        cidade: prospect.cidade || '',
      });
    } catch (error) {
      console.error('Erro ao gerar insights:', error);
    }
  };

  const handleSave = () => {
    if (prospect.id) {
      updateProspect.mutate({ id: prospect.id, ...formData });
      setEditMode(false);
    }
  };

  const handleAddInteracao = () => {
    if (novaInteracao.descricao && prospect.id) {
      createInteracao.mutate({
        prospect_id: prospect.id,
        tipo_interacao: novaInteracao.tipo_interacao,
        descricao: novaInteracao.descricao,
        resultado: novaInteracao.resultado || undefined,
        proximo_passo: novaInteracao.proximo_passo || undefined,
      });
      setNovaInteracao({
        tipo_interacao: 'ligacao',
        descricao: '',
        resultado: '',
        proximo_passo: '',
      });
    }
  };

  const handleDelete = () => {
    if (prospect.id) {
      deleteProspect.mutate(prospect.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{prospect.nome_empresa}</span>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir este prospect? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="insights">
              <Sparkles className="h-4 w-4 mr-1" />
              Insights IA
            </TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="acoes">Ações Rápidas</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            {/* Resumo de Datas */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Cadastrado em</p>
                <p className="text-sm font-medium">
                  {format(new Date(prospect.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              {prospect.data_ultimo_contato && (
                <div>
                  <p className="text-xs text-muted-foreground">Último contato</p>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    {format(new Date(prospect.data_ultimo_contato), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
              {prospect.data_proximo_contato && (
                <div>
                  <p className="text-xs text-muted-foreground">Próximo contato</p>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {format(new Date(prospect.data_proximo_contato), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
              {prospect.profiles?.nome && (
                <div>
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="text-sm font-medium">{prospect.profiles.nome}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={editMode ? formData.status : prospect.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  disabled={!editMode}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_contato">Em Contato</SelectItem>
                    <SelectItem value="aguardando_retorno">Aguardando Retorno</SelectItem>
                    <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                    <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                    <SelectItem value="ganho">Ganho ✓</SelectItem>
                    <SelectItem value="perdido">Não Deu Certo ✗</SelectItem>
                    <SelectItem value="futuro">Futuro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade</Label>
                <Select
                  value={editMode ? formData.prioridade : prospect.prioridade}
                  onValueChange={(value) => setFormData({ ...formData, prioridade: value as any })}
                  disabled={!editMode}
                >
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

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={editMode ? (formData.cidade ?? prospect.cidade) : prospect.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input
                    value={editMode ? (formData.estado ?? prospect.estado) : prospect.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    placeholder="UF"
                    maxLength={2}
                    disabled={!editMode}
                  />
                </div>
              </div>

              <div>
                <Label>Segmento</Label>
                <Input
                  value={editMode ? (formData.segmento ?? prospect.segmento) : prospect.segmento}
                  onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                  placeholder="Ex: Confeitaria, Padaria, Sorveteria"
                  disabled={!editMode}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  {prospect.telefone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{prospect.telefone}</span>
                    </div>
                  )}
                  {prospect.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" />
                      <span>{prospect.email}</span>
                    </div>
                  )}
                  {prospect.site && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4" />
                      <span>{prospect.site}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Porte:</span>
                    <Badge>{prospect.porte || 'Não informado'}</Badge>
                  </div>
                  {prospect.produto_utilizado && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Produto: </span>
                      {prospect.produto_utilizado}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={editMode ? (formData.observacoes ?? prospect.observacoes) : prospect.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                disabled={!editMode}
                rows={4}
              />
            </div>

            <div className="flex gap-2 justify-end">
              {editMode ? (
                <>
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                  <Button onClick={handleSave}>Salvar</Button>
                </>
              ) : (
                <Button onClick={() => { 
                  setEditMode(true); 
                  // Remove campos de relacionamento antes de editar
                  const { profiles, criador, ...editableData } = prospect;
                  setFormData(editableData); 
                }}>Editar</Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Insights para Venda
              </h3>
              <Button
                onClick={handleGenerateInsights}
                disabled={isGenerating}
                size="sm"
              >
                {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {insights ? 'Atualizar' : 'Gerar'} Insights
              </Button>
            </div>

            {loadingInsights ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : insights ? (
              <div className="space-y-4">
                {insights.resumo_empresa && (
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-2">📋 Resumo da Empresa</h4>
                      <p className="text-sm text-muted-foreground">{insights.resumo_empresa}</p>
                    </CardContent>
                  </Card>
                )}

                {insights.produtos_recomendados && insights.produtos_recomendados.length > 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-2">🎯 Produtos Recomendados</h4>
                      <ul className="space-y-1">
                        {insights.produtos_recomendados.map((produto, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{produto}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {insights.dicas_abordagem && insights.dicas_abordagem.length > 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-2">💡 Dicas de Abordagem</h4>
                      <ul className="space-y-2">
                        {insights.dicas_abordagem.map((dica, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-primary font-bold">{idx + 1}.</span>
                            <span>{dica}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {insights.informacoes_publicas && (
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-2">🌐 Informações Públicas</h4>
                      <p className="text-sm text-muted-foreground">{insights.informacoes_publicas}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Nenhum insight gerado ainda para este prospect.
                  </p>
                  <Button onClick={handleGenerateInsights} disabled={isGenerating}>
                    {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Gerar Insights com IA
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Nova Interação</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={novaInteracao.tipo_interacao} onValueChange={(value: any) => setNovaInteracao({ ...novaInteracao, tipo_interacao: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ligacao">Ligação</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="visita">Visita</SelectItem>
                        <SelectItem value="reuniao">Reunião</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Resultado</Label>
                    <Select value={novaInteracao.resultado} onValueChange={(value: any) => setNovaInteracao({ ...novaInteracao, resultado: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positivo">Positivo</SelectItem>
                        <SelectItem value="neutro">Neutro</SelectItem>
                        <SelectItem value="negativo">Negativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={novaInteracao.descricao}
                    onChange={(e) => setNovaInteracao({ ...novaInteracao, descricao: e.target.value })}
                    placeholder="O que foi conversado..."
                  />
                </div>
                <div>
                  <Label>Próximo Passo</Label>
                  <Input
                    value={novaInteracao.proximo_passo}
                    onChange={(e) => setNovaInteracao({ ...novaInteracao, proximo_passo: e.target.value })}
                    placeholder="O que fazer em seguida..."
                  />
                </div>
                <Button onClick={handleAddInteracao} className="w-full">Adicionar Interação</Button>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Histórico de Interações</h3>
                {interacoes && interacoes.length > 0 ? (
                  interacoes.map((interacao) => (
                    <InteracaoCard
                      key={interacao.id}
                      interacao={interacao}
                      prospectId={prospect.id}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma interação registrada</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="acoes" className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label>Alterar Status</Label>
                <Select
                  value={prospect.status}
                  onValueChange={(value) => {
                    if (value === 'perdido') {
                      // Vai pedir motivo depois
                      updateProspect.mutate({ id: prospect.id, status: value as any });
                    } else {
                      updateProspect.mutate({ id: prospect.id, status: value as any, motivo_perda: null });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_contato">Em Contato</SelectItem>
                    <SelectItem value="aguardando_retorno">Aguardando Retorno</SelectItem>
                    <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                    <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                    <SelectItem value="ganho">Ganho ✓</SelectItem>
                    <SelectItem value="perdido">Não Deu Certo ✗</SelectItem>
                    <SelectItem value="futuro">Futuro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {prospect.status === 'perdido' && (
                <div>
                  <Label>Motivo (Por que não deu certo?)</Label>
                  <Textarea
                    value={prospect.motivo_perda || ''}
                    onChange={(e) => updateProspect.mutate({ id: prospect.id, motivo_perda: e.target.value })}
                    placeholder="Ex: Preço alto, já tem fornecedor, não tem interesse..."
                    rows={3}
                  />
                </div>
              )}

              <div>
                <Label>Agendar Próximo Contato</Label>
                <Input
                  type="date"
                  value={prospect.data_proximo_contato || ''}
                  onChange={(e) => updateProspect.mutate({ id: prospect.id, data_proximo_contato: e.target.value })}
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => updateProspect.mutate({ id: prospect.id, data_ultimo_contato: new Date().toISOString().split('T')[0] })}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Marcar Contato Hoje
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
