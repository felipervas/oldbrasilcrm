import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useProdutos } from "@/hooks/useProdutos";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/Pagination";
import { useQueryClient } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProdutoTabelasPreco } from "@/components/ProdutoTabelasPreco";
import { ProdutoEditDialog } from "@/components/loja/ProdutoEditDialog";
import { CarrinhoOrcamento } from "@/components/CarrinhoOrcamento";
import { useCarrinho } from "@/hooks/useCarrinho";
import { ShoppingCart } from "lucide-react";

const Produtos = () => {
  const { adicionarItem } = useCarrinho();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [produtosParaAdicionar, setProdutosParaAdicionar] = useState<any[]>([]);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [marcaSelecionada, setMarcaSelecionada] = useState("");
  const [marcaFiltro, setMarcaFiltro] = useState("");
  const [editFormData, setEditFormData] = useState<any>({});
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [estoqueOpen, setEstoqueOpen] = useState(false);
  const [movimentacaoData, setMovimentacaoData] = useState({
    tipo: "entrada",
    quantidade: "",
    observacao: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const { data: produtosData, isLoading: produtosLoading } = useProdutos(page, 10, debouncedSearchTerm, marcaFiltro || undefined);
  const [imagensLoja, setImagensLoja] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tabelasPrecoCriacao, setTabelasPrecoCriacao] = useState<Array<{ nome: string; preco?: number; usarNoSite?: boolean }>>([]);
  const [usarTabelas, setUsarTabelas] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagemInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Usar hook otimizado em vez de loadProdutos
  const produtosLista = produtosData?.data || [];
  const totalProdutos = produtosData?.count || 0;
  const totalPages = Math.ceil(totalProdutos / 10);

  const loadMarcas = async () => {
    const { data } = await supabase.from("marcas").select("*").eq("ativa", true);
    setMarcas(data || []);
  };

  useEffect(() => {
    loadMarcas();
  }, []);

  // Resetar página ao mudar busca ou filtro de marca
  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm, marcaFiltro]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    // Validação explícita
    const nome = formData.get("nome") as string;
    if (!nome || nome.trim() === '') {
      toast({ 
        title: "❌ Campo obrigatório", 
        description: "O campo 'Nome' é obrigatório",
        variant: "destructive" 
      });
      setLoading(false);
      return;
    }

    // Validação condicional: ou tem tabelas OU tem preço base
    const temTabelas = tabelasPrecoCriacao.length > 0;
    const temPrecoBase = formData.get("preco_por_kg") || formData.get("preco_base");

    if (!temTabelas && !temPrecoBase) {
      toast({ 
        title: "❌ Preço obrigatório", 
        description: "Defina um preço base OU adicione tabelas de preço",
        variant: "destructive" 
      });
      setLoading(false);
      return;
    }

    // Se usar tabelas, validar se todas têm preço
    if (usarTabelas && temTabelas) {
      const tabelasSemPreco = tabelasPrecoCriacao.filter(t => !t.preco || t.preco <= 0);
      if (tabelasSemPreco.length > 0) {
        toast({ 
          title: "❌ Preços obrigatórios", 
          description: `Defina preços para todas as tabelas selecionadas (${tabelasSemPreco.length} sem preço)`,
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }
    }

    try {
      // Se usar tabelas, preço base pode ser null
      const preco_base = formData.get("preco_base") && !usarTabelas ? parseFloat(formData.get("preco_base") as string) : null;
      const preco_por_kg = formData.get("preco_por_kg") && !usarTabelas ? parseFloat(formData.get("preco_por_kg") as string) : null;
      const peso_embalagem_kg = formData.get("peso_embalagem_kg") ? parseFloat(formData.get("peso_embalagem_kg") as string) : 25;
      
      const produtoData = {
        nome: nome.trim(),
        nome_loja: formData.get("nome_loja") as string || null,
        descricao: formData.get("descricao") as string || null,
        marca_id: marcaSelecionada || null,
        preco_base,
        preco_por_kg,
        peso_embalagem_kg,
        tipo_embalagem: formData.get("tipo_embalagem") as string || 'caixa',
        tipo_calculo: formData.get("tipo_calculo") as string || 'normal',
        tipo_venda: formData.get("tipo_venda") as string || 'unidade',
        peso_unidade_kg: formData.get("peso_unidade_kg") ? parseFloat(formData.get("peso_unidade_kg") as string) : null,
        rendimento_dose_gramas: formData.get("rendimento_dose_gramas") ? parseInt(formData.get("rendimento_dose_gramas") as string) : null,
        visivel_loja: true,
        destaque_loja: false,
        ativo: true,
      };

      console.log('📦 Inserindo produto:', produtoData);

      const { error, data } = await supabase
        .from("produtos")
        .insert(produtoData)
        .select();

      if (error) {
        console.error('❌ Erro detalhado:', error);
        throw error;
      }

      console.log('✅ Produto criado:', data);
      
      // Criar tabelas de preço se houver
      if (data && data[0] && tabelasPrecoCriacao.length > 0) {
        const tabelasParaInserir = tabelasPrecoCriacao
          .filter(t => t.nome.trim() !== '' && t.preco && t.preco > 0)
          .map(t => ({
            produto_id: data[0].id,
            nome_tabela: t.nome.trim(),
            preco_por_kg: t.preco,
            usar_no_site: t.usarNoSite || false,
          }));

        if (tabelasParaInserir.length > 0) {
          const { error: tabelasError } = await supabase
            .from('produto_tabelas_preco')
            .insert(tabelasParaInserir);

          if (tabelasError) {
            console.error('⚠️ Erro ao criar tabelas de preço:', tabelasError);
            toast({ 
              title: "⚠️ Produto criado, mas erro nas tabelas", 
              description: "O produto foi criado mas houve erro ao adicionar as tabelas de preço",
              variant: "destructive" 
            });
          }
        }
      }

      toast({ title: "✅ Produto adicionado com sucesso!" });
      setOpen(false);
      setMarcaSelecionada("");
      setTabelasPrecoCriacao([]);
      setUsarTabelas(false);
      // Produtos serão recarregados automaticamente
      
    } catch (error: any) {
      console.error('❌ Erro ao adicionar produto:', error);
      toast({ 
        title: "❌ Erro ao adicionar produto", 
        description: error.message || 'Erro desconhecido',
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
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
        // CSV tem formato: Nome, Marca, Preco, Descricao
        const [nome, marca_nome, precoStr, descricao] = line.split(',').map(item => item.trim());
        
        // Encontra marca pelo nome
        const marca = marcas.find(m => m.nome.toLowerCase() === marca_nome?.toLowerCase());
        
        // Extrair peso da descrição (ex: "Peso da embalagem: 5 kg.")
        let pesoEmbalagem = 25; // default
        const pesoMatch = descricao?.match(/(\d+(?:\.\d+)?)\s*kg/i);
        if (pesoMatch) {
          pesoEmbalagem = parseFloat(pesoMatch[1]);
        }
        
        // Preço é o preço TOTAL da embalagem
        const precoTotal = precoStr ? parseFloat(precoStr.replace(',', '.')) : null;
        const precoPorKg = precoTotal && pesoEmbalagem > 0 ? precoTotal / pesoEmbalagem : null;
        
        console.log(`📦 ${nome}: Preço Total R$${precoTotal} / ${pesoEmbalagem}kg = R$${precoPorKg?.toFixed(2)}/kg`);
        
        return {
          nome: nome || 'Produto sem nome',
          marca_id: marca?.id || null,
          preco_base: precoTotal,
          preco_por_kg: precoPorKg,
          peso_embalagem_kg: pesoEmbalagem,
          descricao: descricao || null,
          tipo_venda: 'kg', // Produtos importados são vendidos por kg
          ativo: true,
          visivel_loja: true,
        };
      }).filter(p => p.nome !== 'Produto sem nome');

      const { error } = await supabase.from("produtos").insert(produtos);

      setLoading(false);

      if (error) {
        toast({ title: "Erro ao importar produtos", description: error.message, variant: "destructive" });
      } else {
        toast({ 
          title: `✅ ${produtos.length} produtos importados!`,
          description: 'Preços calculados automaticamente por kg'
        });
        setImportOpen(false);
        // Produtos serão recarregados automaticamente
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleEdit = async (produto: any) => {
    setProdutoSelecionado(produto);
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
      // Produtos serão recarregados automaticamente
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
        submarca: editFormData.submarca || null,
        descricao: editFormData.descricao,
        marca_id: marcaSelecionada || null,
        preco_base: editFormData.preco_base ? parseFloat(editFormData.preco_base) : null,
        preco_por_kg: editFormData.preco_por_kg ? parseFloat(editFormData.preco_por_kg) : null,
        peso_embalagem_kg: editFormData.peso_embalagem_kg ? parseFloat(editFormData.peso_embalagem_kg) : 25,
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
      // Produtos serão recarregados automaticamente
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    const { error } = await supabase.from("produtos").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir produto", variant: "destructive" });
    } else {
      toast({ title: "Produto excluído com sucesso!" });
      // Produtos serão recarregados automaticamente
    }
  };

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Produtos
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Catálogo de produtos representados
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <CarrinhoOrcamento />
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
                <div className="bg-primary/5 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Formato do CSV:</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Nome, Marca, Preço, Descrição</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    • <strong>Preço:</strong> Valor total da embalagem<br/>
                    • <strong>Descrição:</strong> Deve conter o peso (ex: "Peso da embalagem: 5 kg.")<br/>
                    • O sistema calculará automaticamente o preço por kg
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Exemplo:</strong><br/>
                    DEXTRO,Kommodity,191.60,Peso da embalagem: 5 kg.
                  </p>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  disabled={loading}
                />
                {loading && <p className="text-sm">Importando e calculando preços...</p>}
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Produto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome Interno (CRM) *</Label>
                <Input id="nome" name="nome" required placeholder="Ex: Manteiga de Cacau 04" />
              </div>
              <div>
                <Label htmlFor="nome_loja">Nome para Loja</Label>
                <Input id="nome_loja" name="nome_loja" placeholder="Ex: Manteiga de Cacau" />
              </div>
              <div>
                <Label htmlFor="tipo_embalagem">Tipo de Embalagem</Label>
                <Select name="tipo_embalagem" defaultValue="caixa">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caixa">📦 Caixa</SelectItem>
                    <SelectItem value="saco">🛍️ Saco</SelectItem>
                    <SelectItem value="balde">🪣 Balde</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="tipo_venda">Como é vendido? *</Label>
                <Select name="tipo_venda" defaultValue="unidade">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidade">📦 Por Unidade/Caixa (Pazinhas, Bases)</SelectItem>
                    <SelectItem value="kg">⚖️ Por Kilo (Cacau, produtos voláteis)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Define como o produto será vendido nos pedidos
                </p>
              </div>

              {/* Toggle para usar tabelas ou preço base */}
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/30">
                <Switch
                  id="usar-tabelas"
                  checked={usarTabelas}
                  onCheckedChange={setUsarTabelas}
                />
                <Label htmlFor="usar-tabelas" className="font-semibold cursor-pointer">
                  📊 Usar apenas Tabelas de Negociação (sem preço base)
                </Label>
              </div>

              {/* Se NÃO usar tabelas, mostrar preço base obrigatório */}
              {!usarTabelas && (
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
                    required={!usarTabelas}
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
              )}
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

              {/* Seção de Tabelas de Preço - NOVA INTERFACE */}
              {usarTabelas && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      📊 Tabelas de Negociação
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Crie tabelas com nomes personalizados e preços individuais. Uma delas será exibida no site.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="qtd-tabelas" className="text-sm">Quantas tabelas criar?</Label>
                    <select
                      id="qtd-tabelas"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={tabelasPrecoCriacao.length}
                      onChange={(e) => {
                        const qtd = parseInt(e.target.value);
                        const novasTabelas = Array.from({ length: qtd }, (_, i) => {
                          const existente = tabelasPrecoCriacao[i];
                          return existente || { nome: '', preco: undefined, usarNoSite: i === 0 };
                        });
                        setTabelasPrecoCriacao(novasTabelas);
                      }}
                    >
                      <option value="0">Selecione...</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} {num === 1 ? 'tabela' : 'tabelas'}</option>
                      ))}
                    </select>
                  </div>

                  {tabelasPrecoCriacao.length > 0 && (
                    <div className="space-y-3">
                      {tabelasPrecoCriacao.map((tabela, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-background space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Tabela {index + 1}</Label>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Nome da Tabela *</Label>
                              <Input
                                placeholder="Ex: Varejo, Atacado..."
                                value={tabela.nome || ''}
                                onChange={(e) => {
                                  const novas = [...tabelasPrecoCriacao];
                                  novas[index].nome = e.target.value;
                                  setTabelasPrecoCriacao(novas);
                                }}
                                className="h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Preço (R$/kg) *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={tabela.preco || ''}
                                onChange={(e) => {
                                  const novas = [...tabelasPrecoCriacao];
                                  novas[index].preco = e.target.value ? parseFloat(e.target.value) : undefined;
                                  setTabelasPrecoCriacao(novas);
                                }}
                                className="h-9"
                              />
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`usar-site-${index}`}
                              checked={tabela.usarNoSite || false}
                              onCheckedChange={(checked) => {
                                const novas = tabelasPrecoCriacao.map((t, i) => ({
                                  ...t,
                                  usarNoSite: i === index ? !!checked : false
                                }));
                                setTabelasPrecoCriacao(novas);
                              }}
                            />
                            <Label htmlFor={`usar-site-${index}`} className="text-xs cursor-pointer">
                              Usar esta tabela no site/loja
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tabelasPrecoCriacao.length > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        💡 A tabela marcada será usada para exibir o preço no site. As demais ficam disponíveis para negociação.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar Produto"}
              </Button>
            </div>
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
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Buscar por nome ou marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select 
              value={marcaFiltro || "all"} 
              onValueChange={(val) => setMarcaFiltro(val === "all" ? "" : val)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as marcas</SelectItem>
                {marcas.map((marca) => (
                  <SelectItem key={marca.id} value={marca.id}>
                    {marca.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {produtosLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : produtosLista.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum produto cadastrado</p>
              <p className="text-sm">Adicione produtos ao seu catálogo</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {produtosLista.map((produto) => (
                <div key={produto.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{produto.nome}</h3>
                      {produto.submarca && (
                        <p className="text-xs text-muted-foreground">Submarca: {produto.submarca}</p>
                      )}
                      {produto.marcas && (
                        <p className="text-sm text-muted-foreground mt-1">
                          🏷️ Marca: {produto.marcas.nome}
                        </p>
                      )}
                      
                       {/* 🆕 SEÇÃO DE PREÇOS */}
                      <div className="mt-3 space-y-1 bg-muted/50 p-3 rounded-lg">
                        {produto.preco_base && (
                          <p className="text-sm font-semibold text-primary">
                            💰 Preço Base: R$ {Number(produto.preco_base).toFixed(2)}
                          </p>
                        )}
                        {produto.preco_por_kg && (
                          <p className="text-sm">
                            ⚖️ Preço por Kg: R$ {Number(produto.preco_por_kg).toFixed(2)}
                          </p>
                        )}
                        {produto.peso_embalagem_kg && (
                          <p className="text-xs text-muted-foreground">
                            📦 Embalagem: {produto.peso_embalagem_kg}kg
                          </p>
                        )}
                        {produto.rendimento_dose_gramas && produto.preco_por_kg && (
                          <p className="text-sm">
                            🥄 Custo por Dose ({produto.rendimento_dose_gramas}g): 
                            R$ {((Number(produto.preco_por_kg) * produto.rendimento_dose_gramas) / 1000).toFixed(2)}
                          </p>
                        )}
                      </div>
                      
                      {produto.descricao && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {produto.descricao}
                        </p>
                      )}
                      
                      <div className="mt-2 flex gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${produto.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {produto.ativo ? '✓ Ativo' : '✗ Inativo'}
                        </span>
                        {produto.estoque_escritorio !== undefined && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                            📦 Estoque: {produto.estoque_escritorio}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {produto.preco_por_kg && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            adicionarItem({
                              produto_id: produto.id,
                              nome: produto.nome,
                              preco_por_kg: Number(produto.preco_por_kg),
                              quantidade_kg: 1,
                              marca: produto.marcas?.nome,
                            });
                            toast({ title: '✅ Produto adicionado ao orçamento!' });
                          }}
                          className="w-full"
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(produto)} className="flex-1">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(produto.id)} className="flex-1">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* 📊 TABELAS DE PREÇO */}
                  <ProdutoTabelasPreco produtoId={produto.id} />
                </div>
              ))}
            </div>
          )}
          
          {produtosLista.length > 0 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={totalProdutos}
              pageSize={10}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição com Tabelas de Preço */}
      <ProdutoEditDialog 
        produto={produtoSelecionado}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setProdutoSelecionado(null);
            queryClient.invalidateQueries({ queryKey: ['produtos'] });
          }
        }}
      />
    </div>
  );
};

export default Produtos;
