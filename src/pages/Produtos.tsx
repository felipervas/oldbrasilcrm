import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Package, Upload, Edit, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const produtosFiltrados = produtos.filter(produto =>
    produto.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.marcas?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadProdutos = async () => {
    const { data, error } = await supabase
      .from("produtos")
      .select("*, marcas(nome)")
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
    const { error } = await supabase.from("produtos").insert({
      nome: formData.get("nome") as string,
      sku: formData.get("sku") as string,
      descricao: formData.get("descricao") as string,
      marca_id: marcaSelecionada || null,
      preco_base: formData.get("preco_base") ? parseFloat(formData.get("preco_base") as string) : null,
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

  const handleEdit = (produto: any) => {
    setProdutoSelecionado(produto);
    setEditFormData({
      nome: produto.nome,
      sku: produto.sku || "",
      descricao: produto.descricao || "",
      preco_base: produto.preco_base || "",
    });
    setMarcaSelecionada(produto.marca_id || "");
    loadMovimentacoes(produto.id);
    setEditOpen(true);
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
                <Label htmlFor="preco_base">Preço Base</Label>
                <Input id="preco_base" name="preco_base" type="number" step="0.01" />
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Informações</TabsTrigger>
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
            <div>
              <Label htmlFor="edit_descricao">Descrição</Label>
              <Textarea 
                id="edit_descricao"
                value={editFormData.descricao || ""}
                onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
              />
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
