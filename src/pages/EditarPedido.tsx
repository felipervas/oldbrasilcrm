import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, Plus, Trash2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Combobox } from "@/components/ui/combobox";

interface ProdutoItem {
  id?: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  observacoes?: string;
  tabela_preco_id?: string;
  tabela_preco_nome?: string;
}

const EditarPedido = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<any>(null);
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [produtosEscolhidos, setProdutosEscolhidos] = useState<ProdutoItem[]>([]);
  const [tabelasProduto, setTabelasProduto] = useState<any[]>([]);
  const [selectedProduto, setSelectedProduto] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [precoUnitario, setPrecoUnitario] = useState(0);
  const [observacoesProduto, setObservacoesProduto] = useState("");
  const [tabelaSelecionada, setTabelaSelecionada] = useState("");
  const [isVendidoPorKg, setIsVendidoPorKg] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: "",
    numero_pedido: "",
    data_pedido: "",
    status: "",
    forma_pagamento: "",
    parcelas: "",
    dias_pagamento: "",
    observacoes: "",
    observacoes_internas: "",
    responsavel_venda_id: "",
    tipo_frete: "",
    transportadora: "",
    data_previsao_entrega: "",
    data_entrega_realizada: "",
    observacoes_entrega: "",
  });

  useEffect(() => {
    loadPedido();
    loadResponsaveis();
    loadClientes();
    loadProdutos();
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

  const loadClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome_fantasia")
      .eq("ativo", true)
      .order("nome_fantasia");
    setClientes(data || []);
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
        tipo_venda,
        marcas(nome)
      `)
      .eq("ativo", true)
      .order("nome");
    setProdutos(data || []);
  };

  const loadPedido = async () => {
    if (!id) return;

    setLoading(true);
    
    // Carregar dados do pedido
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
      cliente_id: data.cliente_id || "",
      numero_pedido: data.numero_pedido || "",
      data_pedido: data.data_pedido || "",
      status: data.status || "pendente",
      forma_pagamento: data.forma_pagamento || "",
      parcelas: data.parcelas?.toString() || "",
      dias_pagamento: data.dias_pagamento || "",
      observacoes: data.observacoes || "",
      observacoes_internas: data.observacoes_internas || "",
      responsavel_venda_id: data.responsavel_venda_id || "",
      tipo_frete: data.tipo_frete || "",
      transportadora: data.transportadora || "",
      data_previsao_entrega: data.data_previsao_entrega || "",
      data_entrega_realizada: data.data_entrega_realizada || "",
      observacoes_entrega: data.observacoes_entrega || "",
    });

    // Carregar produtos do pedido
    const { data: produtosPedido, error: produtosError } = await supabase
      .from("pedidos_produtos")
      .select(`
        id,
        produto_id,
        quantidade,
        preco_unitario,
        observacoes,
        tabela_preco_id,
        produtos(nome),
        produto_tabelas_preco(nome_tabela)
      `)
      .eq("pedido_id", id);

    if (!produtosError && produtosPedido) {
      const produtosFormatados: ProdutoItem[] = produtosPedido.map(p => ({
        id: p.id,
        produto_id: p.produto_id,
        nome: (p.produtos as any)?.nome || "",
        quantidade: p.quantidade,
        preco_unitario: p.preco_unitario,
        observacoes: p.observacoes || undefined,
        tabela_preco_id: p.tabela_preco_id || undefined,
        tabela_preco_nome: (p.produto_tabelas_preco as any)?.nome_tabela || undefined,
      }));
      setProdutosEscolhidos(produtosFormatados);
    }

    setLoading(false);
  };

  const calcularTotal = () => {
    return produtosEscolhidos.reduce((total, item) => 
      total + (item.quantidade * item.preco_unitario), 0
    );
  };

  const adicionarProduto = () => {
    if (!selectedProduto) {
      toast({ title: "Selecione um produto", variant: "destructive" });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const valorTotal = calcularTotal();

      // Atualizar dados do pedido
      const { error: pedidoError } = await supabase
        .from("pedidos")
        .update({
          cliente_id: formData.cliente_id || null,
          numero_pedido: formData.numero_pedido || null,
          data_pedido: formData.data_pedido || null,
          valor_total: valorTotal,
          status: formData.status,
          forma_pagamento: formData.forma_pagamento || null,
          parcelas: formData.parcelas ? parseInt(formData.parcelas) : null,
          dias_pagamento: formData.dias_pagamento || null,
          observacoes: formData.observacoes || null,
          observacoes_internas: formData.observacoes_internas || null,
          responsavel_venda_id: formData.responsavel_venda_id || null,
          tipo_frete: formData.tipo_frete || null,
          transportadora: formData.transportadora || null,
          data_previsao_entrega: formData.data_previsao_entrega || null,
          data_entrega_realizada: formData.data_entrega_realizada || null,
          observacoes_entrega: formData.observacoes_entrega || null,
        })
        .eq("id", id);

      if (pedidoError) throw pedidoError;

      // Deletar produtos antigos
      const { error: deleteError } = await supabase
        .from("pedidos_produtos")
        .delete()
        .eq("pedido_id", id);

      if (deleteError) throw deleteError;

      // Inserir produtos atualizados
      if (produtosEscolhidos.length > 0) {
        const produtosInsert = produtosEscolhidos.map(p => ({
          pedido_id: id,
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
      }

      toast({ title: "✅ Pedido atualizado com sucesso!" });
      navigate("/pedidos");
    } catch (error: any) {
      console.error("Erro ao atualizar:", error);
      toast({ 
        title: "❌ Erro ao atualizar pedido", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Cliente *</Label>
              <Combobox
                options={clientes.map(c => ({ value: c.id, label: c.nome_fantasia }))}
                value={formData.cliente_id}
                onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                placeholder="Selecione um cliente..."
                searchPlaceholder="Buscar cliente..."
                emptyText="Nenhum cliente encontrado."
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Status e Pagamento</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produtos do Pedido
              </h3>
              
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <Label className="text-xs">Produto</Label>
                    <Combobox
                      options={produtos.map(p => ({
                        value: p.id,
                        label: `${p.nome}${(p as any).marcas?.nome ? ` - ${(p as any).marcas.nome}` : ''}`
                      }))}
                      value={selectedProduto}
                      onValueChange={async (v) => {
                        setSelectedProduto(v);
                        const prod = produtos.find(p => p.id === v);
                        
                        const vendePorKg = (prod as any)?.tipo_venda === 'kg';
                        setIsVendidoPorKg(vendePorKg);
                        
                        const { data: tabelas } = await supabase
                          .from('produto_tabelas_preco')
                          .select('*')
                          .eq('produto_id', v)
                          .eq('ativo', true)
                          .order('nome_tabela');
                        
                        setTabelasProduto(tabelas || []);
                        setTabelaSelecionada("");
                        
                        if (tabelas && tabelas.length > 0) {
                          setTabelaSelecionada(tabelas[0].id);
                          const precoJaETotal = !prod?.preco_por_kg && !vendePorKg;
                          
                          if (vendePorKg || precoJaETotal) {
                            setPrecoUnitario(tabelas[0].preco_por_kg);
                          } else {
                            const pesoEmb = prod?.peso_embalagem_kg || 1;
                            setPrecoUnitario(tabelas[0].preco_por_kg * pesoEmb);
                          }
                        } else if (prod?.preco_por_kg) {
                          if (vendePorKg) {
                            setPrecoUnitario(parseFloat(prod.preco_por_kg));
                          } else {
                            const pesoEmb = prod?.peso_embalagem_kg || 1;
                            setPrecoUnitario(parseFloat(prod.preco_por_kg) * pesoEmb);
                          }
                        } else if (prod?.preco_base) {
                          setPrecoUnitario(parseFloat(prod.preco_base));
                        }
                      }}
                      placeholder="Buscar produto..."
                      searchPlaceholder="Digite o nome..."
                      emptyText="Nenhum produto encontrado."
                    />
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
                              setPrecoUnitario(tabela.preco_por_kg);
                            } else {
                              const pesoEmb = prod?.peso_embalagem_kg || 1;
                              setPrecoUnitario(tabela.preco_por_kg * pesoEmb);
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="border-green-200 bg-green-50/50">
                          <SelectValue placeholder="Escolher tabela..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tabelasProduto.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nome_tabela} - R$ {t.preco_por_kg.toFixed(2)}/{t.unidade_medida || 'kg'}
                            </SelectItem>
                          ))}
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
                      onChange={(e) => setQuantidade(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Preço</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={precoUnitario}
                      onChange={(e) => setPrecoUnitario(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1 flex items-end">
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
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produtosEscolhidos.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.nome}</div>
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
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                          <TableCell className="text-right">
                            R$ {item.preco_unitario.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removerProduto(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Responsável e Frete</h3>
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="CIF">CIF (Vendedor paga)</SelectItem>
                      <SelectItem value="FOB">FOB (Cliente paga)</SelectItem>
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
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Datas de Entrega</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="data_previsao_entrega">Previsão de Entrega</Label>
                  <Input
                    id="data_previsao_entrega"
                    type="date"
                    value={formData.data_previsao_entrega}
                    onChange={(e) => setFormData({ ...formData, data_previsao_entrega: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="data_entrega_realizada">Data de Entrega Realizada</Label>
                  <Input
                    id="data_entrega_realizada"
                    type="date"
                    value={formData.data_entrega_realizada}
                    onChange={(e) => setFormData({ ...formData, data_entrega_realizada: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="observacoes_entrega">Observações de Entrega</Label>
                  <Input
                    id="observacoes_entrega"
                    value={formData.observacoes_entrega}
                    onChange={(e) => setFormData({ ...formData, observacoes_entrega: e.target.value })}
                    placeholder="Ex: Entregar pela manhã"
                  />
                </div>
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
