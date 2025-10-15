import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Upload, Plus, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const FinanceiroBoletos = () => {
  const [boletos, setBoletos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadBoletos = async () => {
    const { data } = await supabase
      .from("financeiro")
      .select("*")
      .eq("tipo_transacao", "boleto")
      .order("data_vencimento", { ascending: true });
    
    setBoletos(data || []);
    checkVencimentos(data || []);
  };

  const checkVencimentos = async (boletos: any[]) => {
    const hoje = new Date();
    const amanha = new Date();
    amanha.setDate(hoje.getDate() + 1);

    const boletosProximos = boletos.filter(b => {
      if (b.status_pagamento !== 'pendente' || !b.data_vencimento) return false;
      const venc = new Date(b.data_vencimento);
      return venc <= amanha && venc >= hoje;
    });

    if (boletosProximos.length > 0) {
      toast({
        title: "⚠️ Boletos próximos do vencimento",
        description: `${boletosProximos.length} boleto(s) vencem hoje ou amanhã`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadBoletos();
  }, []);

  const extractBoletoInfo = (text: string) => {
    // Extração básica de informações do boleto
    const codigoBarras = text.match(/\d{5}\.\d{5}\s\d{5}\.\d{6}\s\d{5}\.\d{6}\s\d\s\d{14}/)?.[0] || "";
    const valor = text.match(/R\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/)?.[1] || "";
    const vencimento = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || "";
    
    return { codigoBarras, valor, vencimento };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // Upload do arquivo
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pedidos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("pedidos")
        .getPublicUrl(fileName);

      // Tentar extrair texto do PDF (simplificado)
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const text = event.target?.result as string;
          const info = extractBoletoInfo(text);
          
          // Preencher campos automaticamente
          const valorNumerico = info.valor.replace(/\./g, '').replace(',', '.');
          document.getElementById('valor_boleto')?.setAttribute('value', valorNumerico);
          document.getElementById('codigo_barras')?.setAttribute('value', info.codigoBarras);
          
          if (info.vencimento) {
            const [dia, mes, ano] = info.vencimento.split('/');
            document.getElementById('data_vencimento')?.setAttribute('value', `${ano}-${mes}-${dia}`);
          }
        };
        reader.readAsText(file);
      }

      toast({ title: "Arquivo carregado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao fazer upload", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const formData = new FormData(e.currentTarget);
      
      const { error } = await supabase.from("financeiro").insert({
        tipo: "despesa",
        tipo_transacao: "boleto",
        descricao: formData.get("descricao") as string,
        valor: parseFloat(formData.get("valor_boleto") as string),
        valor_boleto: parseFloat(formData.get("valor_boleto") as string),
        data: formData.get("data") as string,
        data_vencimento: formData.get("data_vencimento") as string,
        codigo_barras: formData.get("codigo_barras") as string,
        beneficiario: formData.get("beneficiario") as string,
        observacoes: formData.get("observacoes") as string,
        usuario_id: user.id,
        status_pagamento: "pendente",
      });

      if (error) throw error;

      toast({ title: "Boleto registrado com sucesso!" });
      setOpen(false);
      loadBoletos();
    } catch (error: any) {
      toast({ title: "Erro ao registrar boleto", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const marcarComoPago = async (id: string) => {
    const { error } = await supabase
      .from("financeiro")
      .update({ status_pagamento: "pago" })
      .eq("id", id);

    if (!error) {
      toast({ title: "Boleto marcado como pago!" });
      loadBoletos();
    }
  };

  const hoje = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Boletos</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Boleto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Boleto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Upload do Boleto (PDF)</Label>
                <Input type="file" accept=".pdf,.jpg,.png" onChange={handleFileUpload} />
                <p className="text-xs text-muted-foreground mt-1">
                  Faça upload do boleto para extração automática de dados
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor_boleto">Valor *</Label>
                  <Input id="valor_boleto" name="valor_boleto" type="number" step="0.01" required />
                </div>
                <div>
                  <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
                  <Input id="data_vencimento" name="data_vencimento" type="date" required />
                </div>
              </div>
              <div>
                <Label htmlFor="beneficiario">Beneficiário *</Label>
                <Input id="beneficiario" name="beneficiario" required />
              </div>
              <div>
                <Label htmlFor="codigo_barras">Código de Barras</Label>
                <Input id="codigo_barras" name="codigo_barras" />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição *</Label>
                <Input id="descricao" name="descricao" required />
              </div>
              <div>
                <Label htmlFor="data">Data de Registro</Label>
                <Input id="data" name="data" type="date" defaultValue={hoje} />
              </div>
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea id="observacoes" name="observacoes" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Registrar Boleto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {boletos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum boleto registrado</p>
            </CardContent>
          </Card>
        ) : (
          boletos.map((boleto) => {
            const venc = new Date(boleto.data_vencimento);
            const diffDias = Math.ceil((venc.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const vencido = diffDias < 0;
            const proximo = diffDias <= 1 && diffDias >= 0;

            return (
              <Card key={boleto.id} className={vencido ? "border-destructive" : proximo ? "border-orange-500" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{boleto.beneficiario}</span>
                    <span className="text-lg font-bold">R$ {parseFloat(boleto.valor_boleto).toFixed(2)}</span>
                  </CardTitle>
                  <CardDescription>{boleto.descricao}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(vencido || proximo) && boleto.status_pagamento === 'pendente' && (
                      <Alert variant={vencido ? "destructive" : "default"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {vencido ? "VENCIDO!" : "Vence amanhã!"}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      Vencimento: {new Date(boleto.data_vencimento).toLocaleDateString('pt-BR')}
                    </div>
                    {boleto.codigo_barras && (
                      <p className="text-xs text-muted-foreground font-mono">{boleto.codigo_barras}</p>
                    )}
                    <div className="flex gap-2 mt-4">
                      {boleto.status_pagamento === 'pendente' ? (
                        <Button onClick={() => marcarComoPago(boleto.id)} size="sm">
                          Marcar como Pago
                        </Button>
                      ) : (
                        <span className="text-green-600 font-semibold">✓ Pago</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};