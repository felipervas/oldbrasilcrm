import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Upload, Loader2, Check, X, AlertCircle, DollarSign, Calendar } from "lucide-react";
import { useFinanceiroBoletos } from "@/hooks/useFinanceiroBoletos";
import { useClientes } from "@/hooks/useClientes";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";

export const FinanceiroBoletos = () => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dadosExtraidos, setDadosExtraidos] = useState<any>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("");
  
  const { boletos, isLoading, totais, analisarBoleto, adicionarBoleto, marcarComoPago, deletarBoleto, isAdicionando } = useFinanceiroBoletos();
  const { data: clientesData } = useClientes();
  const clientes = clientesData?.data || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const dados = await analisarBoleto(file);
      setDadosExtraidos(dados);
    } catch (error) {
      console.error('Erro ao analisar boleto:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!dadosExtraidos) return;

    adicionarBoleto({
      ...dadosExtraidos,
      cliente_id: clienteSelecionado || null,
    });

    setOpen(false);
    setDadosExtraidos(null);
    setClienteSelecionado("");
  };

  const getStatusBadge = (boleto: any) => {
    if (boleto.status_pagamento === 'pago') {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Pago</Badge>;
    }

    if (!boleto.data_vencimento) return null;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(boleto.data_vencimento);
    venc.setHours(0, 0, 0, 0);
    const diffDias = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (diffDias === 0) {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Vence hoje</Badge>;
    } else if (diffDias <= 7) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Vence em {diffDias}d</Badge>;
    }
    return <Badge variant="outline">Pendente</Badge>;
  };

  const clientesOptions = clientes.map(c => ({
    value: c.id,
    label: c.nome_fantasia,
  }));

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-primary">
                R$ {totais.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold text-success">
                R$ {totais.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{totais.vencidos}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Boletos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{boletos.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão Adicionar */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Boletos</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Boleto com IA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Boleto com Análise IA</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  Faça upload da imagem ou PDF do boleto. Nossa IA analisará automaticamente os dados.
                </AlertDescription>
              </Alert>

              <div>
                <Label>Upload do Boleto</Label>
                <Input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={handleFileUpload}
                  disabled={uploading || isAdicionando}
                />
              </div>

              {uploading && (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">Analisando boleto com IA...</span>
                </div>
              )}

              {dadosExtraidos && (
                <>
                  <Alert className="bg-success/10 border-success/20">
                    <Check className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">
                      Boleto analisado com sucesso! Confira os dados abaixo.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                    <div>
                      <Label>Cliente (Opcional)</Label>
                      <Combobox
                        options={clientesOptions}
                        value={clienteSelecionado}
                        onValueChange={setClienteSelecionado}
                        placeholder="Selecione um cliente (opcional)"
                        emptyText="Nenhum cliente encontrado"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Vincule a um cliente para rastreamento
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Valor</Label>
                        <div className="text-lg font-bold text-primary">
                          R$ {dadosExtraidos.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <Label>Vencimento</Label>
                        <div className="text-lg font-semibold">
                          {dadosExtraidos.data_vencimento ? new Date(dadosExtraidos.data_vencimento).toLocaleDateString('pt-BR') : 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Beneficiário</Label>
                      <div className="font-medium">{dadosExtraidos.beneficiario || 'N/A'}</div>
                    </div>

                    {dadosExtraidos.codigo_barras && (
                      <div>
                        <Label>Código de Barras</Label>
                        <div className="font-mono text-xs bg-background p-2 rounded border">
                          {dadosExtraidos.codigo_barras}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={handleSubmit} 
                    disabled={isAdicionando}
                    className="w-full"
                  >
                    {isAdicionando ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Confirmar e Salvar Boleto'
                    )}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Boletos */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Carregando boletos...</p>
        </div>
      ) : boletos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum boleto registrado</p>
            <p className="text-sm mt-2">Adicione um boleto para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {boletos.map((boleto) => (
            <Card key={boleto.id} className="border-primary/10 hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{boleto.beneficiario || boleto.descricao}</CardTitle>
                    {boleto.clientes && (
                      <p className="text-sm text-muted-foreground">
                        Cliente: {boleto.clientes.nome_fantasia}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(boleto)}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        R$ {Number(boleto.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Vencimento: {boleto.data_vencimento ? new Date(boleto.data_vencimento).toLocaleDateString('pt-BR') : 'N/A'}
                  </div>

                  {boleto.codigo_barras && (
                    <div className="text-xs font-mono bg-muted p-2 rounded">
                      {boleto.codigo_barras}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {boleto.status_pagamento === 'pendente' ? (
                      <>
                        <Button 
                          onClick={() => marcarComoPago(boleto.id)} 
                          size="sm"
                          variant="default"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Marcar como Pago
                        </Button>
                        <Button 
                          onClick={() => deletarBoleto(boleto.id)} 
                          size="sm"
                          variant="destructive"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remover
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline" className="bg-success/10 text-success">
                        <Check className="h-3 w-3 mr-1" />
                        Boleto Pago
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
