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
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dadosExtraidos, setDadosExtraidos] = useState<any>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');

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

    setArquivo(file);
    setUploading(true);

    try {
      const resultado = await analisarBoleto(file);
      setDadosExtraidos(resultado);
      toast.success('Boleto analisado com sucesso!');
    } catch (error) {
      console.error('Erro ao analisar boleto:', error);
      toast.error('Erro ao analisar o boleto. Verifique o arquivo e tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!dadosExtraidos) return;

    try {
      await adicionarBoleto({
        valor: dadosExtraidos.valor || 0,
        data_vencimento: dadosExtraidos.dataVencimento || new Date().toISOString().split('T')[0],
        beneficiario: dadosExtraidos.beneficiario || '',
        codigo_barras: dadosExtraidos.codigoBarras || '',
        descricao: 'Boleto importado via IA',
        cliente_id: clienteSelecionado || null,
        arquivo_url: dadosExtraidos.arquivoUrl || null,
        arquivo_nome: dadosExtraidos.arquivoNome || null,
      });

      setDialogOpen(false);
      setArquivo(null);
      setDadosExtraidos(null);
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
              Novo Boleto com IA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Boleto com IA</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="arquivo-boleto">Upload do Boleto (PDF ou Imagem)</Label>
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
              </div>

              {dadosExtraidos && (
                <>
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <h3 className="font-semibold text-sm">Dados Extraídos pela IA:</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="ml-2 font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosExtraidos.valor || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vencimento:</span>
                        <span className="ml-2 font-medium">
                          {dadosExtraidos.dataVencimento ? format(new Date(dadosExtraidos.dataVencimento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Beneficiário:</span>
                        <span className="ml-2 font-medium">{dadosExtraidos.beneficiario || '-'}</span>
                      </div>
                      {dadosExtraidos.codigoBarras && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Código de Barras:</span>
                          <span className="ml-2 font-mono text-xs">{dadosExtraidos.codigoBarras}</span>
                        </div>
                      )}
                    </div>
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

                  <Button onClick={handleSubmit} disabled={isAdicionando} className="w-full">
                    {isAdicionando ? 'Salvando...' : 'Confirmar e Adicionar Boleto'}
                  </Button>
                </>
              )}
            </div>
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