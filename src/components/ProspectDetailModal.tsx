import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Prospect, useProspectInteracoes, useUpdateProspect, useCreateInteracao, useDeleteProspect } from '@/hooks/useProspects';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Mail, Globe, MapPin, Calendar, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
  const updateProspect = useUpdateProspect();
  const createInteracao = useCreateInteracao();
  const deleteProspect = useDeleteProspect();

  if (!prospect) return null;

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

  const getResultadoIcon = (resultado?: string) => {
    switch (resultado) {
      case 'positivo': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'negativo': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="acoes">Ações Rápidas</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
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
                    <SelectItem value="ganho">Ganho</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
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
                {(prospect.cidade || prospect.estado) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>{[prospect.cidade, prospect.estado].filter(Boolean).join(', ')}</span>
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
                <Button onClick={() => { setEditMode(true); setFormData(prospect); }}>Editar</Button>
              )}
            </div>
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
                    <div key={interacao.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge>{interacao.tipo_interacao}</Badge>
                          {getResultadoIcon(interacao.resultado)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(interacao.data_interacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm">{interacao.descricao}</p>
                      {interacao.proximo_passo && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Próximo passo:</strong> {interacao.proximo_passo}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">Por: {interacao.profiles?.nome}</p>
                    </div>
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
                  onValueChange={(value) => updateProspect.mutate({ id: prospect.id, status: value as any })}
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
                    <SelectItem value="perdido">Perdido ✗</SelectItem>
                    <SelectItem value="futuro">Futuro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
