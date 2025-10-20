import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, FileText, Plus, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as pdfjsLib from 'pdfjs-dist';

interface ProdutoItem {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  observacoes?: string;
}

const LancarPedido = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [produtosEscolhidos, setProdutosEscolhidos] = useState<ProdutoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedProduto, setSelectedProduto] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [precoUnitario, setPrecoUnitario] = useState(0);
  const [observacoesProduto, setObservacoesProduto] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [responsavelSelecionado, setResponsavelSelecionado] = useState("");
  const [responsavelOutro, setResponsavelOutro] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadClientes();
    loadProdutos();
    loadColaboradores();
  }, []);

  const loadColaboradores = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome")
      .order("nome");
    setColaboradores(data || []);
  };

  const loadClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome_fantasia, responsavel_id")
      .eq("ativo", true)
      .order("nome_fantasia");
    setClientes(data || []);
  };

  const handleClienteChange = async (clienteId: string) => {
    setSelectedCliente(clienteId);
    
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente?.responsavel_id) {
      setResponsavelSelecionado(cliente.responsavel_id);
    }
  };

  const loadProdutos = async () => {
    const { data } = await supabase
      .from("produtos")
      .select("id, nome, preco_base")
      .eq("ativo", true)
      .order("nome");
    setProdutos(data || []);
  };

  const calcularPrecoKilo = (produto: any) => {
    if (!produto.preco_base) return 0;
    
    const preco = parseFloat(produto.preco_base);
    
    // Se tem peso da unidade, calcular preço por kilo
    if (produto.peso_unidade_kg) {
      return preco / parseFloat(produto.peso_unidade_kg);
    }
    
    // Se tem rendimento por dose (ex: 30g para 1kg), calcular
    if (produto.rendimento_dose_gramas) {
      const dosesParaUmKg = 1000 / produto.rendimento_dose_gramas;
      return preco * dosesParaUmKg;
    }
    
    return preco;
  };

  const adicionarProduto = () => {
    if (!selectedProduto) {
      toast({ title: "Selecione um produto", variant: "destructive" });
      return;
    }

    const produto = produtos.find(p => p.id === selectedProduto);
    if (!produto) return;

    const novoProduto: ProdutoItem = {
      produto_id: selectedProduto,
      nome: produto.nome,
      quantidade: quantidade,
      preco_unitario: precoUnitario || produto.preco_base || 0,
      observacoes: observacoesProduto || undefined,
    };

    setProdutosEscolhidos([...produtosEscolhidos, novoProduto]);
    setSelectedProduto("");
    setQuantidade(1);
    setPrecoUnitario(0);
    setObservacoesProduto("");
  };

  const removerProduto = (index: number) => {
    setProdutosEscolhidos(produtosEscolhidos.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    return produtosEscolhidos.reduce((total, item) => 
      total + (item.quantidade * item.preco_unitario), 0
    );
  };

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedCliente) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }

    if (produtosEscolhidos.length === 0) {
      toast({ title: "Adicione pelo menos um produto", variant: "destructive" });
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const valorTotal = calcularTotal();
    
    // Criar descrição dos produtos
    const descricaoProdutos = produtosEscolhidos.map(p => 
      `${p.nome} - Qtd: ${p.quantidade} - R$ ${p.preco_unitario.toFixed(2)}`
    ).join('\n');

    // Determinar responsável final
    const responsavelFinal = responsavelSelecionado === 'outro' 
      ? responsavelOutro
      : responsavelSelecionado;

    const { error } = await supabase.from("pedidos").insert({
      cliente_id: selectedCliente,
      numero_pedido: formData.get("numero_pedido") as string || null,
      data_pedido: formData.get("data_pedido") as string || new Date().toISOString().split('T')[0],
      valor_total: valorTotal,
      status: formData.get("status") as string || "pendente",
      forma_pagamento: formData.get("forma_pagamento") as string || null,
      parcelas: formData.get("parcelas") ? parseInt(formData.get("parcelas") as string) : null,
      dias_pagamento: formData.get("dias_pagamento") as string || null,
      observacoes: `${descricaoProdutos}\n\n${formData.get("observacoes") || ""}`,
      responsavel_venda_id: responsavelFinal || null,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Erro ao criar pedido", variant: "destructive" });
    } else {
      toast({ title: "Pedido criado com sucesso!" });
      setProdutosEscolhidos([]);
      setSelectedCliente("");
      navigate("/pedidos");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        setPdfFile(file);
        toast({ title: "Arquivo carregado com sucesso!" });
      } else {
        toast({ 
          title: "Tipo de arquivo inválido", 
          description: "Apenas PDFs e imagens são aceitos",
          variant: "destructive" 
        });
      }
    }
  };

  const convertPdfToImage = async (file: File): Promise<string> => {
    // Configurar worker do PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    return new Promise(async (resolve, reject) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1); // Pega apenas a primeira página
        
        const viewport = page.getViewport({ scale: 1.5 }); // Escala otimizada para velocidade
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        } as any).promise;

        // Converter canvas para base64 com compressão otimizada
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(imageBase64);
      } catch (error) {
        reject(error);
      }
    });
  };

  const processPdfFile = async () => {
    if (!pdfFile) {
      toast({ title: "Selecione um arquivo PDF ou imagem", variant: "destructive" });
      return;
    }
    if (!selectedCliente) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }

    setUploadLoading(true);

    try {
      // 1. Upload do arquivo para o storage
      const fileName = `${Date.now()}_${pdfFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pedidos")
        .upload(fileName, pdfFile);

      if (uploadError) throw uploadError;

      // 2. Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from("pedidos")
        .getPublicUrl(fileName);

      // 3. Converter arquivo para imagem base64
      let imageBase64: string;
      
      if (pdfFile.type === 'application/pdf') {
        toast({ title: "Convertendo PDF em imagem...", description: "Isso pode levar alguns segundos" });
        imageBase64 = await convertPdfToImage(pdfFile);
      } else if (pdfFile.type.startsWith('image/')) {
        // Se já é imagem, apenas converter para base64
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(pdfFile);
        });
      } else {
        throw new Error('Tipo de arquivo não suportado');
      }

      toast({ title: "Processando com IA...", description: "Extraindo informações do pedido" });

      // 4. Chamar edge function para processar com IA
      const { data: aiData, error: aiError } = await supabase.functions.invoke('processar-pedido-pdf', {
        body: { 
          imageBase64: imageBase64,
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

      toast({ title: "Pedido extraído e criado com sucesso!" });
      setPdfFile(null);
      navigate("/pedidos");
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Erro ao processar arquivo", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const handlePdfUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await processPdfFile();
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
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cliente *</Label>
                    <Combobox
                      options={clientes.map(c => ({ value: c.id, label: c.nome_fantasia }))}
                      value={selectedCliente}
                      onValueChange={handleClienteChange}
                      placeholder="Selecione um cliente..."
                      searchPlaceholder="Buscar cliente..."
                      emptyText="Nenhum cliente encontrado."
                    />
                  </div>
                  <div>
                    <Label>Responsável pela Venda</Label>
                    <Select 
                      value={responsavelSelecionado} 
                      onValueChange={setResponsavelSelecionado}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar responsável..." />
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradores.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                        <SelectItem value="outro">➕ Outro (escrever)</SelectItem>
                      </SelectContent>
                    </Select>
                    {responsavelSelecionado === 'outro' && (
                      <Input 
                        className="mt-2"
                        placeholder="Nome do responsável"
                        value={responsavelOutro}
                        onChange={(e) => setResponsavelOutro(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Número do Pedido</Label>
                    <Input name="numero_pedido" placeholder="Ex: 001/2025" />
                  </div>
                  <div>
                    <Label>Data do Pedido</Label>
                    <Input type="date" name="data_pedido" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select name="status" defaultValue="pendente">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="entregue">Entregue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Informações de Frete</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo de Frete</Label>
                      <Select name="tipo_frete">
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CIF">CIF (Pago pelo vendedor)</SelectItem>
                          <SelectItem value="FOB">FOB (Pago pelo comprador)</SelectItem>
                          <SelectItem value="cliente">Cliente cuida do frete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Transportadora</Label>
                      <Input name="transportadora" placeholder="Nome da transportadora" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Informações de Pagamento</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label>Status</Label>
                      <Select name="status" defaultValue="pendente">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cotacao">Cotação</SelectItem>
                          <SelectItem value="pedido">Pedido</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="entregue">Entregue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Forma de Pagamento</Label>
                      <Select name="forma_pagamento">
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="cartao">Cartão</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Parcelas</Label>
                      <Input type="number" name="parcelas" min="1" placeholder="1" />
                    </div>
                    <div>
                      <Label>Dias para Pagamento</Label>
                      <Input name="dias_pagamento" placeholder="Ex: 30, 60, 90" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Produtos do Pedido</h3>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-5">
                        <Label className="text-xs">Produto</Label>
                        <Select value={selectedProduto} onValueChange={(v) => {
                          setSelectedProduto(v);
                          const prod = produtos.find(p => p.id === v);
                          if (prod?.preco_base) {
                            setPrecoUnitario(parseFloat(prod.preco_base));
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolher produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {produtos.map((produto) => (
                              <SelectItem key={produto.id} value={produto.id}>
                                {produto.nome}
                                {produto.peso_unidade_kg && ` (${produto.peso_unidade_kg}kg)`}
                                {produto.rendimento_dose_gramas && ` (${produto.rendimento_dose_gramas}g/kg)`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedProduto && (() => {
                          const prod = produtos.find(p => p.id === selectedProduto);
                          if (!prod) return null;
                          const precoKilo = calcularPrecoKilo(prod);
                          if (precoKilo === 0 || precoKilo === parseFloat(prod.preco_base || 0)) return null;
                          return (
                            <p className="text-xs text-muted-foreground mt-1">
                              {prod.rendimento_dose_gramas 
                                ? `Preço por kg (gelato): R$ ${precoKilo.toFixed(2)}`
                                : `Preço por kg: R$ ${precoKilo.toFixed(2)}`
                              }
                            </p>
                          );
                        })()}
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Qtd</Label>
                        <Input 
                          type="number" 
                          min="1"
                          value={quantidade}
                          onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Preço Unit.</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={precoUnitario}
                          onChange={(e) => setPrecoUnitario(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-2 flex items-end">
                        <Button type="button" onClick={adicionarProduto} className="w-full">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Observações do Produto</Label>
                      <Input
                        placeholder="Ex: Extra chocolate, sem açúcar..."
                        value={observacoesProduto}
                        onChange={(e) => setObservacoesProduto(e.target.value)}
                      />
                    </div>
                  </div>

                  {produtosEscolhidos.length > 0 && (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Qtd</TableHead>
                            <TableHead className="text-right">Preço</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {produtosEscolhidos.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div>
                                  <div>{item.nome}</div>
                                  {item.observacoes && (
                                    <div className="text-xs text-muted-foreground italic">
                                      Obs: {item.observacoes}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{item.quantidade}</TableCell>
                              <TableCell className="text-right">
                                R$ {item.preco_unitario.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removerProduto(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
                            <TableCell className="text-right font-bold text-primary text-lg">
                              R$ {calcularTotal().toFixed(2)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
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
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="pendente">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cotacao">Cotação</SelectItem>
                        <SelectItem value="pedido">Pedido</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_producao">Em Produção</SelectItem>
                        <SelectItem value="enviado">Enviado</SelectItem>
                        <SelectItem value="entregue">Entregue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                    <Select name="forma_pagamento">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faturamento">Faturamento</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                        <SelectItem value="avista">À Vista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parcelas">Parcelas</Label>
                    <Input 
                      id="parcelas" 
                      name="parcelas" 
                      type="number"
                      min="1"
                      placeholder="Ex: 3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dias_pagamento">Dias de Pagamento</Label>
                    <Input 
                      id="dias_pagamento" 
                      name="dias_pagamento" 
                      placeholder="Ex: 30/60/90"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea 
                    id="observacoes" 
                    name="observacoes" 
                    placeholder="Observações adicionais sobre o pedido..."
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={loading || produtosEscolhidos.length === 0} className="w-full">
                  {loading ? "Salvando..." : `Criar Pedido - R$ ${calcularTotal().toFixed(2)}`}
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
                  <Label>Cliente *</Label>
                  <Combobox
                    options={clientes.map(c => ({ value: c.id, label: c.nome_fantasia }))}
                    value={selectedCliente}
                    onValueChange={setSelectedCliente}
                    placeholder="Selecione um cliente..."
                    searchPlaceholder="Buscar cliente..."
                    emptyText="Nenhum cliente encontrado."
                  />
                </div>

                <div>
                  <Label htmlFor="pdf_file">Arquivo PDF ou Imagem *</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Arraste e solte o PDF/imagem aqui ou clique para selecionar
                    </p>
                    <Input 
                      id="pdf_file" 
                      type="file" 
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPdfFile(file);
                          toast({ title: "Arquivo carregado!" });
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => document.getElementById('pdf_file')?.click()}
                    >
                      Selecionar Arquivo
                    </Button>
                    {pdfFile && (
                      <p className="text-sm text-primary mt-3 font-medium">
                        ✓ {pdfFile.name}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    A IA extrairá automaticamente: número do pedido, data, cliente, produtos, quantidades, valores e total
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={uploadLoading || !pdfFile || !selectedCliente} 
                  className="w-full"
                >
                  {uploadLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando com IA...
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
