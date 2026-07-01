import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { VendedorSelect } from "@/components/VendedorSelect";

interface Brand { id: string; name: string; }

const REGIMES_TRIBUTARIOS = ["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI", "Isento/Não contribuinte"];

export default function OportunidadeForm() {
  const { id } = useParams();
  const isEdit = !!id && id !== "nova";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stages } = usePipelineStages();

  const [clientes, setClientes] = useState<{ id: string; nome_loja: string; regime_tributario?: string | null; marcas_concorrentes?: string | null }[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNewLead, setShowNewLead] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [newLead, setNewLead] = useState({ nome_loja: "", celular: "", cidade: "" });
  const [vendedorId, setVendedorId] = useState("");
  const [form, setForm] = useState({
    title: "",
    company_id: "",
    contact_name: "",
    stage_id: "",
    estimated_value: "",
    temperature: "morno",
    expected_close_date: "",
    next_action_at: "",
    next_action_description: "",
    notes: "",
    regime_tributario: "",
    marcas_concorrentes: "",
  });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("clientes").select("id, nome_loja, regime_tributario, marcas_concorrentes").order("nome_loja"),
      supabase.from("brands").select("id, name").eq("active", true).order("name"),
    ]).then(([clientesRes, brandsRes]) => {
      setClientes(clientesRes.data ?? []);
      setBrands((brandsRes.data as Brand[]) ?? []);
    });

    if (isEdit) {
      supabase.from("opportunities").select("*").eq("id", id).maybeSingle().then(({ data }) => {
        if (data) {
          setForm({
            title: data.title,
            company_id: data.company_id,
            contact_name: data.contact_name ?? "",
            stage_id: data.stage_id,
            estimated_value: String(data.estimated_value),
            temperature: data.temperature,
            expected_close_date: data.expected_close_date ?? "",
            next_action_at: data.next_action_at ? data.next_action_at.slice(0, 16) : "",
            next_action_description: data.next_action_description ?? "",
            notes: data.notes ?? "",
            regime_tributario: (data as any).regime_tributario ?? "",
            marcas_concorrentes: (data as any).marcas_concorrentes ?? "",
          });
        }
      });
      supabase.from("opportunity_brands").select("brand_id").eq("opportunity_id", id).then(({ data }) => {
        setSelectedBrands((data ?? []).map((d: any) => d.brand_id));
      });
    }
  }, [user?.id, id]);

  // Auto-set first stage for new opps
  useEffect(() => {
    if (!isEdit && stages.length > 0 && !form.stage_id) {
      setForm(f => ({ ...f, stage_id: stages[0].id }));
    }
  }, [stages, isEdit]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.company_id) {
      toast.error("Título e cliente são obrigatórios.");
      return;
    }
    setSaving(true);

    const stage = stages.find(s => s.id === form.stage_id);
    const payload = {
      title: form.title,
      company_id: form.company_id,
      contact_name: form.contact_name || null,
      stage_id: form.stage_id,
      estimated_value: Number(form.estimated_value) || 0,
      probability: stage?.default_probability ?? 0,
      temperature: form.temperature,
      expected_close_date: form.expected_close_date || null,
      next_action_at: form.next_action_at || null,
      next_action_description: form.next_action_description || null,
      notes: form.notes || null,
      regime_tributario: form.regime_tributario || null,
      marcas_concorrentes: form.marcas_concorrentes || null,
      owner_id: vendedorId || user!.id,
    };

    let oppId = id;

    if (isEdit) {
      const { error } = await supabase.from("opportunities").update(payload).eq("id", id);
      if (error) { toast.error("Erro ao atualizar."); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("opportunities").insert(payload).select("id").single();
      if (error) { toast.error("Erro ao criar."); setSaving(false); return; }
      oppId = data.id;

      // Timeline event
      await supabase.from("timeline_events").insert({
        opportunity_id: oppId,
        company_id: form.company_id,
        user_id: user!.id,
        event_type: "created",
        description: `Oportunidade criada: ${form.title}`,
      });
    }

    // Sync brands
    await supabase.from("opportunity_brands").delete().eq("opportunity_id", oppId!);
    if (selectedBrands.length > 0) {
      await supabase.from("opportunity_brands").insert(
        selectedBrands.map(brand_id => ({ opportunity_id: oppId!, brand_id }))
      );
    }

    toast.success(isEdit ? "Oportunidade atualizada!" : "Oportunidade criada!");
    setSaving(false);
    navigate(`/oportunidades/${oppId}`);
  };

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleClienteChange = (clienteId: string) => {
    const cli = clientes.find(c => c.id === clienteId);
    setForm(f => ({
      ...f,
      company_id: clienteId,
      // Pré-preenche com dados do cliente apenas se ainda estiverem vazios
      regime_tributario: f.regime_tributario || (cli?.regime_tributario ?? ""),
      marcas_concorrentes: f.marcas_concorrentes || (cli?.marcas_concorrentes ?? ""),
    }));
  };

  const handleCreateLead = async () => {
    if (!newLead.nome_loja.trim()) {
      toast.error("Informe o nome da loja.");
      return;
    }
    if (!user) return;
    setCreatingLead(true);
    const { data, error } = await supabase
      .from("clientes")
      .insert({
        nome_loja: newLead.nome_loja.trim(),
        celular: newLead.celular.trim() || null,
        cidade: newLead.cidade.trim() || null,
        representante_id: user.id,
        status: "ativo",
        tipo: "PJ",
      })
      .select("id, nome_loja")
      .single();
    setCreatingLead(false);
    if (error || !data) {
      toast.error("Erro ao criar lead.");
      return;
    }
    setClientes(prev => [{ id: data.id, nome_loja: data.nome_loja }, ...prev]);
    setForm(f => ({ ...f, company_id: data.id }));
    setNewLead({ nome_loja: "", celular: "", cidade: "" });
    setShowNewLead(false);
    toast.success(`Lead "${data.nome_loja}" criado e selecionado!`);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-primary">
          {isEdit ? "Editar Oportunidade" : "Nova Oportunidade"}
        </h1>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Dados da oportunidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <VendedorSelect value={vendedorId} onChange={setVendedorId} />
          <div className="space-y-1">
            <Label>Título *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex: Gelateria X — linha Gencau" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Cliente *</Label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => setShowNewLead(v => !v)}
                    className="text-xs font-medium text-secondary hover:text-secondary/80 inline-flex items-center gap-1"
                  >
                    {showNewLead ? <><X className="h-3 w-3" /> Cancelar</> : <><UserPlus className="h-3 w-3" /> Criar novo lead</>}
                  </button>
                )}
              </div>
              <Select value={form.company_id} onValueChange={handleClienteChange}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_loja}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Contato principal</Label>
              <Input value={form.contact_name} onChange={e => set("contact_name", e.target.value)} placeholder="Nome do contato" />
            </div>
          </div>

          {showNewLead && !isEdit && (
            <div className="rounded-lg border-2 border-dashed border-secondary/40 bg-secondary/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                <UserPlus className="h-4 w-4" /> Novo Lead
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome da loja *</Label>
                  <Input
                    value={newLead.nome_loja}
                    onChange={e => setNewLead(l => ({ ...l, nome_loja: e.target.value }))}
                    placeholder="Ex: Gelateria do João"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Celular</Label>
                  <Input
                    value={newLead.celular}
                    onChange={e => setNewLead(l => ({ ...l, celular: e.target.value }))}
                    placeholder="(48) 99999-9999"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cidade</Label>
                  <Input
                    value={newLead.cidade}
                    onChange={e => setNewLead(l => ({ ...l, cidade: e.target.value }))}
                    placeholder="Florianópolis"
                    maxLength={80}
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleCreateLead}
                disabled={creatingLead || !newLead.nome_loja.trim()}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                {creatingLead ? "Criando..." : "Criar e selecionar"}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Etapa</Label>
              <Select value={form.stage_id} onValueChange={v => set("stage_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Valor estimado (R$)</Label>
              <Input type="number" value={form.estimated_value} onChange={e => set("estimated_value", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Temperatura</Label>
              <Select value={form.temperature} onValueChange={v => set("temperature", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="frio">Frio</SelectItem>
                  <SelectItem value="morno">Morno</SelectItem>
                  <SelectItem value="quente">Quente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Previsão de fechamento</Label>
              <Input type="date" value={form.expected_close_date} onChange={e => set("expected_close_date", e.target.value)} />
            </div>
          </div>

          {/* Brands */}
          <div className="space-y-1">
            <Label>Marcas de interesse</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {brands.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBrands(prev =>
                    prev.includes(b.id) ? prev.filter(x => x !== b.id) : [...prev, b.id]
                  )}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedBrands.includes(b.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next action */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Próxima ação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={form.next_action_at} onChange={e => set("next_action_at", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Descrição da ação</Label>
              <Input value={form.next_action_description} onChange={e => set("next_action_description", e.target.value)} placeholder="Ex: Ligar para confirmar reunião" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Contexto da negociação..." rows={3} />
        </CardContent>
      </Card>

      {/* Perfil fiscal & concorrência */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Perfil fiscal & concorrência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Regime tributário</Label>
            <Select
              value={form.regime_tributario || "__none__"}
              onValueChange={v => set("regime_tributario", v === "__none__" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Não informado</SelectItem>
                {REGIMES_TRIBUTARIOS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Outras marcas com que o cliente trabalha</Label>
            <Textarea
              value={form.marcas_concorrentes}
              onChange={e => set("marcas_concorrentes", e.target.value)}
              placeholder="Ex: Nestlé, Frooty, La Basque, Davene..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Útil para entender a concorrência e preparar o pitch.</p>
          </div>
        </CardContent>
      </Card>


      <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Oportunidade"}
      </Button>
    </div>
  );
}
