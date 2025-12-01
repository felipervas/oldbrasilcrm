import { useState } from 'react';
import { useClienteBoletos } from '@/hooks/useClienteBoletos';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Calendar, Check, DollarSign, FileText, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClienteBoletosProps {
  clienteId: string;
}

export function ClienteBoletos({ clienteId }: ClienteBoletosProps) {
  const { boletos, totais, analisarBoleto, adicionarBoleto, marcarComoPago, deletarBoleto, isAdicionando } = useClienteBoletos(clienteId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data_vencimento: '',
    beneficiario: '',
    codigo_barras: '',
    arquivo_url: '',
    arquivo_nome: '',
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalisando(true);
    try {
      const resultado = await analisarBoleto(file);
      setFormData({
        ...formData,
        valor: resultado.valor?.toString() || '',
        data_vencimento: resultado.data_vencimento || '',
        beneficiario: resultado.beneficiario || '',
        codigo_barras: resultado.codigo_barras || '',
        arquivo_url: resultado.arquivo_url || '',
        arquivo_nome: resultado.arquivo_nome || '',
      });
    } catch (error: any) {
      console.error('Erro ao analisar:', error);
    } finally {
      setAnalisando(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adicionarBoleto(formData);
    setDialogOpen(false);
    setFormData({
      descricao: '',
      valor: '',
      data_vencimento: '',
      beneficiario: '',
      codigo_barras: '',
      arquivo_url: '',
      arquivo_nome: '',
    });
  };

  const getStatusBadge = (boleto: any) => {
    if (boleto.status_pagamento === 'pago') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><Check className="w-3 h-3 mr-1" />Pago</Badge>;
    }
    
    const vencimento = new Date(boleto.data_vencimento);
    if (isPast(vencimento)) {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Vencido</Badge>;
    }
    
    if (isToday(vencimento)) {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Vence hoje</Badge>;
    }
    
    const diasRestantes = differenceInDays(vencimento, new Date());
    if (diasRestantes <= 7) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Vence em {diasRestantes}d</Badge>;
    }
    
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total a Receber</div>
          <div className="text-2xl font-bold text-green-600">
            R$ {totais.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Recebido</div>
          <div className="text-2xl font-bold">
            R$ {totais.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Vencidos</div>
          <div className="text-2xl font-bold text-red-600">{totais.vencidos}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total de Boletos</div>
          <div className="text-2xl font-bold">{boletos.length}</div>
        </Card>
      </div>

      {/* Botão Adicionar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Boleto
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Boleto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Upload do Boleto (PDF/Imagem)</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                disabled={analisando}
              />
              {analisando && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  IA analisando boleto...
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Beneficiário</Label>
              <Input
                value={formData.beneficiario}
                onChange={(e) => setFormData({ ...formData, beneficiario: e.target.value })}
              />
            </div>

            <div>
              <Label>Código de Barras</Label>
              <Input
                value={formData.codigo_barras}
                onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Observações adicionais..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={isAdicionando}>
              {isAdicionando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Adicionar Boleto
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lista de Boletos */}
      <div className="space-y-2">
        {boletos.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum boleto cadastrado</p>
          </Card>
        ) : (
          boletos.map((boleto) => (
            <Card key={boleto.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(boleto)}
                    {boleto.arquivo_nome && (
                      <Badge variant="outline" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        Arquivo
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">Valor</div>
                      <div className="font-semibold text-lg">
                        R$ {Number(boleto.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Vencimento</div>
                      <div className="font-medium">
                        {format(new Date(boleto.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                  </div>

                  {boleto.beneficiario && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Beneficiário: </span>
                      {boleto.beneficiario}
                    </div>
                  )}

                  {boleto.descricao && (
                    <div className="text-sm text-muted-foreground">{boleto.descricao}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  {boleto.status_pagamento === 'pendente' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => marcarComoPago(boleto.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletarBoleto(boleto.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}