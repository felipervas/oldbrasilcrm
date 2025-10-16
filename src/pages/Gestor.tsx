import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, TrendingUp, TrendingDown, Upload, Trash2, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FinanceiroBoletos } from "@/components/FinanceiroBoletos";

type Transacao = {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  data: string;
  categoria: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  observacoes: string | null;
};

const Financeiro = () => {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    tipo: "receita" as "receita" | "despesa",
    descricao: "",
    valor: "",
    data: new Date().toISOString().split("T")[0],
    categoria: "",
    observacoes: "",
    arquivo: null as File | null,
  });

  useEffect(() => {
    loadTransacoes();
  }, []);

  const loadTransacoes = async () => {
    const { data, error } = await supabase
      .from("financeiro")
      .select("*")
      .order("data", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar transações", variant: "destructive" });
    } else {
      setTransacoes(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    let arquivo_url = null;
    let arquivo_nome = null;

    if (form.arquivo) {
      const fileName = `${Date.now()}_${form.arquivo.name}`;
      const { error: uploadError } = await supabase.storage
        .from("pedidos")
        .upload(fileName, form.arquivo);

      if (uploadError) {
        toast({ title: "Erro ao fazer upload do arquivo", variant: "destructive" });
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("pedidos")
        .getPublicUrl(fileName);

      arquivo_url = urlData.publicUrl;
      arquivo_nome = form.arquivo.name;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("financeiro").insert({
      tipo: form.tipo,
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      data: form.data,
      categoria: form.categoria || null,
      observacoes: form.observacoes || null,
      arquivo_url,
      arquivo_nome,
      usuario_id: user?.id,
    });

    if (error) {
      toast({ title: "Erro ao criar transação", variant: "destructive" });
    } else {
      toast({ title: "Transação criada com sucesso!" });
      setOpen(false);
      loadTransacoes();
      setForm({
        tipo: "receita",
        descricao: "",
        valor: "",
        data: new Date().toISOString().split("T")[0],
        categoria: "",
        observacoes: "",
        arquivo: null,
      });
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    const { error } = await supabase.from("financeiro").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir transação", variant: "destructive" });
    } else {
      toast({ title: "Transação excluída com sucesso!" });
      loadTransacoes();
    }
  };

  const totalReceitas = transacoes
    .filter((t) => t.tipo === "receita")
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const totalDespesas = transacoes
    .filter((t) => t.tipo === "despesa")
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const saldo = totalReceitas - totalDespesas;

  // Dados para gráficos
  const dadosPorMes = transacoes.reduce((acc, t) => {
    const mes = format(new Date(t.data), "MMM/yy");
    if (!acc[mes]) {
      acc[mes] = { mes, receitas: 0, despesas: 0 };
    }
    if (t.tipo === "receita") {
      acc[mes].receitas += Number(t.valor);
    } else {
      acc[mes].despesas += Number(t.valor);
    }
    return acc;
  }, {} as Record<string, { mes: string; receitas: number; despesas: number }>);

  const dadosGrafico = Object.values(dadosPorMes).reverse();

  const dadosPizza = [
    { name: "Receitas", value: totalReceitas },
    { name: "Despesas", value: totalDespesas },
  ];

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

  return (
    <div className="p-6 space-y-6 bg-gradient-subtle min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <SidebarTrigger />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Gestão de receitas, despesas e boletos</p>
        </div>
      </div>

      <Tabs defaultValue="transacoes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
          <TabsTrigger value="boletos">
            <Receipt className="h-4 w-4 mr-2" />
            Boletos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transacoes" className="space-y-6">
      

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/20 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>
              R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-primary/20 shadow-elegant">
          <CardHeader>
            <CardTitle>Receitas vs Despesas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="receitas" fill="hsl(var(--chart-1))" name="Receitas" />
                <Bar dataKey="despesas" fill="hsl(var(--chart-2))" name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant">
          <CardHeader>
            <CardTitle>Distribuição</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosPizza}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: R$ ${entry.value.toLocaleString("pt-BR")}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosPizza.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transações</CardTitle>
              <CardDescription>Histórico de receitas e despesas</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova Transação</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(value: "receita" | "despesa") => setForm({ ...form, tipo: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      required
                      value={form.descricao}
                      onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={form.valor}
                      onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input
                      type="date"
                      required
                      value={form.data}
                      onChange={(e) => setForm({ ...form, data: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Input
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      placeholder="Ex: Vendas, Salários, etc."
                    />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={form.observacoes}
                      onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Anexar Arquivo</Label>
                    <Input
                      type="file"
                      onChange={(e) => setForm({ ...form, arquivo: e.target.files?.[0] || null })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={uploading}>
                    {uploading ? "Salvando..." : "Salvar Transação"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : transacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma transação cadastrada</div>
          ) : (
            <div className="space-y-4">
              {transacoes.map((transacao) => (
                <div
                  key={transacao.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-full ${transacao.tipo === "receita" ? "bg-success/20" : "bg-destructive/20"}`}>
                      {transacao.tipo === "receita" ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{transacao.descricao}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(transacao.data), "dd/MM/yyyy")}
                        {transacao.categoria && ` • ${transacao.categoria}`}
                      </div>
                      {transacao.observacoes && (
                        <div className="text-sm text-muted-foreground mt-1">{transacao.observacoes}</div>
                      )}
                      {transacao.arquivo_nome && (
                        <a
                          href={transacao.arquivo_url || ""}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          <Upload className="h-3 w-3" />
                          {transacao.arquivo_nome}
                        </a>
                      )}
                    </div>
                    <div className={`text-lg font-bold ${transacao.tipo === "receita" ? "text-success" : "text-destructive"}`}>
                      {transacao.tipo === "receita" ? "+" : "-"}R$ {Number(transacao.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(transacao.id)}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="boletos">
          <FinanceiroBoletos />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Financeiro;
