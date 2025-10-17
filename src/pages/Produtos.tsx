import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Package, Upload, Edit, ArrowUpCircle, ArrowDownCircle, Trash2, Image as ImageIcon, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Produtos = () => {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [marcaSelecionada, setMarcaSelecionada] = useState("");
  const [editFormData, setEditFormData] = useState<any>({});
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [estoqueOpen, setEstoqueOpen] = useState(false);
  const [movimentacaoData, setMovimentacaoData] = useState({
    tipo: "entrada",
    quantidade: "",
    observacao: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [imagensLoja, setImagensLoja] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagemInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const calcularEExibir = (preco: number, peso: number, rendimento: number) => {
    const resultadoDiv = document.getElementById('calculos-resultado');
    const precoKgDiv = document.getElementById('calc-preco-kg');
    const rendimentoDiv = document.getElementById('calc-rendimento');
    const custoDoseDiv = document.getElementById('calc-custo-dose');

    if (!resultadoDiv || !precoKgDiv || !rendimentoDiv || !custoDoseDiv) return;

    if (preco === 0) {
      resultadoDiv.classList.add('hidden');
      return;
    }

    resultadoDiv.classList.remove('hidden');

    // Preço por kg
    if (peso > 0) {
      const precoKg = preco / peso;
      precoKgDiv.innerHTML = `<strong>Preço/kg:</strong> R$ ${precoKg.toFixed(2)}`;
    } else {
      precoKgDiv.innerHTML = '';
    }

    // Rendimento
    if (rendimento > 0) {
      const dosesParaUmKg = 1000 / rendimento;
      const precoPorKgGelato = preco * dosesParaUmKg;
      rendimentoDiv.innerHTML = `<strong>Preço/kg gelato:</strong> R$ ${precoPorKgGelato.toFixed(2)} (${dosesParaUmKg.toFixed(1)} doses)`;
      custoDoseDiv.innerHTML = `<strong>Custo por dose (${rendimento}g):</strong> R$ ${preco.toFixed(2)}`;
    } else {
      rendimentoDiv.innerHTML = '';
      custoDoseDiv.innerHTML = '';
    }
  };

  const produtosFiltrados = produtos.filter(produto =>
    produto.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.marcas?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadProdutos = async () => {
    const { data, error } = await supabase
      .from("produtos")
      .select("*, marcas(nome, id)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar produtos", variant: "destructive" });
    } else {
      setProdutos(data || []);
    }
  };

  const loadMarcas = async () => {
    const { data } = await supabase.from("marcas").select("*").eq("ativa", true);
    setMarcas(data || []);
  };

  useEffect(() => {
    loadProdutos();
    loadMarcas();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const preco_base = formData.get("preco_base") ? parseFloat(formData.get("preco_base") as string) : null;
    const preco_por_kg = formData.get("preco_por_kg") ? parseFloat(formData.get("preco_por_kg") as string) : null;
    const peso_embalagem_kg = formData.get("peso_embalagem_kg") ? parseFloat(formData.get("peso_embalagem_kg") as string) : 25;
    
    const { error } = await supabase.from("produtos").insert({
      nome: formData.get("nome") as string,
      sku: formData.get("sku") as string,
      descricao: formData.get("descricao") as string,
      marca_id: marcaSelecionada || null,
      preco_base,
      preco_por_kg,
      peso_embalagem_kg,
      tipo_calculo: formData.get("tipo_calculo") as string || 'normal',
      peso_unidade_kg: formData.get("peso_unidade_kg") ? parseFloat(formData.get("peso_unidade_kg") as string) : null,
      rendimento_dose_gramas: formData.get("rendimento_dose_gramas") ? parseInt(formData.get("rendimento_dose_gramas") as string) : null,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Erro ao adicionar produto", variant: "destructive" });
    } else {
      toast({ title: "Produto adicionado com sucesso!" });
      setOpen(false);
      setMarcaSelecionada("");
      loadProdutos();
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Ignora a primeira linha (cabeçalho)
      const produtos = lines.slice(1).map(line => {
        const [nome, sku, marca_nome, preco, descricao] = line.split(',').map(item => item.trim());
        
        // Encontra marca pelo nome
        const marca = marcas.find(m => m.nome.toLowerCase() === marca_nome?.toLowerCase());
        
        return {
          nome: nome || 'Produto sem nome',
          sku: sku || null,
          marca_id: marca?.id || null,
          preco_base: preco ? parseFloat(preco) : null,
          descricao: descricao || null,
        };
      }).filter(p => p.nome !== 'Produto sem nome');

      const { error } = await supabase.from("produtos").insert(produtos);

      setLoading(false);

      if (error) {
        toast({ title: "Erro ao importar produtos", description: error.message, variant: "destructive" });
      } else {
        toast({ title: `${produtos.length} produtos importados com sucesso!` });
        setImportOpen(false);
        loadProdutos();
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleEdit = async (produto: any) => {
    setProdutoSelecionado(produto);
    setEditFormData({
      nome: produto.nome,
      sku: produto.sku || "",
      descricao: produto.descricao || "",
      preco_base: produto.preco_base || "",
      visivel_loja: produto.visivel_loja ?? true,
      destaque_loja: produto.destaque_loja ?? false,
      ordem_exibicao: produto.ordem_exibicao ?? 0,
    });
    setMarcaSelecionada(produto.marca_id || "");
    loadMovimentacoes(produto.id);
    await loadImagensLoja(produto.id);
    setEditOpen(true);
  };

  const loadImagensLoja = async (produtoId: string) => {
    const { data } = await supabase
      .from("produto_imagens")
      .select("*")
      .eq("produto_id", produtoId)
      .order("ordem", { ascending: true });
    setImagensLoja(data || []);
  };

  const handleUploadImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !produtoSelecionado) return;

    setUploadingImage(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${i}.${fileExt}`;
      const filePath = `${produtoSelecionado.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('produto-imagens')
        .upload(filePath, file);

      if (uploadError) {
        toast({ title: "Erro ao fazer upload", description: uploadError.message, variant: "destructive" });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('produto-imagens')
        .getPublicUrl(filePath);

      await supabase.from("produto_imagens").insert({
        produto_id: produtoSelecionado.id,
        url: publicUrl,
        ordem: imagensLoja.length + i,
      });
    }

    setUploadingImage(false);
    toast({ title: "Imagens carregadas com sucesso!" });
    await loadImagensLoja(produtoSelecionado.id);
    
    if (imagemInputRef.current) {
      imagemInputRef.current.value = '';
    }
  };

  const handleDeleteImagem = async (imagemId: string, url: string) => {
    if (!confirm("Deseja excluir esta imagem?")) return;

    const filePath = url.split('/produto-imagens/')[1];
    await supabase.storage.from('produto-imagens').remove([filePath]);
    await supabase.from("produto_imagens").delete().eq("id", imagemId);

    toast({ title: "Imagem excluída com sucesso!" });
    await loadImagensLoja(produtoSelecionado.id);
  };

  const loadMovimentacoes = async (produtoId: string) => {
    const { data } = await supabase
      .from("movimentacao_estoque")
      .select("*, profiles(nome)")
      .eq("produto_id", produtoId)
      .order("created_at", { ascending: false });
    setMovimentacoes(data || []);
  };

  const handleMovimentacao = async () => {
    if (!produtoSelecionado || !movimentacaoData.quantidade) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("movimentacao_estoque").insert({
      produto_id: produtoSelecionado.id,
      tipo: movimentacaoData.tipo,
      quantidade: parseInt(movimentacaoData.quantidade),
      observacao: movimentacaoData.observacao,
      responsavel_id: user.id,
    });

    if (error) {
      toast({ title: "Erro ao registrar movimentação", variant: "destructive" });
    } else {
      toast({ title: "Movimentação registrada com sucesso!" });
      setEstoqueOpen(false);
      setMovimentacaoData({ tipo: "entrada", quantidade: "", observacao: "" });
      loadMovimentacoes(produtoSelecionado.id);
      loadProdutos();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) return;

    setLoading(true);
    const { error } = await supabase
      .from("produtos")
      .update({
        nome: editFormData.nome,
        sku: editFormData.sku,
        descricao: editFormData.descricao,
        marca_id: marcaSelecionada || null,
        preco_base: editFormData.preco_base ? parseFloat(editFormData.preco_base) : null,
        peso_unidade_kg: editFormData.peso_unidade_kg ? parseFloat(editFormData.peso_unidade_kg) : null,
        rendimento_dose_gramas: editFormData.rendimento_dose_gramas ? parseInt(editFormData.rendimento_dose_gramas) : null,
        visivel_loja: editFormData.visivel_loja,
        destaque_loja: editFormData.destaque_loja,
        ordem_exibicao: editFormData.ordem_exibicao,
      })
      .eq("id", produtoSelecionado.id);

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao atualizar produto", variant: "destructive" });
    } else {
      toast({ title: "Produto atualizado com sucesso!" });
      setEditOpen(false);
      loadProdutos();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    const { error } = await supabase.from("produtos").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir produto", variant: "destructive" });
    } else {
      toast({ title: "Produto excluído com sucesso!" });
      loadProdutos();
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Produtos
            </h1>
            <p className="text-muted-foreground">
              Catálogo de produtos representados
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Importar CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Produtos via CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  O arquivo CSV deve ter o formato: Nome, SKU, Marca, Preço, Descrição
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  disabled={loading}
                />
                {loading && <p className="text-sm">Importando produtos...</p>}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Produto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" name="nome" required />
              </div>
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" />
              </div>
              <div>
                <Label htmlFor="marca">Marca</Label>
                <Select 
                  value={marcaSelecionada} 
                  onValueChange={(value) => {
                    setMarcaSelecionada(value);
                    const marca = marcas.find(m => m.id === value);
                    const isGenial = marca?.nome?.toLowerCase().includes('gencau') || marca?.nome?.toLowerCase().includes('genial');
                    // Atualizar tipo_calculo dinamicamente
                    const tipoInput = document.getElementById('tipo_calculo') as HTMLInputElement;
                    if (tipoInput && isGenial) {
                      tipoInput.value = 'por_kg';
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {marcas.map((marca) => (
                      <SelectItem key={marca.id} value={marca.id}>
                        {marca.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" id="tipo_calculo" name="tipo_calculo" value="normal" />
              </div>
              <div>
                <Label htmlFor="preco_base">
                  {marcas.find(m => m.id === marcaSelecionada)?.nome?.toLowerCase().includes('gencau') || 
                   marcas.find(m => m.id === marcaSelecionada)?.nome?.toLowerCase().includes('genial') 
                    ? 'Preço por Kg *' 
                    : 'Preço Base *'}
                </Label>
                <Input 
                  id={marcas.find(m => m.id === marcaSelecionada)?.nome?.toLowerCase().includes('gencau') || 
                      marcas.find(m => m.id === marcaSelecionada)?.nome?.toLowerCase().includes('genial')
                    ? 'preco_por_kg'
                    : 'preco_base'}
                  name={marcas.find(m => m.id === marcaSelecionada)?.nome?.toLowerCase().includes('gencau') || 
                        marcas.find(m => m.id === marcaSelecionada)?.nome?.toLowerCase().includes('genial')
                    ? 'preco_por_kg'
                    : 'preco_base'}
                  type="number" 
                  step="0.01" 
                  required
                  onChange={(e) => {
                    const preco = parseFloat(e.target.value) || 0;
                    const peso = parseFloat((document.getElementById('peso_unidade_kg') as HTMLInputElement)?.value) || 0;
                    const rendimento = parseFloat((document.getElementById('rendimento_dose_gramas') as HTMLInputElement)?.value) || 0;
                    calcularEExibir(preco, peso, rendimento);
                    
                    // Se for produto Genial, calcular preço da caixa
                    const isGenial = marcas.find(m => m.id === marcaSelecionada)?.nome?.toLowerCase().includes('gencau') || 
                                   marcas.find(m => m.id === marcaSelecionada)?.nome?.toLowerCase().includes('genial');
                    if (isGenial) {
                      const precoCaixa = preco * 25;
                      const inputPrecoBase = document.getElementById('preco_base_hidden') as HTMLInputElement;
                      if (inputPrecoBase) inputPrecoBase.value = precoCaixa.toFixed(2);
                      const pesoInput = document.getElementById('peso_embalagem_kg') as HTMLInputElement;
                      if (pesoInput && !pesoInput.value) pesoInput.value = '25';
                      
                      // Mostrar cálculo
                      const calcDiv = document.getElementById('genial-calc');
                      if (calcDiv) {
                        calcDiv.innerHTML = `<p class="text-sm text-muted-foreground mt-1">Preço por caixa (25kg): R$ ${precoCaixa.toFixed(2)}</p>`;
                      }
                    }
                  }}
                />
                {(marcas.find(m => m.id === marcaSelecionada)?.nome?.toLowerCase().includes('gencau') || 
                  marcas.find(m => m.id === marcaSelecionada)?.nome?.toLowerCase().includes('genial')) && (
                  <>
                    <div id="genial-calc"></div>
                    <input type="hidden" id="preco_base_hidden" name="preco_base" />
                    <input type="hidden" id="peso_embalagem_kg" name="peso_embalagem_kg" value="25" />
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mt-2">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        ⚖️ <strong>Produto com Preço Volátil (Cacau)</strong><br />
                        Digite o preço por kg. O sistema calculará automaticamente o preço por caixa de 25kg.
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="peso_unidade_kg">Peso da Unidade (kg)</Label>
                  <Input 
                    id="peso_unidade_kg" 
                    name="peso_unidade_kg" 
                    type="number" 
                    step="0.001" 
                    placeholder="Ex: 3.5"
                    onChange={(e) => {
                      const peso = parseFloat(e.target.value) || 0;
                      const preco = parseFloat((document.getElementById('preco_base') as HTMLInputElement)?.value) || 0;
                      const rendimento = parseFloat((document.getElementById('rendimento_dose_gramas') as HTMLInputElement)?.value) || 0;
                      calcularEExibir(preco, peso, rendimento);
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Para calcular preço por kilo</p>
                </div>
                <div>
                  <Label htmlFor="rendimento_dose_gramas">Rendimento (g/kg)</Label>
                  <Input 
                    id="rendimento_dose_gramas" 
                    name="rendimento_dose_gramas" 
                    type="number" 
                    placeholder="Ex: 30"
                    onChange={(e) => {
                      const rendimento = parseFloat(e.target.value) || 0;
                      const preco = parseFloat((document.getElementById('preco_base') as HTMLInputElement)?.value) || 0;
                      const peso = parseFloat((document.getElementById('peso_unidade_kg') as HTMLInputElement)?.value) || 0;
                      calcularEExibir(preco, peso, rendimento);
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Gramas para 1kg de gelato</p>
                </div>
              </div>
              <div id="calculos-resultado" className="bg-muted/50 p-3 rounded-lg text-sm space-y-1 hidden">
                <h4 className="font-semibold mb-2">📊 Cálculos Automáticos:</h4>
                <div id="calc-preco-kg"></div>
                <div id="calc-rendimento"></div>
                <div id="calc-custo-dose"></div>
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" name="descricao" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar Produto"}
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Catálogo de Produtos
          </CardTitle>
          <CardDescription>
            Todos os produtos disponíveis
          </CardDescription>
          <div className="mt-4">
            <Input
              placeholder="Buscar por nome, SKU ou marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {produtosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum produto cadastrado</p>
              <p className="text-sm">Adicione produtos ao seu catálogo</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {produtosFiltrados.map((produto) => (
                <div key={produto.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{produto.nome}</h3>
                      {produto.sku && <p className="text-xs text-muted-foreground">SKU: {produto.sku}</p>}
                      {produto.marcas && <p className="text-sm text-muted-foreground mt-1">Marca: {produto.marcas.nome}</p>}
                      {produto.preco_base && <p className="text-sm font-medium mt-2">R$ {parseFloat(produto.preco_base).toFixed(2)}</p>}
                      {produto.descricao && <p className="text-sm text-muted-foreground mt-2">{produto.descricao}</p>}
                    </div>
                     <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(produto)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(produto.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="imagens">Imagens Loja</TabsTrigger>
              <TabsTrigger value="estoque">Estoque</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info">
              <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit_nome">Nome *</Label>
              <Input 
                id="edit_nome" 
                required
                value={editFormData.nome || ""}
                onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_sku">SKU</Label>
              <Input 
                id="edit_sku"
                value={editFormData.sku || ""}
                onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_marca">Marca</Label>
              <Select value={marcaSelecionada} onValueChange={setMarcaSelecionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma marca" />
                </SelectTrigger>
                <SelectContent>
                  {marcas.map((marca) => (
                    <SelectItem key={marca.id} value={marca.id}>
                      {marca.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_preco_base">Preço Base</Label>
              <Input 
                id="edit_preco_base" 
                type="number" 
                step="0.01"
                value={editFormData.preco_base || ""}
                onChange={(e) => setEditFormData({ ...editFormData, preco_base: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_peso_unidade_kg">Peso da Unidade (kg)</Label>
                <Input 
                  id="edit_peso_unidade_kg" 
                  type="number" 
                  step="0.001"
                  placeholder="Ex: 3.5"
                  value={editFormData.peso_unidade_kg || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, peso_unidade_kg: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Para calcular preço por kilo</p>
              </div>
              <div>
                <Label htmlFor="edit_rendimento_dose_gramas">Rendimento (g/kg)</Label>
                <Input 
                  id="edit_rendimento_dose_gramas" 
                  type="number"
                  placeholder="Ex: 30"
                  value={editFormData.rendimento_dose_gramas || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, rendimento_dose_gramas: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Gramas para 1kg de gelato</p>
              </div>
            </div>
            <div>
              <Label htmlFor="edit_descricao">Descrição</Label>
              <Textarea 
                id="edit_descricao"
                value={editFormData.descricao || ""}
                onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">Configurações da Loja Online</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="visivel_loja"
                    checked={editFormData.visivel_loja ?? true}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, visivel_loja: checked })}
                  />
                  <Label htmlFor="visivel_loja" className="cursor-pointer">
                    Visível na loja online
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="destaque_loja"
                    checked={editFormData.destaque_loja ?? false}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, destaque_loja: checked })}
                  />
                  <Label htmlFor="destaque_loja" className="cursor-pointer">
                    Produto em destaque
                  </Label>
                </div>
                <div>
                  <Label htmlFor="ordem_exibicao">Ordem de exibição (menor = primeiro)</Label>
                  <Input
                    id="ordem_exibicao"
                    type="number"
                    value={editFormData.ordem_exibicao ?? 0}
                    onChange={(e) => setEditFormData({ ...editFormData, ordem_exibicao: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="imagens" className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="text-lg font-semibold mb-2">Imagens do Produto na Loja</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Adicione até 5 imagens do produto. A primeira imagem será usada como capa.
                </p>
                
                <div className="mb-4">
                  <Input
                    ref={imagemInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleUploadImagem}
                    disabled={uploadingImage || imagensLoja.length >= 5}
                  />
                  {uploadingImage && (
                    <p className="text-sm text-muted-foreground mt-2">Carregando imagens...</p>
                  )}
                </div>

                {imagensLoja.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">Nenhuma imagem adicionada</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {imagensLoja.map((imagem, index) => (
                      <div key={imagem.id} className="relative group">
                        <img
                          src={imagem.url}
                          alt={`Produto ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg border"
                        />
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                            Capa
                          </div>
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteImagem(imagem.id, imagem.url)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          Ordem: {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="estoque" className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Estoque Escritório</h3>
                    <p className="text-sm text-muted-foreground">
                      Controle de entradas e saídas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {produtoSelecionado?.estoque_escritorio || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">unidades</p>
                  </div>
                </div>

                <Dialog open={estoqueOpen} onOpenChange={setEstoqueOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Movimentação
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Movimentação</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Tipo</Label>
                        <Select
                          value={movimentacaoData.tipo}
                          onValueChange={(v) => setMovimentacaoData({ ...movimentacaoData, tipo: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entrada">Entrada</SelectItem>
                            <SelectItem value="saida">Saída</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min="1"
                          value={movimentacaoData.quantidade}
                          onChange={(e) => setMovimentacaoData({ ...movimentacaoData, quantidade: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Observação</Label>
                        <Textarea
                          value={movimentacaoData.observacao}
                          onChange={(e) => setMovimentacaoData({ ...movimentacaoData, observacao: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleMovimentacao} className="w-full">
                        Registrar Movimentação
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Histórico de Movimentações</h4>
                {movimentacoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma movimentação registrada
                  </p>
                ) : (
                  <div className="space-y-2">
                    {movimentacoes.map((mov) => (
                      <div key={mov.id} className="flex items-center justify-between border rounded p-2">
                        <div className="flex items-center gap-2">
                          {mov.tipo === "entrada" ? (
                            <ArrowUpCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {mov.tipo === "entrada" ? "Entrada" : "Saída"} de {mov.quantidade} unidades
                            </p>
                            {mov.observacao && (
                              <p className="text-xs text-muted-foreground">{mov.observacao}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(mov.created_at).toLocaleDateString('pt-BR')}
                          </p>
                          {mov.profiles && (
                            <p className="text-xs text-muted-foreground">{mov.profiles.nome}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos;
