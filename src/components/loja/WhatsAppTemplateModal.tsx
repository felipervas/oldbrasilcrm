import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { MessageCircle, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WhatsAppTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contato: {
    nome: string;
    telefone: string;
    clienteId?: string;
    prospectId?: string;
    empresa?: string;
  };
}

export function WhatsAppTemplateModal({ open, onOpenChange, contato }: WhatsAppTemplateModalProps) {
  const { templates, substituirVariaveis, registrarInteracao } = useWhatsAppTemplates();
  const [templateSelecionado, setTemplateSelecionado] = useState<string>('');
  const [mensagem, setMensagem] = useState('');
  const [variaveis, setVariaveis] = useState<Record<string, string>>({});

  useEffect(() => {
    if (templateSelecionado && templates) {
      const template = templates.find(t => t.id === templateSelecionado);
      if (template) {
        const vars: Record<string, string> = {
          nome: contato.nome,
          empresa: contato.empresa || contato.nome,
        };
        
        // Extrair variáveis do template
        const matches = template.mensagem.match(/{{(\w+)}}/g);
        if (matches) {
          matches.forEach((match: string) => {
            const varName = match.replace('{{', '').replace('}}', '');
            if (!vars[varName]) vars[varName] = '';
          });
        }
        
        setVariaveis(vars);
        setMensagem(substituirVariaveis(template.mensagem, vars));
      }
    }
  }, [templateSelecionado, templates, contato]);

  const handleVariavelChange = (chave: string, valor: string) => {
    const novasVars = { ...variaveis, [chave]: valor };
    setVariaveis(novasVars);
    
    const template = templates?.find(t => t.id === templateSelecionado);
    if (template) {
      setMensagem(substituirVariaveis(template.mensagem, novasVars));
    }
  };

  const handleEnviar = () => {
    const template = templates?.find(t => t.id === templateSelecionado);
    
    // Registrar interação
    registrarInteracao.mutate({
      clienteId: contato.clienteId,
      prospectId: contato.prospectId,
      templateNome: template?.nome || 'Mensagem manual',
      mensagem,
    });

    // Abrir WhatsApp
    const telefone = contato.telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    onOpenChange(false);
  };

  const categoriasMap: Record<string, string> = {
    primeiro_contato: 'Primeiro Contato',
    follow_up: 'Follow-up',
    proposta: 'Proposta',
    cobranca: 'Cobrança',
    agradecimento: 'Agradecimento',
    reativacao: 'Reativação',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar WhatsApp para {contato.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Selecione um Template</Label>
            <Select value={templateSelecionado} onValueChange={setTemplateSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um template ou escreva manualmente" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{categoriasMap[template.categoria]}</Badge>
                      {template.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {Object.keys(variaveis).length > 0 && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <Label>Variáveis do Template</Label>
              {Object.entries(variaveis).map(([chave, valor]) => (
                <div key={chave} className="space-y-1">
                  <Label className="text-sm text-muted-foreground capitalize">{chave}</Label>
                  <Input
                    value={valor}
                    onChange={(e) => handleVariavelChange(chave, e.target.value)}
                    placeholder={`Digite o valor para ${chave}`}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite ou edite a mensagem..."
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {mensagem.length} caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleEnviar}
            disabled={!mensagem.trim() || registrarInteracao.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}