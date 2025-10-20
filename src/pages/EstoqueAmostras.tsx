import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Search, Pencil, Trash2, History, Box } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDebounce } from "@/hooks/useDebounce";
import { ListLoadingSkeleton } from "@/components/LoadingSkeleton";

interface Amostra {
  id: string;
  cliente_id: string;
  produto_id: string;
  quantidade: number;
  data_entrega: string;
  responsavel_id?: string;
  retorno: string | null;
  status: string;
  observacoes: string | null;
  clientes: { nome_fantasia: string } | null;
  produtos: { nome: string } | null;
}

const EstoqueAmostras = () => {
  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAmostra, setEditingAmostra] = useState<Amostra | null>(null);
  const [deleteAmostra, setDeleteAmostra] = useState<Amostra | null>(null);
  const [historicoCliente, setHistoricoCliente] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { toast } = useToast();

  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    cliente_id: "",
    responsavel_id: "",
    data_entrega: new Date().toISOString().split('T')[0],
    status: "pendente",
    retorno: "",
    origem_saida: "escritorio",
  });

  const [produtosAmostras, setProdutosAmostras] = useState<Array<{
    produto_id: string;
    quantidade: string;
    observacoes: string;
  }>>([{ produto_id: "", quantidade: "", observacoes: "" }]);

  useEffect(() => {
    loadData();
    loadResponsaveis();
  }, []);

  const loadResponsaveis = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome")
      .order("nome");
    setResponsaveis(data || []);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [amostrasRes, clientesRes, produtosRes, movimentacoesRes] = await Promise.all([
        supabase
          .from("amostras")
          .select("id, cliente_id, produto_id, quantidade, data_entrega, status, retorno, observacoes, clientes(nome_fantasia), produtos(nome)")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("clientes").select("id, nome_fantasia").eq("ativo", true).order("nome_fantasia").limit(100),
        supabase.from("produtos").select("id, nome, estoque_escritorio").eq("ativo", true).order("nome").limit(100),
        supabase
          .from("movimentacao_estoque")
          .select("id, produto_id, quantidade, tipo, created_at, observacao, produtos(nome)")
          .order("created_at", { ascending: false })
          .limit(50)
      ]);

      if (amostrasRes.error) throw amostrasRes.error;
      if (clientesRes.error) throw clientesRes.error;
      if (produtosRes.error) throw produtosRes.error;

      setAmostras(amostrasRes.data || []);
      setClientes(clientesRes.data || []);
      setProdutos(produtosRes.data || []);
      setMovimentacoes(movimentacoesRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingAmostra) {
        const produtoAtual = produtosAmostras[0];
        const { error } = await supabase
          .from("amostras")
          .update({
            cliente_id: formData.cliente_id,
            produto_id: produtoAtual.produto_id,
            quantidade: parseFloat(produtoAtual.quantidade),
            data_entrega: formData.data_entrega,
            status: formData.status,
            retorno: formData.retorno,
            observacoes: produtoAtual.observacoes,
            responsavel_id: formData.responsavel_id || user.id,
            origem_saida: formData.origem_saida,
          })
          .eq("id", editingAmostra.id);

        if (error) throw error;
        toast({ title: "Amostra atualizada com sucesso!" });
      } else {
        const amostrasParaInserir = produtosAmostras
          .filter(p => p.produto_id && p.quantidade)
          .map(p => ({
            cliente_id: formData.cliente_id,
            produto_id: p.produto_id,
            quantidade: parseFloat(p.quantidade),
            data_entrega: formData.data_entrega,
            status: formData.status,
            retorno: formData.retorno,
            observacoes: p.observacoes,
            responsavel_id: formData.responsavel_id || user.id,
            origem_saida: formData.origem_saida,
          }));

        if (amostrasParaInserir.length === 0) {
          toast({ title: "Adicione pelo menos um produto", variant: "destructive" });
          return;
        }

        const { error } = await supabase.from("amostras").insert(amostrasParaInserir);

        if (error) throw error;
        toast({ title: `${amostrasParaInserir.length} amostra(s) registrada(s)!` });
      }

      setDialogOpen(false);
      setEditingAmostra(null);
      setFormData({
        cliente_id: "",
        responsavel_id: "",
        data_entrega: new Date().toISOString().split('T')[0],
        status: "pendente",
        retorno: "",
        origem_saida: "escritorio",
      });
      setProdutosAmostras([{ produto_id: "", quantidade: "", observacoes: "" }]);
      loadData();
    } catch (error: any) {
      console.error("Erro ao salvar amostra:", error);
      toast({ title: "Erro ao salvar amostra", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteAmostra) return;

    try {
      const { error } = await supabase
        .from("amostras")
        .delete()
        .eq("id", deleteAmostra.id);

      if (error) throw error;

      toast({ title: "Amostra excluída com sucesso!" });
      setDeleteAmostra(null);
      loadData();
    } catch (error) {
      console.error("Erro ao excluir amostra:", error);
      toast({ title: "Erro ao excluir amostra", variant: "destructive" });
    }
  };

  const handleEdit = (amostra: Amostra & { origem_saida?: string }) => {
    setEditingAmostra(amostra);
    setFormData({
      cliente_id: amostra.cliente_id,
      responsavel_id: amostra.responsavel_id || "",
      data_entrega: amostra.data_entrega,
      status: amostra.status,
      retorno: amostra.retorno || "",
      origem_saida: amostra.origem_saida || "escritorio",
    });
    setProdutosAmostras([{
      produto_id: amostra.produto_id,
      quantidade: amostra.quantidade.toString(),
      observacoes: amostra.observacoes || "",
    }]);
    setDialogOpen(true);
  };

  const loadHistorico = async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from("cliente_historico")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
      setHistoricoCliente(clienteId);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast({ title: "Erro ao carregar histórico", variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (id: string, status: string, retorno: string) => {
    try {
      const { error } = await supabase
        .from("amostras")
        .update({ status, retorno })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Status atualizado com sucesso!" });
      loadData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const amostrasFiltered = useMemo(() => 
    amostras.filter(a =>
      a.clientes?.nome_fantasia?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      a.produtos?.nome?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ), [amostras, debouncedSearch]
  );

  const getStatusColor = (status: string) => {
    const colors = {
      pendente: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      positivo: "bg-green-500/10 text-green-600 border-green-500/20",
      negativo: "bg-red-500/10 text-red-600 border-red-500/20",
    };
    return colors[status as keyof typeof colors] || "bg-muted";
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Estoque & Amostras
            </h1>
            <p className="text-muted-foreground">
              Gerencie amostras e controle de estoque
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingAmostra(null);
            setFormData({
              cliente_id: "",
              responsavel_id: "",
              data_entrega: new Date().toISOString().split('T')[0],
              status: "pendente",
              retorno: "",
              origem_saida: "escritorio",
            });
            setProdutosAmostras([{ produto_id: "", quantidade: "", observacoes: "" }]);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Amostra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAmostra ? "Editar Amostra" : "Registrar Nova Amostra"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_fantasia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Select
                  value={formData.responsavel_id}
                  onValueChange={(value) => setFormData({ ...formData, responsavel_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {responsaveis.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data de Entrega *</Label>
                <Input
                  type="date"
                  value={formData.data_entrega}
                  onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Produtos *</Label>
                  {!editingAmostra && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setProdutosAmostras([...produtosAmostras, { produto_id: "", quantidade: "", observacoes: "" }])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Produto
                    </Button>
                  )}
                </div>
                
                {produtosAmostras.map((prod, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Produto {idx + 1}</span>
                      {!editingAmostra && produtosAmostras.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setProdutosAmostras(produtosAmostras.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <Select
                      value={prod.produto_id}
                      onValueChange={(value) => {
                        const novos = [...produtosAmostras];
                        novos[idx].produto_id = value;
                        setProdutosAmostras(novos);
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={prod.quantidade}
                      onChange={(e) => {
                        const novos = [...produtosAmostras];
                        novos[idx].quantidade = e.target.value;
                        setProdutosAmostras(novos);
                      }}
                      placeholder="Quantidade em gramas (ex: 500)"
                      required
                    />

                    <Textarea
                      value={prod.observacoes}
                      onChange={(e) => {
                        const novos = [...produtosAmostras];
                        novos[idx].observacoes = e.target.value;
                        setProdutosAmostras(novos);
                      }}
                      placeholder="Observações deste produto..."
                      rows={2}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Origem da Saída *</Label>
                <Select
                  value={formData.origem_saida}
                  onValueChange={(value) => {
                    console.log('Origem selecionada:', value);
                    setFormData({ ...formData, origem_saida: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="escritorio">Estoque Escritório</SelectItem>
                    <SelectItem value="fabrica">Saída Fábrica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
                      <SelectItem value="retornado">Retornado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Retorno</Label>
                  <Input
                    value={formData.retorno}
                    onChange={(e) => setFormData({ ...formData, retorno: e.target.value })}
                    placeholder="Feedback do cliente..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingAmostra ? "Atualizar" : "Registrar"} Amostra</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="amostras" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="amostras">
            <Package className="h-4 w-4 mr-2" />
            Amostras
          </TabsTrigger>
          <TabsTrigger value="estoque">
            <Box className="h-4 w-4 mr-2" />
            Estoque
          </TabsTrigger>
        </TabsList>

        <TabsContent value="amostras">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Amostras Entregues
          </CardTitle>
          <CardDescription>Histórico de amostras fornecidas aos clientes</CardDescription>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ListLoadingSkeleton count={3} type="produto" />
          ) : amostrasFiltered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma amostra registrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {amostrasFiltered.map((amostra) => (
                <div key={amostra.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{amostra.clientes?.nome_fantasia}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(amostra.status)}`}>
                          {amostra.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Produto: {amostra.produtos?.nome} • Quantidade: {amostra.quantidade}g
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Entregue em: {new Date(amostra.data_entrega).toLocaleDateString('pt-BR')}
                      </p>
                      {amostra.observacoes && (
                        <p className="text-sm mt-2 text-muted-foreground">{amostra.observacoes}</p>
                      )}
                      {amostra.retorno && (
                        <p className="text-sm mt-2 bg-muted p-2 rounded">
                          <strong>Retorno:</strong> {amostra.retorno}
                        </p>
                      )}
                     </div>
                     <div className="flex gap-2">
                       <Button
                         size="sm"
                         variant="ghost"
                         onClick={() => loadHistorico(amostra.cliente_id)}
                       >
                         <History className="h-4 w-4" />
                       </Button>
                       <Button
                         size="sm"
                         variant="ghost"
                         onClick={() => handleEdit(amostra)}
                       >
                         <Pencil className="h-4 w-4" />
                       </Button>
                       <Button
                         size="sm"
                         variant="ghost"
                         onClick={() => setDeleteAmostra(amostra)}
                       >
                         <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                       {amostra.status === 'pendente' && (
                         <>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => {
                               const retorno = prompt("Qual foi o retorno do cliente?");
                               if (retorno) handleUpdateStatus(amostra.id, 'positivo', retorno);
                             }}
                           >
                             Positivo
                           </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => {
                               const retorno = prompt("Qual foi o retorno do cliente?");
                               if (retorno) handleUpdateStatus(amostra.id, 'negativo', retorno);
                             }}
                           >
                             Negativo
                           </Button>
                         </>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </CardContent>
       </Card>
        </TabsContent>

        <TabsContent value="estoque">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5 text-primary" />
                Controle de Estoque
              </CardTitle>
              <CardDescription>Movimentações de entrada e saída</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <ListLoadingSkeleton count={3} type="produto" />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {produtos.slice(0, 20).map((produto: any) => (
                      <Card key={produto.id}>
                        <CardContent className="pt-6">
                          <h3 className="font-semibold mb-2">{produto.nome}</h3>
                          <p className="text-2xl font-bold text-primary">
                            {produto.estoque_escritorio || 0} unidades
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Últimas Movimentações</h3>
                    <div className="space-y-2">
                      {movimentacoes.slice(0, 20).map((mov: any) => (
                        <div key={mov.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{mov.produtos?.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {mov.observacao || "Sem observação"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                              {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(mov.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteAmostra} onOpenChange={(open) => !open && setDeleteAmostra(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta amostra? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!historicoCliente} onOpenChange={(open) => !open && setHistoricoCliente(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Histórico do Cliente</DialogTitle>
            <DialogDescription>Todas as interações e observações registradas</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3">
            {historico.map((h) => (
              <div key={h.id} className="border-l-2 border-primary pl-4 py-2">
                <p className="text-sm font-medium">{h.observacao}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleString('pt-BR')} • {h.tipo}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
     </div>
   );
 };
 
 export default EstoqueAmostras;
