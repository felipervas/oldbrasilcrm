import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, FileText, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LancarPedido = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome_fantasia")
      .eq("ativo", true)
      .order("nome_fantasia");
    setClientes(data || []);
  };

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    const { error } = await supabase.from("pedidos").insert({
      cliente_id: selectedCliente,
      numero_pedido: formData.get("numero_pedido") as string || null,
      data_pedido: formData.get("data_pedido") as string || new Date().toISOString().split('T')[0],
      valor_total: parseFloat(formData.get("valor_total") as string) || 0,
      status: formData.get("status") as string || "pendente",
      observacoes: formData.get("observacoes") as string || null,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Erro ao criar pedido", variant: "destructive" });
    } else {
      toast({ title: "Pedido criado com sucesso!" });
      navigate("/pedidos");
    }
  };

  const handlePdfUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pdfFile) {
      toast({ title: "Selecione um arquivo PDF", variant: "destructive" });
      return;
    }

    setUploadLoading(true);

    try {
      // 1. Upload do PDF para o storage
      const fileName = `${Date.now()}_${pdfFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pedidos")
        .upload(fileName, pdfFile);

      if (uploadError) throw uploadError;

      // 2. Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from("pedidos")
        .getPublicUrl(fileName);

      // 3. Converter PDF para base64 para enviar à IA
      const reader = new FileReader();
      reader.readAsDataURL(pdfFile);
      
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;

          // 4. Chamar edge function para processar com IA
          const { data: aiData, error: aiError } = await supabase.functions.invoke('processar-pedido-pdf', {
            body: { 
              pdfBase64: base64Data,
              clienteId: selectedCliente,
              fileName: fileName
            }
          });

          if (aiError) throw aiError;

          // 5. Criar pedido com dados extraídos
          const { error: pedidoError } = await supabase.from("pedidos").insert({
            cliente_id: selectedCliente,
            numero_pedido: aiData.numero_pedido || null,
            data_pedido: aiData.data_pedido || new Date().toISOString().split('T')[0],
            valor_total: aiData.valor_total || 0,
            status: "pendente",
            observacoes: aiData.observacoes || null,
            arquivo_url: publicUrl,
            arquivo_nome: pdfFile.name,
          });

          if (pedidoError) throw pedidoError;

          toast({ title: "Pedido extraído do PDF e criado com sucesso!" });
          navigate("/pedidos");
        } catch (error: any) {
          console.error(error);
          toast({ 
            title: "Erro ao processar PDF", 
            description: error.message,
            variant: "destructive" 
          });
        } finally {
          setUploadLoading(false);
        }
      };
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Erro ao fazer upload", 
        description: error.message,
        variant: "destructive" 
      });
      setUploadLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Lançar Pedido
          </h1>
          <p className="text-muted-foreground">
            Adicione pedidos manualmente ou via PDF
          </p>
        </div>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="manual">
            <Plus className="h-4 w-4 mr-2" />
            Manual
          </TabsTrigger>
          <TabsTrigger value="pdf">
            <FileUp className="h-4 w-4 mr-2" />
            Upload PDF
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Lançamento Manual
              </CardTitle>
              <CardDescription>
                Preencha os dados do pedido manualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Select value={selectedCliente} onValueChange={setSelectedCliente} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome_fantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numero_pedido">Número do Pedido</Label>
                    <Input id="numero_pedido" name="numero_pedido" placeholder="Ex: PED-001" />
                  </div>
                  <div>
                    <Label htmlFor="data_pedido">Data do Pedido</Label>
                    <Input 
                      id="data_pedido" 
                      name="data_pedido" 
                      type="date" 
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valor_total">Valor Total *</Label>
                    <Input 
                      id="valor_total" 
                      name="valor_total" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="pendente">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_producao">Em Produção</SelectItem>
                        <SelectItem value="enviado">Enviado</SelectItem>
                        <SelectItem value="entregue">Entregue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea 
                    id="observacoes" 
                    name="observacoes" 
                    placeholder="Observações sobre o pedido..."
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Salvando..." : "Criar Pedido"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdf">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-primary" />
                Upload de PDF com IA
              </CardTitle>
              <CardDescription>
                Faça upload de um PDF e a IA extrairá os dados do pedido automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePdfUpload} className="space-y-4">
                <div>
                  <Label htmlFor="cliente_pdf">Cliente *</Label>
                  <Select value={selectedCliente} onValueChange={setSelectedCliente} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome_fantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pdf_file">Arquivo PDF *</Label>
                  <Input 
                    id="pdf_file" 
                    type="file" 
                    accept=".pdf"
                    required
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A IA irá extrair número do pedido, data, valor e observações do PDF
                  </p>
                </div>

                <Button type="submit" disabled={uploadLoading} className="w-full">
                  {uploadLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando PDF...
                    </>
                  ) : (
                    "Processar e Criar Pedido"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LancarPedido;
