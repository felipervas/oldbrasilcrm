import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Phone, MessageCircle, Trash2, UserPlus, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLojaLeads } from '@/hooks/useLojaLeads';
import { ConvertLeadDialog } from '@/components/loja/ConvertLeadDialog';
import { WhatsAppTemplateModal } from '@/components/loja/WhatsAppTemplateModal';
import { useIAVendas } from '@/hooks/useIAVendas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function LeadsLoja() {
  const [searchTerm, setSearchTerm] = useState('');
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [leadToConvert, setLeadToConvert] = useState<any>(null);
  const [whatsAppLead, setWhatsAppLead] = useState<any>(null);
  
  const { leads, isLoading, deleteLead, convertToClient } = useLojaLeads();
  const { qualificarLead } = useIAVendas();

  const handleQualificarLead = async (lead: any) => {
    try {
      const resultado = await qualificarLead.mutateAsync(lead);
      toast.success(`Lead qualificado: ${resultado.qualificacao.toUpperCase()} (Score: ${resultado.score})`);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const filteredLeads = leads?.filter(lead => 
    lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.telefone?.includes(searchTerm)
  );

  const getOrigemLabel = (origem: string) => {
    switch (origem) {
      case 'modal_1min': return 'Atendimento Exclusivo';
      case 'contato': return 'Formulário de Contato';
      default: return origem;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Leads da Loja
          </h1>
          <p className="text-muted-foreground">
            Gerenciar contatos recebidos através da loja online
          </p>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Contatos Recebidos ({filteredLeads?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : filteredLeads && filteredLeads.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Mensagem</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">{lead.nome}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {lead.email && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                                    {lead.email}
                                  </a>
                                </div>
                              )}
                               {lead.telefone && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <button
                                    onClick={() => setWhatsAppLead(lead)}
                                    className="text-primary hover:underline"
                                  >
                                    {lead.telefone}
                                  </button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getOrigemLabel(lead.origem || 'modal_1min')}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md">
                            {lead.mensagem ? (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {lead.mensagem}
                              </p>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Sem mensagem</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQualificarLead(lead)}
                                title="Qualificar com IA"
                                disabled={qualificarLead.isPending}
                              >
                                <Sparkles className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLeadToConvert(lead)}
                                title="Converter em Cliente"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLeadToDelete(lead.id)}
                                title="Excluir Lead"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum lead encontrado
                </p>
              )}
            </CardContent>
          </Card>
        </div>

      <AlertDialog open={!!leadToDelete} onOpenChange={(open) => !open && setLeadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (leadToDelete) {
                  deleteLead.mutate(leadToDelete);
                  setLeadToDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConvertLeadDialog
        lead={leadToConvert}
        open={!!leadToConvert}
        onOpenChange={(open) => !open && setLeadToConvert(null)}
        onConvert={(data) => {
          if (leadToConvert) {
            convertToClient.mutate({
              leadId: leadToConvert.id,
              clientData: data,
              leadOriginal: leadToConvert,
            });
            setLeadToConvert(null);
          }
        }}
      />

      <WhatsAppTemplateModal
        open={!!whatsAppLead}
        onOpenChange={(open) => !open && setWhatsAppLead(null)}
        contato={{
          nome: whatsAppLead?.nome || '',
          telefone: whatsAppLead?.telefone || '',
          empresa: whatsAppLead?.nome || '',
        }}
      />
      </div>
  );
}
