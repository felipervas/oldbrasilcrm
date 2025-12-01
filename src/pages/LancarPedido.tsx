import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, FileText, Plus, Loader2, Trash2, AlertCircle, Edit2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { QuickClienteDialog } from "@/components/QuickClienteDialog";
import { QuickProdutoDialog } from "@/components/QuickProdutoDialog";
import { Badge } from "@/components/ui/badge";

interface ProdutoItem {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  observacoes?: string;
  tabela_preco_id?: string;
  tabela_preco_nome?: string;
}

const LancarPedido = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [precoUnitario, setPrecoUnitario] = useState(0);
  const [precoOriginalProduto, setPrecoOriginalProduto] = useState(0);
  const [observacoesProduto, setObservacoesProduto] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tabelasProduto, setTabelasProduto] = useState<any[]>([]);
  const [tabelaSelecionada, setTabelaSelecionada] = useState("");
  const [isVendidoPorKg, setIsVendidoPorKg] = useState(false);
  const [editandoProduto, setEditandoProduto] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({ quantidade: 0, preco_unitario: 0, preco_total: 0 });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Persistência de dados do formulário
  const [selectedCliente, setSelectedCliente, clearSelectedCliente, hasRestoredCliente] = 
    useFormPersistence<string>('pedido_cliente', '');
  const [produtosEscolhidos, setProdutosEscolhidos, clearProdutosEscolhidos, hasRestoredProdutos] = 
    useFormPersistence<ProdutoItem[]>('pedido_produtos', []);
  const [responsavelSelecionado, setResponsavelSelecionado, clearResponsavel, hasRestoredResponsavel] = 
    useFormPersistence<string>('pedido_responsavel', '');
  const [responsavelOutro, setResponsavelOutro, clearResponsavelOutro] = 
    useFormPersistence<string>('pedido_responsavel_outro', '');
  
  const hasRestoredData = hasRestoredCliente || hasRestoredProdutos || hasRestoredResponsavel;

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
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome_fantasia, razao_social, cnpj_cpf, telefone, email, logradouro, numero, cidade, uf, cep, responsavel_id")
        .eq("ativo", true)
        .order("nome_fantasia");
      
      if (error) {
        console.error("Erro ao carregar clientes:", error);
        toast({
          title: "Erro ao carregar clientes",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      console.log("Clientes carregados:", data?.length || 0);
      setClientes(data || []);
    } catch (err) {
      console.error("Erro inesperado ao carregar clientes:", err);
      toast({
        title: "Erro ao carregar clientes",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    }
  };

  const handleClienteChange = async (clienteId: string) => {
    setSelectedCliente(clienteId);
    
    // Carregar dados completos do cliente com endereço
    const { data: clienteCompleto } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", clienteId)
      .single();
    
    if (clienteCompleto?.responsavel_id) {
      setResponsavelSelecionado(clienteCompleto.responsavel_id);
    }
    
    // Atualizar a lista de clientes com os dados completos
    setClientes(prev => prev.map(c => 
      c.id === clienteId ? clienteCompleto : c
    ));
  };

  const loadProdutos = async () => {
    const { data } = await supabase
      .from("produtos")
      .select(`
        id, 
        nome, 
        preco_base, 
        preco_por_kg, 
        peso_embalagem_kg, 
        rendimento_dose_gramas,
        tipo_venda,
        marcas(nome)
      `)
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

    if (quantidade < 0) {
      toast({ title: "Quantidade não pode ser negativa", variant: "destructive" });
      return;
    }

    if (precoUnitario < 0) {
      toast({ title: "Preço não pode ser negativo", variant: "destructive" });
      return;
    }

    const produto = produtos.find(p => p.id === selectedProduto);
    if (!produto) return;

    const tabelaUsada = tabelasProduto.find(t => t.id === tabelaSelecionada);

    const novoProduto: ProdutoItem = {
      produto_id: selectedProduto,
      nome: produto.nome,
      quantidade: quantidade,
      preco_unitario: precoUnitario || produto.preco_base || 0,
      observacoes: observacoesProduto || undefined,
      tabela_preco_id: tabelaSelecionada || undefined,
      tabela_preco_nome: tabelaUsada?.nome_tabela || undefined,
    };

    setProdutosEscolhidos([...produtosEscolhidos, novoProduto]);
    setSelectedProduto("");
    setQuantidade(1);
    setPrecoUnitario(0);
    setObservacoesProduto("");
    setTabelasProduto([]);
    setTabelaSelecionada("");
    setIsVendidoPorKg(false);
  };

  const removerProduto = (index: number) => {
    setProdutosEscolhidos(produtosEscolhidos.filter((_, i) => i !== index));
  };

  const iniciarEdicao = (index: number, produto: ProdutoItem) => {
    setEditandoProduto(index);
    setEditValues({
      quantidade: produto.quantidade,
      preco_unitario: produto.preco_unitario,
      preco_total: produto.quantidade * produto.preco_unitario,
    });
  };

  const cancelarEdicao = () => {
    setEditandoProduto(null);
  };

  const salvarEdicao = (index: number) => {
    setProdutosEscolhidos(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        quantidade: editValues.quantidade,
        preco_unitario: editValues.preco_unitario,
      };
    }));
    setEditandoProduto(null);
  };

  const handleEditQuantidade = (valor: number) => {
    setEditValues(prev => ({
      quantidade: valor,
      preco_unitario: prev.preco_unitario,
      preco_total: valor * prev.preco_unitario,
    }));
  };

  const handleEditPrecoUnitario = (valor: number) => {
    setEditValues(prev => ({
      quantidade: prev.quantidade,
      preco_unitario: valor,
      preco_total: prev.quantidade * valor,
    }));
  };

  const handleEditPrecoTotal = (valor: number) => {
    setEditValues(prev => ({
      quantidade: prev.quantidade,
      preco_unitario: prev.quantidade > 0 ? valor / prev.quantidade : 0,
      preco_total: valor,
    }));
  };

  const calcularDiferencaPreco = (produto: ProdutoItem): { tipo: 'desconto' | 'acrescimo' | null, percentual: number } => {
    const prodOriginal = produtos.find(p => p.id === produto.produto_id);
    if (!prodOriginal) return { tipo: null, percentual: 0 };

    const precoOriginal = prodOriginal.preco_por_kg || prodOriginal.preco_base || 0;
    if (precoOriginal === 0) return { tipo: null, percentual: 0 };

    const diferenca = ((produto.preco_unitario - precoOriginal) / precoOriginal) * 100;
    
    if (Math.abs(diferenca) < 1) return { tipo: null, percentual: 0 };
    if (diferenca < 0) return { tipo: 'desconto', percentual: Math.abs(diferenca) };
    return { tipo: 'acrescimo', percentual: diferenca };
  };

  const handleClienteCreated = async (clienteId: string) => {
    await loadClientes();
    setSelectedCliente(clienteId);
  };

  const handleProdutoCreated = async (produtoId: string) => {
    await loadProdutos();
    setSelectedProduto(produtoId);
  };

  const atualizarPrecoProduto = async () => {
    if (!selectedProduto || !tabelaSelecionada) {
      toast({ 
        title: "Erro", 
        description: "Selecione um produto e uma tabela de preço",
        variant: "destructive" 
      });
      return;
    }

    try {
      const prod = produtos.find(p => p.id === selectedProduto);
      const vendePorKg = (prod as any)?.tipo_venda === 'kg';
      
      // Calcular preço por kg baseado no que foi digitado
      let precoPorKg = precoUnitario;
      
      if (!vendePorKg && prod?.peso_embalagem_kg) {
        // Se vende por caixa, converter o preço da caixa para kg
        precoPorKg = precoUnitario / prod.peso_embalagem_kg;
      }

      const { error } = await supabase
        .from('produto_tabelas_preco')
        .update({ preco_por_kg: precoPorKg })
        .eq('id', tabelaSelecionada);

      if (error) throw error;

      // Atualizar a lista local de tabelas
      setTabelasProduto(prev => 
        prev.map(t => t.id === tabelaSelecionada ? { ...t, preco_por_kg: precoPorKg } : t)
      );

      // Atualizar o preço original para não mostrar mais o alerta
      setPrecoOriginalProduto(precoUnitario);

      toast({ 
        title: "Preço atualizado!", 
        description: `Tabela de preço atualizada: R$ ${precoPorKg.toFixed(2)}/kg`
      });
    } catch (error: any) {
      toast({ 
        title: "Erro ao atualizar preço", 
        description: error.message,
        variant: "destructive" 
      });
    }
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

    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const valorTotal = calcularTotal();
      
      // 🆕 GERAR NÚMERO AUTOMÁTICO DE PEDIDO
      let numeroPedido = formData.get("numero_pedido") as string;
      
      if (!numeroPedido) {
        const { data: ultimoPedido } = await supabase
          .from("pedidos")
          .select("numero_pedido")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        let proximoNumero = 1;
        if (ultimoPedido?.numero_pedido) {
          const match = ultimoPedido.numero_pedido.match(/\d+/);
          if (match) {
            proximoNumero = parseInt(match[0]) + 1;
          }
        }
        
        numeroPedido = `PED-${String(proximoNumero).padStart(4, '0')}`;
        console.log(`✅ Número gerado automaticamente: ${numeroPedido}`);
      }
      
      // Criar descrição dos produtos
      const descricaoProdutos = produtosEscolhidos.map(p => 
        `${p.nome} - Qtd: ${p.quantidade} - R$ ${p.preco_unitario.toFixed(2)}`
      ).join('\n');

      // Determinar responsável final
      const responsavelFinal = responsavelSelecionado === 'outro' 
        ? responsavelOutro
        : responsavelSelecionado;

      const observacoesInternas = formData.get("observacoes_internas") as string || null;


      // Inserir pedido
      const { data: pedidoInserido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          cliente_id: selectedCliente,
          numero_pedido: numeroPedido,
          data_pedido: formData.get("data_pedido") as string || new Date().toISOString().split('T')[0],
          valor_total: valorTotal,
          status: formData.get("status") as string || "pendente",
          forma_pagamento: formData.get("forma_pagamento") as string || null,
          parcelas: formData.get("parcelas") ? parseInt(formData.get("parcelas") as string) : null,
          dias_pagamento: formData.get("dias_pagamento") as string || null,
          tipo_frete: formData.get("tipo_frete") as string || null,
          transportadora: formData.get("transportadora") as string || null,
          observacoes: formData.get("observacoes") as string || null,
          observacoes_internas: observacoesInternas || null,
          responsavel_venda_id: responsavelFinal || null,
          observacoes_entrega: formData.get("observacoes_entrega") as string || null,
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Inserir produtos do pedido
      const produtosInsert = produtosEscolhidos.map(p => ({
        pedido_id: pedidoInserido.id,
        produto_id: p.produto_id,
        quantidade: p.quantidade,
        preco_unitario: p.preco_unitario,
        observacoes: p.observacoes || null,
        tabela_preco_id: p.tabela_preco_id || null,
      }));

      const { error: produtosError } = await supabase
        .from("pedidos_produtos")
        .insert(produtosInsert);

      if (produtosError) throw produtosError;

      toast({ 
        title: `Pedido ${numeroPedido} criado com sucesso!`,
        description: `Total: R$ ${valorTotal.toFixed(2)}`
      });
      
      // Limpar dados persistidos após sucesso
      clearSelectedCliente();
      clearProdutosEscolhidos();
      clearResponsavel();
      clearResponsavelOutro();
      
      navigate("/pedidos");
    } catch (error: any) {
      console.error("❌ Erro ao criar pedido:", error);
      toast({ 
        title: "Erro ao criar pedido", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
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
    // Lazy load PDF.js APENAS quando necessário
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configurar worker do PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();

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
                {hasRestoredData && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      💡 Dados do último pedido foram restaurados automaticamente
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cliente *</Label>
                    <div className="flex items-center">
                      <Combobox
                        options={clientes.map(c => ({ value: c.id, label: c.nome_fantasia }))}
                        value={selectedCliente}
                        onValueChange={handleClienteChange}
                        placeholder="Selecione um cliente..."
                        searchPlaceholder="Buscar cliente..."
                        emptyText="Nenhum cliente encontrado."
                      />
                      <QuickClienteDialog onClienteCreated={handleClienteCreated} />
                    </div>
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

                {/* Dados do Cliente - Editáveis */}
                {selectedCliente && (() => {
                  const cliente = clientes.find(c => c.id === selectedCliente);
                  if (!cliente) return null;
                  
                  return (
                    <div className="bg-muted/50 border rounded-lg p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <span>📋</span>
                        Dados do Cliente (editáveis para este pedido)
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Razão Social / Nome Fantasia</Label>
                          <Input 
                            name="cliente_razao_social_override"
                            defaultValue={cliente.razao_social || cliente.nome_fantasia || ''}
                            placeholder="Sobrescrever razão social..."
                          />
                        </div>
                        <div>
                          <Label>CNPJ/CPF</Label>
                          <Input 
                            name="cliente_cnpj_override"
                            defaultValue={cliente.cnpj_cpf || ''}
                            placeholder="Sobrescrever CNPJ/CPF..."
                          />
                        </div>
                        <div>
                          <Label>Endereço</Label>
                          <Input 
                            name="cliente_endereco_override"
                            defaultValue={cliente.logradouro 
                              ? `${cliente.logradouro}${cliente.numero ? ', ' + cliente.numero : ''}`
                              : ''}
                            placeholder="Sobrescrever endereço..."
                          />
                        </div>
                        <div>
                          <Label>Cidade / UF</Label>
                          <Input 
                            name="cliente_cidade_uf_override"
                            defaultValue={cliente.cidade && cliente.uf ? `${cliente.cidade} - ${cliente.uf}` : ''}
                            placeholder="Sobrescrever cidade/UF..."
                          />
                        </div>
                        <div>
                          <Label>Telefone</Label>
                          <Input 
                            name="cliente_telefone_override"
                            defaultValue={cliente.telefone || ''}
                            placeholder="Sobrescrever telefone..."
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input 
                            name="cliente_email_override"
                            defaultValue={cliente.email || ''}
                            placeholder="Sobrescrever email..."
                            type="email"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Contato Responsável pela Compra</Label>
                          <Input 
                            name="cliente_contato_responsavel"
                            placeholder="Nome e telefone do responsável na empresa..."
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 Estes campos permitem ajustar informações específicas para este pedido sem alterar o cadastro do cliente.
                      </p>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numero_pedido">
                      Número do Pedido 
                      <span className="text-xs text-muted-foreground ml-2">(Opcional - será gerado automaticamente)</span>
                    </Label>
                    <Input 
                      id="numero_pedido"
                      name="numero_pedido" 
                      placeholder="Ex: PED-0042 (deixe vazio para gerar automaticamente)" 
                    />
                  </div>
                  <div>
                    <Label>Data do Pedido</Label>
                    <Input type="date" name="data_pedido" defaultValue={new Date().toISOString().split('T')[0]} />
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
                  <h3 className="font-semibold mb-3">Informações de Entrega</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Prazo de Entrega (opcional)</Label>
                      <Input name="prazo_entrega" placeholder="Ex: 5 dias úteis, 2 semanas..." />
                    </div>
                    <div>
                      <Label>Previsão de Entrega (opcional)</Label>
                      <Input type="date" name="data_previsao_entrega" />
                    </div>
                    <div className="col-span-2">
                      <Label>Observações de Entrega (opcional)</Label>
                      <Input name="observacoes_entrega" placeholder="Ex: Entregar pela manhã, avisar com antecedência..." />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Produtos do Pedido</h3>
                  
                    <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-2">
                         <div className="col-span-4">
                          <Label className="text-xs">Produto</Label>
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <Combobox
                                options={produtos.map(p => ({
                                  value: p.id,
                                  label: `${p.nome}${(p as any).marcas?.nome ? ` - ${(p as any).marcas.nome}` : ''}`
                                }))}
                                value={selectedProduto}
                                onValueChange={async (v) => {
                                  setSelectedProduto(v);
                                  const prod = produtos.find(p => p.id === v);
                                  
                                  // Usar o campo tipo_venda do produto
                                  const vendePorKg = (prod as any)?.tipo_venda === 'kg';
                                  setIsVendidoPorKg(vendePorKg);
                                  
                                  // Carregar tabelas deste produto
                                  const { data: tabelas } = await supabase
                                    .from('produto_tabelas_preco')
                                    .select('*')
                                    .eq('produto_id', v)
                                    .eq('ativo', true)
                                    .order('nome_tabela');
                                  
                                  setTabelasProduto(tabelas || []);
                                  setTabelaSelecionada("");
                                  
                                  // Definir preço baseado no tipo de venda
                                  if (tabelas && tabelas.length > 0) {
                                    setTabelaSelecionada(tabelas[0].id);
                                    
                                    // Se produto não tem preco_por_kg e vende por unidade, 
                                    // então o preço da tabela JÁ É o preço total
                                    const precoJaETotal = !prod?.preco_por_kg && !vendePorKg;
                                    
                                    if (vendePorKg) {
                                      // Vendido por kg: usar preço por kg direto
                                      const preco = tabelas[0].preco_por_kg;
                                      setPrecoUnitario(preco);
                                      setPrecoOriginalProduto(preco);
                                    } else if (precoJaETotal) {
                                      // Preço da tabela já é o total da caixa
                                      const preco = tabelas[0].preco_por_kg;
                                      setPrecoUnitario(preco);
                                      setPrecoOriginalProduto(preco);
                                    } else {
                                      // Vendido por caixa: calcular preço (kg * peso)
                                      const pesoEmb = prod?.peso_embalagem_kg || 1;
                                      const preco = tabelas[0].preco_por_kg * pesoEmb;
                                      setPrecoUnitario(preco);
                                      setPrecoOriginalProduto(preco);
                                    }
                                  } else if (prod?.preco_por_kg) {
                                    if (vendePorKg) {
                                      const preco = parseFloat(prod.preco_por_kg);
                                      setPrecoUnitario(preco);
                                      setPrecoOriginalProduto(preco);
                                    } else {
                                      const pesoEmb = prod?.peso_embalagem_kg || 1;
                                      const preco = parseFloat(prod.preco_por_kg) * pesoEmb;
                                      setPrecoUnitario(preco);
                                      setPrecoOriginalProduto(preco);
                                    }
                                  } else if (prod?.preco_base) {
                                    const preco = parseFloat(prod.preco_base);
                                    setPrecoUnitario(preco);
                                    setPrecoOriginalProduto(preco);
                                  }
                                }}
                                placeholder="Buscar produto..."
                                searchPlaceholder="Digite pistache, chocolate..."
                                emptyText="Nenhum produto encontrado."
                              />
                            </div>
                            <QuickProdutoDialog onProdutoCreated={handleProdutoCreated} />
                          </div>
                          {selectedProduto && (() => {
                            const prod = produtos.find(p => p.id === selectedProduto);
                            if (!prod) return null;
                            const vendePorKg = (prod as any)?.tipo_venda === 'kg';
                            
                            return (
                              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                {prod.preco_por_kg && (
                                  <p>💰 Preço/kg: R$ {parseFloat(prod.preco_por_kg).toFixed(2)}</p>
                                )}
                                {prod.rendimento_dose_gramas && (
                                  <p>📊 Rendimento: {prod.rendimento_dose_gramas}g/dose</p>
                                )}
                                {prod.peso_embalagem_kg ? (
                                  <p>📦 Embalagem: {prod.peso_embalagem_kg}kg</p>
                                ) : !vendePorKg && (
                                  <p className="text-amber-600">⚠️ Peso da embalagem não definido</p>
                                )}
                                {tabelasProduto.length > 0 && (
                                  <p className="text-green-600 font-medium">✨ {tabelasProduto.length} tabela(s) disponível(eis)</p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        {tabelasProduto.length > 0 && (
                          <div className="col-span-3">
                            <Label className="text-xs">Tabela de Preço 💰</Label>
                            <Select 
                              value={tabelaSelecionada}
                              onValueChange={(id) => {
                                setTabelaSelecionada(id);
                                const tabela = tabelasProduto.find(t => t.id === id);
                                const prod = produtos.find(p => p.id === selectedProduto);
                                
                                if (tabela && prod) {
                                  const vendePorKg = (prod as any)?.tipo_venda === 'kg';
                                  const precoJaETotal = !prod?.preco_por_kg && !vendePorKg;
                                  
                                  if (vendePorKg || precoJaETotal) {
                                    const preco = tabela.preco_por_kg;
                                    setPrecoUnitario(preco);
                                    setPrecoOriginalProduto(preco);
                                  } else {
                                    const pesoEmb = prod?.peso_embalagem_kg || 1;
                                    const preco = tabela.preco_por_kg * pesoEmb;
                                    setPrecoUnitario(preco);
                                    setPrecoOriginalProduto(preco);
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className="border-green-200 bg-green-50/50">
                                <SelectValue placeholder="Escolher tabela..." />
                              </SelectTrigger>
                              <SelectContent>
                                {tabelasProduto.map(t => {
                                  const unidade = t.unidade_medida || 'kg';
                                  const precoExibicao = t.preco_por_kg.toFixed(2);
                                  
                                  return (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.nome_tabela} - R$ {precoExibicao}/{unidade}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      <div className="col-span-2">
                        <Label className="text-xs">{isVendidoPorKg ? "Kg" : "Qtd"}</Label>
                        <Input 
                          type="number" 
                          step={isVendidoPorKg ? "0.1" : "1"}
                          value={quantidade}
                          onChange={(e) => {
                            const valor = parseFloat(e.target.value) || 0;
                            setQuantidade(valor);
                          }}
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">{isVendidoPorKg ? "R$/kg" : "R$/caixa"}</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="number" 
                            step="0.01"
                            value={precoUnitario}
                            onChange={(e) => setPrecoUnitario(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className={precoUnitario !== precoOriginalProduto && precoOriginalProduto > 0 ? "border-amber-400 bg-amber-50" : ""}
                          />
                          {precoUnitario !== precoOriginalProduto && precoOriginalProduto > 0 && tabelaSelecionada && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={atualizarPrecoProduto}
                              className="border-amber-400 text-amber-700 hover:bg-amber-50"
                              title="Atualizar preço no cadastro"
                            >
                              💾
                            </Button>
                          )}
                        </div>
                        {precoUnitario !== precoOriginalProduto && precoOriginalProduto > 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠️ Preço diferente do cadastro (era R$ {precoOriginalProduto.toFixed(2)})
                          </p>
                        )}
                      </div>
                      {quantidade > 0 && precoUnitario > 0 && (
                        <div className="col-span-3 flex items-end">
                          <div className="text-sm font-semibold text-primary p-2 bg-primary/5 rounded w-full text-center">
                            Total: R$ {(quantidade * precoUnitario).toFixed(2)}
                          </div>
                        </div>
                      )}
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
                            <TableHead className="text-right w-24">Qtd</TableHead>
                            <TableHead className="text-right w-32">Preço Unit.</TableHead>
                            <TableHead className="text-right w-32">Preço Total</TableHead>
                            <TableHead className="w-24">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {produtosEscolhidos.map((item, index) => {
                            const isEditing = editandoProduto === index;
                            const diff = calcularDiferencaPreco(item);
                            
                            return (
                              <TableRow key={index}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      {item.nome}
                                      {diff.tipo === 'desconto' && (
                                        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                                          🏷️ -{diff.percentual.toFixed(0)}%
                                        </Badge>
                                      )}
                                      {diff.tipo === 'acrescimo' && (
                                        <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                                          📈 +{diff.percentual.toFixed(0)}%
                                        </Badge>
                                      )}
                                    </div>
                                    {item.tabela_preco_nome && (
                                      <div className="text-xs text-green-600 font-medium mt-0.5">
                                        💰 {item.tabela_preco_nome}
                                      </div>
                                    )}
                                    {item.observacoes && (
                                      <div className="text-xs text-muted-foreground italic mt-0.5">
                                        📝 {item.observacoes}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={editValues.quantidade}
                                      onChange={(e) => handleEditQuantidade(parseFloat(e.target.value) || 0)}
                                      className="w-20 text-right"
                                      autoFocus
                                    />
                                  ) : (
                                    item.quantidade
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editValues.preco_unitario}
                                      onChange={(e) => handleEditPrecoUnitario(parseFloat(e.target.value) || 0)}
                                      className="w-28 text-right"
                                    />
                                  ) : (
                                    `R$ ${item.preco_unitario.toFixed(2)}`
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editValues.preco_total}
                                      onChange={(e) => handleEditPrecoTotal(parseFloat(e.target.value) || 0)}
                                      className="w-28 text-right bg-blue-50"
                                      placeholder="Edite o total"
                                    />
                                  ) : (
                                    <span className="font-medium">
                                      R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {isEditing ? (
                                      <>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => salvarEdicao(index)}
                                          className="text-green-600 hover:text-green-700"
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={cancelarEdicao}
                                          className="text-muted-foreground"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => iniciarEdicao(index, item)}
                                          title="Editar"
                                        >
                                          <Edit2 className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removerProduto(index)}
                                          title="Remover"
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
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


                <div>
                  <Label htmlFor="observacoes">Observações (aparecem na impressão)</Label>
                  <Textarea 
                    id="observacoes" 
                    name="observacoes" 
                    placeholder="Observações que serão impressas no pedido..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="observacoes_internas">Observações Internas (apenas CRM)</Label>
                  <Textarea 
                    id="observacoes_internas" 
                    name="observacoes_internas" 
                    placeholder="Observações internas que não aparecem na impressão..."
                    rows={2}
                    className="border-orange-200 focus:border-orange-400"
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
