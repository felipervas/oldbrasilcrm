import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EditarPedido = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<any>(null);
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    numero_pedido: "",
    data_pedido: "",
    valor_total: "",
    status: "",
    forma_pagamento: "",
    parcelas: "",
    dias_pagamento: "",
    observacoes: "",
    observacoes_internas: "",
    responsavel_venda_id: "",
    tipo_frete: "",
    transportadora: "",
  });

  useEffect(() => {
    loadPedido();
    loadResponsaveis();
  }, [id]);

  const loadResponsaveis = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome")
      .order("nome");

    if (!error && data) {
      setResponsaveis(data);
    }
  };

  const loadPedido = async () => {
    if (!id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("pedidos")
      .select("*, clientes(nome_fantasia)")
      .eq("id", id)
      .single();

    if (error) {
      toast({ title: "Erro ao carregar pedido", variant: "destructive" });
      navigate("/pedidos");
      return;
    }

    setPedido(data);
    setFormData({
      numero_pedido: data.numero_pedido || "",
      data_pedido: data.data_pedido || "",
      valor_total: data.valor_total?.toString() || "",
      status: data.status || "pendente",
      forma_pagamento: data.forma_pagamento || "",
      parcelas: data.parcelas?.toString() || "",
      dias_pagamento: data.dias_pagamento || "",
      observacoes: data.observacoes || "",
      observacoes_internas: data.observacoes_internas || "",
      responsavel_venda_id: data.responsavel_venda_id || "",
      tipo_frete: data.tipo_frete || "",
      transportadora: data.transportadora || "",
    });
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("pedidos")
      .update({
        numero_pedido: formData.numero_pedido || null,
        data_pedido: formData.data_pedido || null,
        valor_total: formData.valor_total ? parseFloat(formData.valor_total) : null,
        status: formData.status,
        forma_pagamento: formData.forma_pagamento || null,
        parcelas: formData.parcelas ? parseInt(formData.parcelas) : null,
        dias_pagamento: formData.dias_pagamento || null,
        observacoes: formData.observacoes || null,
        observacoes_internas: formData.observacoes_internas || null,
        responsavel_venda_id: formData.responsavel_venda_id || null,
        tipo_frete: formData.tipo_frete || null,
        transportadora: formData.transportadora || null,
      })
      .eq("id", id);

    setLoading(false);

    if (error) {
      toast({ title: "Erro ao atualizar pedido", variant: "destructive" });
    } else {
      toast({ title: "Pedido atualizado com sucesso!" });
      navigate("/pedidos");
    }
  };

  if (loading || !pedido) {
    return (
      <div className="flex-1 p-8">
        <p className="text-center text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <Button variant="ghost" size="icon" onClick={() => navigate("/pedidos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Editar Pedido
          </h1>
          <p className="text-muted-foreground">
            {pedido.clientes?.nome_fantasia}
          </p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Informações do Pedido</CardTitle>
          <CardDescription>Atualize os dados do pedido</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numero_pedido">Número do Pedido</Label>
                <Input
                  id="numero_pedido"
                  value={formData.numero_pedido}
                  onChange={(e) => setFormData({ ...formData, numero_pedido: e.target.value })}
                  placeholder="Ex: PED-001"
                />
              </div>
              <div>
                <Label htmlFor="data_pedido">Data do Pedido</Label>
                <Input
                  id="data_pedido"
                  type="date"
                  value={formData.data_pedido}
                  onChange={(e) => setFormData({ ...formData, data_pedido: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="valor_total">Valor Total</Label>
              <Input
                id="valor_total"
                type="number"
                step="0.01"
                value={formData.valor_total}
                onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
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
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                <Select
                  value={formData.forma_pagamento}
                  onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value })}
                >
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
                  type="number"
                  min="1"
                  value={formData.parcelas}
                  onChange={(e) => setFormData({ ...formData, parcelas: e.target.value })}
                  placeholder="Ex: 3"
                />
              </div>
              <div>
                <Label htmlFor="dias_pagamento">Dias de Pagamento</Label>
                <Input
                  id="dias_pagamento"
                  value={formData.dias_pagamento}
                  onChange={(e) => setFormData({ ...formData, dias_pagamento: e.target.value })}
                  placeholder="Ex: 30/60/90"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="responsavel_venda">Responsável pela Venda</Label>
              <Select
                value={formData.responsavel_venda_id}
                onValueChange={(value) => setFormData({ ...formData, responsavel_venda_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo_frete">Tipo de Frete</Label>
                <Select
                  value={formData.tipo_frete}
                  onValueChange={(value) => setFormData({ ...formData, tipo_frete: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cif">CIF (Vendedor paga)</SelectItem>
                    <SelectItem value="fob">FOB (Cliente paga)</SelectItem>
                    <SelectItem value="cliente">Cliente cuida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="transportadora">Transportadora</Label>
                <Input
                  id="transportadora"
                  value={formData.transportadora}
                  onChange={(e) => setFormData({ ...formData, transportadora: e.target.value })}
                  placeholder="Nome da transportadora"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações (aparecem na impressão)</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações que serão impressas no pedido..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="observacoes_internas">Observações Internas (apenas CRM)</Label>
              <Textarea
                id="observacoes_internas"
                value={formData.observacoes_internas}
                onChange={(e) => setFormData({ ...formData, observacoes_internas: e.target.value })}
                placeholder="Observações internas que não aparecem na impressão..."
                rows={3}
                className="border-orange-200 focus:border-orange-400"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/pedidos")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditarPedido;
