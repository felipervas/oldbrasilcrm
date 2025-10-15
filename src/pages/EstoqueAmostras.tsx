import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Amostra {
  id: string;
  cliente_id: string;
  produto_id: string;
  quantidade: number;
  data_entrega: string;
  responsavel_id: string;
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
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    cliente_id: "",
    produto_id: "",
    quantidade: "",
    data_entrega: new Date().toISOString().split('T')[0],
    status: "pendente",
    retorno: "",
    observacoes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [amostrasRes, clientesRes, produtosRes] = await Promise.all([
        supabase
          .from("amostras")
          .select("*, clientes(nome_fantasia), produtos(nome)")
          .order("data_entrega", { ascending: false }),
        supabase.from("clientes").select("id, nome_fantasia").order("nome_fantasia"),
        supabase.from("produtos").select("id, nome").eq("ativo", true).order("nome"),
      ]);

      if (amostrasRes.error) throw amostrasRes.error;
      if (clientesRes.error) throw clientesRes.error;
      if (produtosRes.error) throw produtosRes.error;

      setAmostras(amostrasRes.data || []);
      setClientes(clientesRes.data || []);
      setProdutos(produtosRes.data || []);
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

      const { error } = await supabase.from("amostras").insert({
        ...formData,
        quantidade: parseFloat(formData.quantidade),
        responsavel_id: user.id,
      });

      if (error) throw error;

      toast({ title: "Amostra registrada com sucesso!" });
      setDialogOpen(false);
      setFormData({
        cliente_id: "",
        produto_id: "",
        quantidade: "",
        data_entrega: new Date().toISOString().split('T')[0],
        status: "pendente",
        retorno: "",
        observacoes: "",
      });
      loadData();
    } catch (error: any) {
      console.error("Erro ao registrar amostra:", error);
      toast({ title: "Erro ao registrar amostra", variant: "destructive" });
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

  const amostrasFiltered = amostras.filter(a =>
    a.clientes?.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.produtos?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
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
              Gerencie amostras entregues aos clientes
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Amostra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Nova Amostra</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label>Produto *</Label>
                  <Select
                    value={formData.produto_id}
                    onValueChange={(value) => setFormData({ ...formData, produto_id: value })}
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
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade (gramas) *</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                    placeholder="Ex: 500"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Digite em gramas (ex: 500g)</p>
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
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais sobre a amostra..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Amostra</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
            <div className="text-center py-8">Carregando...</div>
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
                    {amostra.status === 'pendente' && (
                      <div className="flex gap-2">
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
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EstoqueAmostras;
