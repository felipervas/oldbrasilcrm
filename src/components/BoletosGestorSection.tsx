import { useBoletosGestor } from '@/hooks/useBoletosGestor';
import { useFinanceiroBoletos } from '@/hooks/useFinanceiroBoletos';
import { useClientes } from '@/hooks/useClientes';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Clock, FileText, Plus, Upload, Check, Trash2 } from 'lucide-react';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function BoletosGestorSection() {
  const { data, isLoading } = useBoletosGestor();
  const { analisarBoleto, adicionarBoleto, marcarComoPago, deletarBoleto, isAdicionando } = useFinanceiroBoletos();
  const { data: clientesData } = useClientes();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [formData, setFormData] = useState({
    valor: '',
    data_vencimento: '',
    beneficiario: '',
    codigo_barras: '',
    arquivo_url: '',
    arquivo_nome: '',
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { boletos = [], pendentes = [], totais } = data || {};

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const resultado = await analisarBoleto(file);
      setFormData({
        valor: resultado.valor?.toString() || '',
        data_vencimento: resultado.dataVencimento || '',
        beneficiario: resultado.beneficiario || '',
        codigo_barras: resultado.codigoBarras || '',
        arquivo_url: resultado.arquivoUrl || '',
        arquivo_nome: resultado.arquivoNome || '',
      });
      toast.success('Boleto analisado com sucesso! Confira os dados.');
    } catch (error) {
      console.error('Erro ao analisar boleto:', error);
      toast.error('Análise falhou. Preencha os campos manualmente.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.valor || !formData.data_vencimento) {
      toast.error('Preencha pelo menos Valor e Vencimento');
      return;
    }

    try {
      await adicionarBoleto({
        valor: parseFloat(formData.valor),
        data_vencimento: formData.data_vencimento,
        beneficiario: formData.beneficiario,
        codigo_barras: formData.codigo_barras,
        descricao: 'Boleto adicionado',
        cliente_id: clienteSelecionado || null,
        arquivo_url: formData.arquivo_url || null,
        arquivo_nome: formData.arquivo_nome || null,
      });

      setDialogOpen(false);
      setFormData({
        valor: '',
        data_vencimento: '',
        beneficiario: '',
        codigo_barras: '',
        arquivo_url: '',
        arquivo_nome: '',
      });
      setClienteSelecionado('');
    } catch (error) {
      console.error('Erro ao adicionar boleto:', error);
    }
  };

  const handleMarcarPago = async (boletoId: string) => {
    try {
      await marcarComoPago(boletoId);
    } catch (error) {
      console.error('Erro ao marcar boleto como pago:', error);
    }
  };

  const handleRemover = async (boletoId: string) => {
    try {
      await deletarBoleto(boletoId);
    } catch (error) {
      console.error('Erro ao remover boleto:', error);
    }
  };

  const getStatusBadge = (boleto: any) => {
    if (boleto.status_pagamento === 'pago') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Pago</Badge>;
    }
    
    const vencimento = new Date(boleto.data_vencimento);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (isPast(vencimento) && vencimento < hoje) {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Vencido</Badge>;
    }
    
    if (isToday(vencimento)) {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Vence hoje</Badge>;
    }
    
    const diasRestantes = differenceInDays(vencimento, hoje);
    if (diasRestantes <= 7 && diasRestantes >= 0) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />Vence em {diasRestantes}d</Badge>;
    }
    
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header com botão */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">📄 Boletos a Receber</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Boleto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Boleto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="arquivo-boleto">Upload do Boleto (Opcional - PDF ou Imagem)</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="arquivo-boleto"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    disabled={uploading || isAdicionando}
                  />
                  {uploading && <Upload className="w-4 h-4 animate-spin" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  IA tentará extrair dados automaticamente. Você pode editar/preencher manualmente abaixo.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor">Valor (R$) *</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="vencimento">Vencimento *</Label>
                  <Input
                    id="vencimento"
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="beneficiario">Beneficiário</Label>
                <Input
                  id="beneficiario"
                  value={formData.beneficiario}
                  onChange={(e) => setFormData({ ...formData, beneficiario: e.target.value })}
                  placeholder="Nome do beneficiário"
                />
              </div>

              <div>
                <Label htmlFor="codigo-barras">Código de Barras</Label>
                <Input
                  id="codigo-barras"
                  value={formData.codigo_barras}
                  onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                  placeholder="Código do boleto"
                />
              </div>

              <div>
                <Label htmlFor="cliente-select">Cliente (Opcional)</Label>
                <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                  <SelectTrigger id="cliente-select">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesData?.data?.map((cliente: any) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome_fantasia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isAdicionando} className="w-full">
                {isAdicionando ? 'Salvando...' : 'Adicionar Boleto'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 border-green-500/20">
          <div className="text-sm text-muted-foreground mb-1">A Receber</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totais?.pendente || 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {pendentes.length} boleto{pendentes.length !== 1 ? 's' : ''}
          </div>
        </Card>

        <Card className="p-4 border-red-500/20">
          <div className="text-sm text-muted-foreground mb-1">Vencidos</div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(totais?.vencido || 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {totais?.qtdVencidos || 0} boleto{totais?.qtdVencidos !== 1 ? 's' : ''}
          </div>
        </Card>

        <Card className="p-4 border-yellow-500/20">
          <div className="text-sm text-muted-foreground mb-1">Próximos 7 Dias</div>
          <div className="text-2xl font-bold text-yellow-600">
            {formatCurrency(totais?.proximos7Dias || 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {totais?.qtdProximos7Dias || 0} boleto{totais?.qtdProximos7Dias !== 1 ? 's' : ''}
          </div>
        </Card>
      </div>

      {/* Lista de Boletos Pendentes */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground">Boletos Pendentes</h3>
        {pendentes.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum boleto pendente</p>
          </Card>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {pendentes.map((boleto: any) => (
              <Card key={boleto.id} className="p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(boleto)}
                      <span className="font-medium truncate">
                        {(boleto.clientes as any)?.nome_fantasia || 'Cliente não identificado'}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {boleto.descricao || 'Boleto'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Vencimento: {format(new Date(boleto.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right flex-1">
                      <div className="text-lg font-bold">
                        {formatCurrency(Number(boleto.valor))}
                      </div>
                      {boleto.beneficiario && (
                        <div className="text-xs text-muted-foreground">
                          {boleto.beneficiario}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarcarPago(boleto.id)}
                        className="gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Pago
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemover(boleto.id)}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}