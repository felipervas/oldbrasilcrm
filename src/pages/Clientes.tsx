import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Users, MessageCircle, Edit, FileText, UserPlus, Upload, Trash2, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClienteProdutosHistorico } from "@/components/ClienteProdutosHistorico";

const Clientes = () => {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pedidoOpen, setPedidoOpen] = useState(false);
  const [contatoOpen, setContatoOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [contatos, setContatos] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome_fantasia: "",
    razao_social: "",
    cnpj_cpf: "",
    email: "",
    telefone: "",
    cep: "",
    logradouro: "",
    numero: "",
    cidade: "",
    uf: "",
    segmento: "",
    tamanho: "",
    observacoes: "",
    historico_pedidos: "",
    aniversario: "",
  });

  const [pedidoData, setPedidoData] = useState({
    numero_pedido: "",
    data_pedido: "",
    valor_total: "",
    status: "pendente",
    observacoes: "",
  });

  const [contatoData, setContatoData] = useState({
    nome: "",
    cargo: "",
    email: "",
    telefone: "",
    aniversario: "",
    observacoes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para adicionar clientes",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("clientes").insert({
        ...formData,
        aniversario: formData.aniversario || null,
        responsavel_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Cliente adicionado com sucesso",
      });

      setFormData({
        nome_fantasia: "",
        razao_social: "",
        cnpj_cpf: "",
        email: "",
        telefone: "",
        cep: "",
        logradouro: "",
        numero: "",
        cidade: "",
        uf: "",
        segmento: "",
        tamanho: "",
        observacoes: "",
        historico_pedidos: "",
        aniversario: "",
      });
      setOpen(false);
      loadClientes();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar cliente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("*, profiles(nome)")
      .order("created_at", { ascending: false });
    if (data) setClientes(data);
  };

  const checkUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("perfil")
        .eq("id", user.id)
        .single();
      return profile?.perfil === "gestor" || profile?.perfil === "admin";
    }
    return false;
  };

  const [isGestor, setIsGestor] = useState(false);

  useEffect(() => {
    checkUserProfile().then(setIsGestor);
  }, []);

  const handleDelete = async (clienteId: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.")) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
      if (error) throw error;
      
      toast({ title: "Cliente excluído com sucesso!" });
      loadClientes();
    } catch (error: any) {
      console.error("Erro ao excluir cliente:", error);
      toast({ 
        title: "Erro ao excluir cliente", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const loadResponsaveis = async () => {
    const { data } = await supabase.from("profiles").select("id, nome").order("nome");
    if (data) setResponsaveis(data);
  };

  const loadPedidos = async (clienteId: string) => {
    const { data } = await supabase
      .from("pedidos")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("data_pedido", { ascending: false });
    if (data) setPedidos(data);
  };

  const loadContatos = async (clienteId: string) => {
    const { data } = await supabase
      .from("contatos_clientes")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("nome");
    if (data) setContatos(data);
  };

  const handleEdit = (cliente: any) => {
    setClienteSelecionado(cliente);
    setFormData({
      nome_fantasia: cliente.nome_fantasia || "",
      razao_social: cliente.razao_social || "",
      cnpj_cpf: cliente.cnpj_cpf || "",
      email: cliente.email || "",
      telefone: cliente.telefone || "",
      cep: cliente.cep || "",
      logradouro: cliente.logradouro || "",
      numero: cliente.numero || "",
      cidade: cliente.cidade || "",
      uf: cliente.uf || "",
      segmento: cliente.segmento || "",
      tamanho: cliente.tamanho || "",
      observacoes: cliente.observacoes || "",
      historico_pedidos: cliente.historico_pedidos || "",
      aniversario: cliente.aniversario || "",
    });
    setEditOpen(true);
    loadPedidos(cliente.id);
    loadContatos(cliente.id);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSelecionado) return;
    
    setLoading(true);
    const { error } = await supabase
      .from("clientes")
      .update({
        ...formData,
        aniversario: formData.aniversario || null,
      })
      .eq("id", clienteSelecionado.id);

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao atualizar cliente", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente atualizado com sucesso!" });
      setEditOpen(false);
      loadClientes();
    }
  };

  const handleAddPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSelecionado || !selectedFile) {
      toast({ title: "Selecione um arquivo PDF", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${clienteSelecionado.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pedidos')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('pedidos').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("pedidos").insert({
        cliente_id: clienteSelecionado.id,
        numero_pedido: pedidoData.numero_pedido || null,
        data_pedido: pedidoData.data_pedido || null,
        valor_total: pedidoData.valor_total ? parseFloat(pedidoData.valor_total) : null,
        status: pedidoData.status,
        observacoes: pedidoData.observacoes || null,
        arquivo_url: urlData.publicUrl,
        arquivo_nome: selectedFile.name,
      });

      if (insertError) throw insertError;

      toast({ title: "Pedido adicionado com sucesso!" });
      setPedidoOpen(false);
      setPedidoData({ numero_pedido: "", data_pedido: "", valor_total: "", status: "pendente", observacoes: "" });
      setSelectedFile(null);
      loadPedidos(clienteSelecionado.id);
    } catch (error: any) {
      toast({ title: "Erro ao adicionar pedido", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddContato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSelecionado) return;

    setLoading(true);
    const { error } = await supabase.from("contatos_clientes").insert({
      cliente_id: clienteSelecionado.id,
      ...contatoData,
      aniversario: contatoData.aniversario || null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao adicionar contato", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contato adicionado com sucesso!" });
      setContatoOpen(false);
      setContatoData({ nome: "", cargo: "", email: "", telefone: "", aniversario: "", observacoes: "" });
      loadContatos(clienteSelecionado.id);
    }
  };

  const buscarCnpj = async () => {
    const cnpj = formData.cnpj_cpf.replace(/\D/g, "");
    if (cnpj.length !== 14) {
      toast({ title: "CNPJ inválido", description: "Digite um CNPJ válido com 14 dígitos", variant: "destructive" });
      return;
    }

    setLoadingCnpj(true);
    try {
      const { data, error } = await supabase.functions.invoke('buscar-cnpj', {
        body: { cnpj }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }

      setFormData({
        ...formData,
        razao_social: data.razao_social || "",
        nome_fantasia: data.nome_fantasia || data.razao_social || "",
        email: data.email || "",
        telefone: data.telefone || "",
        cep: data.cep?.replace(/\D/g, "") || "",
        logradouro: data.logradouro || "",
        numero: data.numero || "",
        cidade: data.cidade || "",
        uf: data.uf || "",
      });

      toast({ title: "Sucesso!", description: "Dados da empresa carregados" });
    } catch (error) {
      toast({ title: "Erro ao buscar CNPJ", description: "Tente novamente", variant: "destructive" });
    } finally {
      setLoadingCnpj(false);
    }
  };

  const buscarCep = async () => {
    const cep = formData.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      toast({ title: "CEP inválido", description: "Digite um CEP válido com 8 dígitos", variant: "destructive" });
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({ title: "CEP não encontrado", variant: "destructive" });
        return;
      }

      setFormData({
        ...formData,
        logradouro: data.logradouro || "",
        cidade: data.localidade || "",
        uf: data.uf || "",
      });

      toast({ title: "Sucesso!", description: "Endereço carregado" });
    } catch (error) {
      toast({ title: "Erro ao buscar CEP", description: "Tente novamente", variant: "destructive" });
    } finally {
      setLoadingCep(false);
    }
  };

  const handleChangeResponsavel = async (clienteId: string, novoResponsavelId: string) => {
    const { error } = await supabase
      .from("clientes")
      .update({ responsavel_id: novoResponsavelId })
      .eq("id", clienteId);

    if (error) {
      toast({ title: "Erro ao alterar responsável", variant: "destructive" });
    } else {
      toast({ title: "Responsável alterado com sucesso!" });
      loadClientes();
    }
  };

  const clientesFiltrados = clientes.filter(cliente => {
    const matchSearch = 
      cliente.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cnpj_cpf?.includes(searchTerm) ||
      cliente.telefone?.includes(searchTerm);

    const matchStatus = 
      filtroStatus === "todos" ? true :
      filtroStatus === "ativo" ? cliente.ativo === true :
      cliente.ativo === false;

    return matchSearch && matchStatus;
  });

  useEffect(() => {
    loadClientes();
    loadResponsaveis();
  }, []);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Clientes
            </h1>
            <p className="text-muted-foreground">
              Gerencie seus clientes e oportunidades
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_fantasia">Nome Fantasia *</Label>
                  <Input
                    id="nome_fantasia"
                    required
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social</Label>
                  <Input
                    id="razao_social"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj_cpf">CNPJ/CPF</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cnpj_cpf"
                      value={formData.cnpj_cpf}
                      onChange={(e) => setFormData({ ...formData, cnpj_cpf: e.target.value })}
                      placeholder="Digite o CNPJ"
                    />
                    <Button type="button" onClick={buscarCnpj} disabled={loadingCnpj} variant="outline">
                      {loadingCnpj ? "..." : "Buscar"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="Digite o CEP"
                    />
                    <Button type="button" onClick={buscarCep} disabled={loadingCep} variant="outline">
                      {loadingCep ? "..." : "Buscar"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input
                    id="logradouro"
                    value={formData.logradouro}
                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uf">UF</Label>
                  <Input
                    id="uf"
                    maxLength={2}
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="segmento">Segmento</Label>
                  <Input
                    id="segmento"
                    value={formData.segmento}
                    onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tamanho">Tamanho</Label>
                  <Input
                    id="tamanho"
                    value={formData.tamanho}
                    onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aniversario">Aniversário</Label>
                <Input
                  id="aniversario"
                  type="date"
                  value={formData.aniversario}
                  onChange={(e) => setFormData({ ...formData, aniversario: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="historico_pedidos">Histórico de Pedidos</Label>
                <Textarea
                  id="historico_pedidos"
                  placeholder="Ex: Último pedido em 10/2025 - 50kg Cacau Premium"
                  value={formData.historico_pedidos}
                  onChange={(e) => setFormData({ ...formData, historico_pedidos: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Cliente"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Lista de Clientes
          </CardTitle>
          <CardDescription>
            Todos os clientes cadastrados no sistema
          </CardDescription>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome, CNPJ, telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filtroStatus} onValueChange={(v: any) => setFiltroStatus(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {clientesFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum cliente cadastrado</p>
              <p className="text-sm mb-4">Comece adicionando seu primeiro cliente</p>
              <Button className="gap-2" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
                Adicionar Cliente
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {clientesFiltrados.map((cliente) => (
                <div key={cliente.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{cliente.nome_fantasia}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${cliente.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {cliente.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      {cliente.razao_social && (
                        <p className="text-sm text-muted-foreground">{cliente.razao_social}</p>
                      )}
                       <div className="mt-2 space-y-1 text-sm">
                         {cliente.cnpj_cpf && <p>🏢 {cliente.cnpj_cpf}</p>}
                         {cliente.email && <p>📧 {cliente.email}</p>}
                         {cliente.telefone && <p>📱 {cliente.telefone}</p>}
                        {cliente.cidade && cliente.uf && (
                          <p>📍 {cliente.cidade}/{cliente.uf}</p>
                        )}
                        {cliente.ultima_compra_data && (
                          <p>🛒 Última compra: {new Date(cliente.ultima_compra_data).toLocaleDateString('pt-BR')}</p>
                        )}
                        <p className="text-sm border-t pt-2 mt-2">
                          📦 <span className="font-medium">Total de pedidos:</span> <span className="font-bold">{cliente.total_pedidos || 0}</span>
                        </p>
                        {isGestor && cliente.total_comprado > 0 && (
                          <>
                            <p className="font-semibold text-primary">
                              💰 Total: {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(cliente.total_comprado)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Média/mês: {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(cliente.compra_mensal_media || 0)}
                            </p>
                          </>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">Responsável:</span>
                          <Select 
                            value={cliente.responsavel_id || ""} 
                            onValueChange={(v) => handleChangeResponsavel(cliente.id, v)}
                          >
                            <SelectTrigger className="h-7 w-[180px] text-xs">
                              <SelectValue placeholder="Selecione">
                                {cliente.profiles?.nome || "Sem responsável"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {responsaveis.map((resp) => (
                                <SelectItem key={resp.id} value={resp.id}>
                                  {resp.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">Status:</span>
                          <Select 
                            value={cliente.ativo ? "ativo" : "inativo"} 
                            onValueChange={async (v) => {
                              const { error } = await supabase
                                .from("clientes")
                                .update({ ativo: v === "ativo" })
                                .eq("id", cliente.id);
                              if (!error) {
                                toast({ title: "Status atualizado!" });
                                loadClientes();
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 w-[120px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ativo">Ativo</SelectItem>
                              <SelectItem value="inativo">Inativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(cliente)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {cliente.telefone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            const telefone = cliente.telefone.replace(/\D/g, '');
                            const mensagem = encodeURIComponent(`Olá ${cliente.nome_fantasia}! Tudo bem?`);
                            window.open(`https://wa.me/55${telefone}?text=${mensagem}`, '_blank');
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(cliente.id)}
                      >
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

      {/* Dialog de Edição de Cliente */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
              <TabsTrigger value="contatos">Contatos</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_nome_fantasia">Nome Fantasia *</Label>
                    <Input
                      id="edit_nome_fantasia"
                      required
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_razao_social">Razão Social</Label>
                    <Input
                      id="edit_razao_social"
                      value={formData.razao_social}
                      onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3">Endereço</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="edit_logradouro">Logradouro</Label>
                        <Input
                          id="edit_logradouro"
                          value={formData.logradouro}
                          onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_numero">Número</Label>
                        <Input
                          id="edit_numero"
                          value={formData.numero}
                          onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="edit_cep">CEP</Label>
                        <Input
                          id="edit_cep"
                          value={formData.cep}
                          onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_cidade">Cidade</Label>
                        <Input
                          id="edit_cidade"
                          value={formData.cidade}
                          onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_uf">UF</Label>
                        <Input
                          id="edit_uf"
                          value={formData.uf}
                          onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_email">Email</Label>
                    <Input
                      id="edit_email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_telefone">Telefone</Label>
                    <Input
                      id="edit_telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_aniversario">Aniversário</Label>
                  <Input
                    id="edit_aniversario"
                    type="date"
                    value={formData.aniversario}
                    onChange={(e) => setFormData({ ...formData, aniversario: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_observacoes">Observações</Label>
                  <Textarea
                    id="edit_observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={3}
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

            <TabsContent value="pedidos">
              <div className="space-y-4">
                <Button onClick={() => setPedidoOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Pedido
                </Button>
                <div className="space-y-3">
                  {pedidos.map((pedido) => (
                    <div key={pedido.id} className="border rounded p-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">{pedido.numero_pedido || "Sem número"}</p>
                          <p className="text-sm text-muted-foreground">
                            {pedido.data_pedido && new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                          </p>
                          {pedido.valor_total && <p className="text-sm">R$ {parseFloat(pedido.valor_total).toFixed(2)}</p>}
                        </div>
                        {pedido.arquivo_url && (
                          <Button variant="outline" size="sm" onClick={() => window.open(pedido.arquivo_url, '_blank')}>
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contatos">
              <div className="space-y-4">
                <Button onClick={() => setContatoOpen(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Novo Contato
                </Button>
                <div className="space-y-3">
                  {contatos.map((contato) => (
                    <div key={contato.id} className="border rounded p-3 flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{contato.nome}</p>
                        {contato.cargo && <p className="text-sm text-muted-foreground">{contato.cargo}</p>}
                        {contato.email && <p className="text-sm">📧 {contato.email}</p>}
                        {contato.telefone && <p className="text-sm">📱 {contato.telefone}</p>}
                        {contato.aniversario && (
                          <p className="text-sm">🎂 {new Date(contato.aniversario).toLocaleDateString('pt-BR')}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {contato.telefone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const telefone = contato.telefone.replace(/\D/g, '');
                              const mensagem = encodeURIComponent(`Olá ${contato.nome}! Tudo bem?`);
                              window.open(`https://wa.me/55${telefone}?text=${mensagem}`, '_blank');
                            }}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {contato.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(`mailto:${contato.email}`, '_blank');
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!confirm("Deseja excluir este contato?")) return;
                            
                            const { error } = await supabase
                              .from('contatos_clientes')
                              .delete()
                              .eq('id', contato.id);
                            
                            if (error) {
                              toast({ title: "Erro ao excluir contato", variant: "destructive" });
                            } else {
                              toast({ title: "Contato excluído com sucesso!" });
                              loadContatos(clienteSelecionado.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </TabsContent>
              
              <TabsContent value="historico">
                <ClienteProdutosHistorico 
                  clienteId={clienteSelecionado.id}
                  clienteNome={clienteSelecionado.nome_fantasia}
                />
              </TabsContent>
            </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog de Novo Pedido */}
      <Dialog open={pedidoOpen} onOpenChange={setPedidoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Pedido</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPedido} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="numero_pedido">Número do Pedido</Label>
              <Input
                id="numero_pedido"
                value={pedidoData.numero_pedido}
                onChange={(e) => setPedidoData({ ...pedidoData, numero_pedido: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_pedido">Data do Pedido</Label>
              <Input
                id="data_pedido"
                type="date"
                value={pedidoData.data_pedido}
                onChange={(e) => setPedidoData({ ...pedidoData, data_pedido: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor_total">Valor Total</Label>
              <Input
                id="valor_total"
                type="number"
                step="0.01"
                value={pedidoData.valor_total}
                onChange={(e) => setPedidoData({ ...pedidoData, valor_total: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arquivo">Arquivo PDF *</Label>
              <Input
                id="arquivo"
                type="file"
                accept=".pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setPedidoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Pedido"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Novo Contato */}
      <Dialog open={contatoOpen} onOpenChange={setContatoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Contato</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContato} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contato_nome">Nome *</Label>
              <Input
                id="contato_nome"
                required
                value={contatoData.nome}
                onChange={(e) => setContatoData({ ...contatoData, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contato_cargo">Cargo</Label>
              <Input
                id="contato_cargo"
                value={contatoData.cargo}
                onChange={(e) => setContatoData({ ...contatoData, cargo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contato_email">Email</Label>
              <Input
                id="contato_email"
                type="email"
                value={contatoData.email}
                onChange={(e) => setContatoData({ ...contatoData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contato_telefone">Telefone</Label>
              <Input
                id="contato_telefone"
                value={contatoData.telefone}
                onChange={(e) => setContatoData({ ...contatoData, telefone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contato_aniversario">Aniversário</Label>
              <Input
                id="contato_aniversario"
                type="date"
                value={contatoData.aniversario}
                onChange={(e) => setContatoData({ ...contatoData, aniversario: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setContatoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Contato"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;
