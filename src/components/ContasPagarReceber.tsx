import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingDown, TrendingUp, Calendar, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

type Conta = {
  id: string;
  tipo: "receita" | "despesa";
  tipo_transacao: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status_pagamento: string;
  categoria: string | null;
  observacoes: string | null;
  beneficiario: string | null;
};

export const ContasPagarReceber = () => {
  const [contas, setContas] = useState<Conta[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const { toast } = useToast();

  const [form, setForm] = useState({
    tipo: "despesa" as "receita" | "despesa",
    tipo_transacao: "conta_pagar" as string,
    descricao: "",
    valor: "",
    data_vencimento: new Date().toISOString().split("T")[0],
    categoria: "",
    observacoes: "",
    beneficiario: "",
  });

  useEffect(() => {
    loadContas();
  }, []);

  const loadContas = async () => {
    const { data, error } = await supabase
      .from("financeiro")
      .select("*")
      .in("tipo_transacao", ["conta_pagar", "conta_receber"])
      .order("data_vencimento", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar contas", variant: "destructive" });
    } else {
      setContas(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("financeiro").insert({
      tipo: form.tipo,
      tipo_transacao: form.tipo_transacao,
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      data: form.data_vencimento,
      data_vencimento: form.data_vencimento,
      categoria: form.categoria || null,
      observacoes: form.observacoes || null,
      beneficiario: form.beneficiario || null,
      status_pagamento: "pendente",
      usuario_id: user?.id,
    });

    if (error) {
      toast({ title: "Erro ao criar conta", variant: "destructive" });
    } else {
      toast({ title: "Conta criada com sucesso!" });
      setOpen(false);
      loadContas();
      setForm({
        tipo: "despesa",
        tipo_transacao: "conta_pagar",
        descricao: "",
        valor: "",
        data_vencimento: new Date().toISOString().split("T")[0],
        categoria: "",
        observacoes: "",
        beneficiario: "",
      });
    }
  };

  const marcarComoPago = async (id: string) => {
    const { error } = await supabase
      .from("financeiro")
      .update({ status_pagamento: "pago" })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } else {
      toast({ title: "Status atualizado com sucesso!" });
      loadContas();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;

    const { error } = await supabase.from("financeiro").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir conta", variant: "destructive" });
    } else {
      toast({ title: "Conta excluída com sucesso!" });
      loadContas();
    }
  };

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diasAteVencimento = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 3600 * 24));

    if (status === "pago") {
      return <Badge className="bg-success/20 text-success border-success/30"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
    } else if (diasAteVencimento < 0) {
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Atrasado</Badge>;
    } else if (diasAteVencimento <= 5) {
      return <Badge className="bg-warning/20 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" />Vence em breve</Badge>;
    } else {
      return <Badge className="bg-primary/20 text-primary border-primary/30"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  const contasFiltradas = contas.filter((conta) => {
    if (filtroStatus === "todos") return true;
    if (filtroStatus === "pendente") {
      const hoje = new Date();
      const vencimento = new Date(conta.data_vencimento);
      return conta.status_pagamento === "pendente" && vencimento >= hoje;
    }
    if (filtroStatus === "atrasado") {
      const hoje = new Date();
      const vencimento = new Date(conta.data_vencimento);
      return conta.status_pagamento === "pendente" && vencimento < hoje;
    }
    return conta.status_pagamento === filtroStatus;
  });

  const contasPagar = contasFiltradas.filter((c) => c.tipo_transacao === "conta_pagar");
  const contasReceber = contasFiltradas.filter((c) => c.tipo_transacao === "conta_receber");

  const totalPagar = contasPagar
    .filter((c) => c.status_pagamento === "pendente")
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const totalReceber = contasReceber
    .filter((c) => c.status_pagamento === "pendente")
    .reduce((acc, c) => acc + Number(c.valor), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filtroStatus === "todos" ? "default" : "outline"}
            onClick={() => setFiltroStatus("todos")}
          >
            Todos
          </Button>
          <Button
            variant={filtroStatus === "pendente" ? "default" : "outline"}
            onClick={() => setFiltroStatus("pendente")}
          >
            Pendentes
          </Button>
          <Button
            variant={filtroStatus === "atrasado" ? "default" : "outline"}
            onClick={() => setFiltroStatus("atrasado")}
          >
            Atrasados
          </Button>
          <Button
            variant={filtroStatus === "pago" ? "default" : "outline"}
            onClick={() => setFiltroStatus("pago")}
          >
            Pagos
          </Button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Conta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.tipo_transacao}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      tipo_transacao: value,
                      tipo: value === "conta_pagar" ? "despesa" : "receita",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conta_pagar">Conta a Pagar</SelectItem>
                    <SelectItem value="conta_receber">Conta a Receber</SelectItem>
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
                <Label>Beneficiário/Pagador</Label>
                <Input
                  value={form.beneficiario}
                  onChange={(e) => setForm({ ...form, beneficiario: e.target.value })}
                  placeholder="Nome da empresa ou pessoa"
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
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  required
                  value={form.data_vencimento}
                  onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  placeholder="Ex: Fornecedores, Clientes, etc."
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Salvar Conta
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-destructive/30 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TrendingDown className="h-5 w-5" />
              Total a Pagar (Pendente)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              R$ {totalPagar.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/30 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <TrendingUp className="h-5 w-5" />
              Total a Receber (Pendente)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              R$ {totalReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-primary/20 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Contas a Pagar
            </CardTitle>
            <CardDescription>{contasPagar.length} conta(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : contasPagar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhuma conta a pagar</div>
            ) : (
              <div className="space-y-3">
                {contasPagar.map((conta) => (
                  <div
                    key={conta.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium">{conta.descricao}</div>
                        {conta.beneficiario && (
                          <div className="text-sm text-muted-foreground">{conta.beneficiario}</div>
                        )}
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          Vencimento: {format(new Date(conta.data_vencimento), "dd/MM/yyyy")}
                        </div>
                        {conta.categoria && (
                          <div className="text-xs text-muted-foreground mt-1">{conta.categoria}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-destructive">
                          R$ {Number(conta.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                        {getStatusBadge(conta.status_pagamento, conta.data_vencimento)}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {conta.status_pagamento === "pendente" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => marcarComoPago(conta.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Marcar como Pago
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(conta.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Contas a Receber
            </CardTitle>
            <CardDescription>{contasReceber.length} conta(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : contasReceber.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhuma conta a receber</div>
            ) : (
              <div className="space-y-3">
                {contasReceber.map((conta) => (
                  <div
                    key={conta.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium">{conta.descricao}</div>
                        {conta.beneficiario && (
                          <div className="text-sm text-muted-foreground">{conta.beneficiario}</div>
                        )}
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          Vencimento: {format(new Date(conta.data_vencimento), "dd/MM/yyyy")}
                        </div>
                        {conta.categoria && (
                          <div className="text-xs text-muted-foreground mt-1">{conta.categoria}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-success">
                          R$ {Number(conta.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                        {getStatusBadge(conta.status_pagamento, conta.data_vencimento)}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {conta.status_pagamento === "pendente" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => marcarComoPago(conta.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Marcar como Recebido
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(conta.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
