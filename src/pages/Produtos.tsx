import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Package, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Produtos = () => {
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [marcaSelecionada, setMarcaSelecionada] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
        </CardHeader>
        <CardContent>
          {produtos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum produto cadastrado</p>
              <p className="text-sm">Adicione produtos ao seu catálogo</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {produtos.map((produto) => (
                <div key={produto.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{produto.nome}</h3>
                  {produto.sku && <p className="text-xs text-muted-foreground">SKU: {produto.sku}</p>}
                  {produto.marcas && <p className="text-sm text-muted-foreground mt-1">Marca: {produto.marcas.nome}</p>}
                  {produto.preco_base && <p className="text-sm font-medium mt-2">R$ {parseFloat(produto.preco_base).toFixed(2)}</p>}
                  {produto.descricao && <p className="text-sm text-muted-foreground mt-2">{produto.descricao}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Produtos;
