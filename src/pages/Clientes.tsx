import { useEffect, useState, useCallback, useMemo, memo, useDeferredValue } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Phone, Mail, MapPin, Trash2, MessageCircle, Users, UserPlus, UserCheck, Loader2, UserX, EyeOff, RotateCcw, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { WhatsAppActionButton } from "@/components/WhatsAppActionButton";
import { VendedorSelect } from "@/components/VendedorSelect";
import { EnderecoAutocomplete } from "@/components/EnderecoAutocomplete";
import { useClientesRetencao } from "@/hooks/useClientesRetencao";
import { STATUS_RETENCAO_META, StatusRetencao, descricaoUltimaCompra } from "@/lib/retencao";
import { openWhatsApp } from "@/lib/whatsapp";

const SEGMENTOS = ["Sorveteria", "Açaiteria", "Gelateria", "Padaria", "Chocolateria", "Restaurante", "Supermercado", "Outros"];
const REGIMES_TRIBUTARIOS = ["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI", "Isento/Não contribuinte"];

const segmentoColors: Record<string, string> = {
  "Sorveteria": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Açaiteria": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "Gelateria": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  "Padaria": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Chocolateria": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "Restaurante": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Supermercado": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "Outros": "bg-muted text-muted-foreground",
};

const emptyForm = {
  nome_loja: "", nome_fantasia: "", nome_contato: "", pessoa_compras: "",
  cnpj: "", ie: "", inscricao_estadual: "", telefone: "", celular: "",
  email: "", instagram: "", endereco: "", bairro: "", cidade: "", estado: "", cep: "", observacoes: "",
  segmento: "Outros", regime_tributario: "", marcas_concorrentes: "",
};

const basicFields: { key: string; label: string; placeholder: string; mask?: string }[] = [
  { key: "nome_loja", label: "Razão Social *", placeholder: "Gelateria Premium Ltda" },
  { key: "nome_fantasia", label: "Nome Fantasia", placeholder: "Gelateria Premium" },
  { key: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00", mask: "cnpj" },
  { key: "inscricao_estadual", label: "Inscrição Estadual", placeholder: "123.456.789" },
  { key: "nome_contato", label: "Nome do Contato", placeholder: "João Silva" },
  { key: "pessoa_compras", label: "Pessoa de Compras", placeholder: "Quem decide as compras" },
  { key: "telefone", label: "Telefone", placeholder: "(11) 3333-4444", mask: "phone" },
  { key: "celular", label: "Celular (WhatsApp)", placeholder: "(11) 99999-8888", mask: "phone" },
  { key: "email", label: "E-mail", placeholder: "contato@loja.com" },
  { key: "instagram", label: "Instagram", placeholder: "@perfil_da_loja" },
];

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
function formatCep(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}
function applyMask(value: string, mask?: string): string {
  if (mask === "cnpj") return formatCnpj(value);
  if (mask === "phone") return formatPhone(value);
  if (mask === "cep") return formatCep(value);
  return value;
}

const ClienteCard = memo(function ClienteCard({
  c,
  vendedorNome,
  isMine,
  canClaim,
  isAdminOrGestor,
  ret,
  onAssignToMe,
  onEdit,
  onReativar,
  onInativar,
}: {
  c: any;
  vendedorNome: string | undefined;
  isMine: boolean;
  canClaim: boolean;
  isAdminOrGestor: boolean;
  ret: any;
  onAssignToMe: (id: string) => void;
  onEdit: (c: any) => void;
  onReativar: (c: any) => void;
  onInativar: (c: any) => void;
}) {
  const retStatus: StatusRetencao = ret?.status_retencao ?? "novo";
  const retMeta = STATUS_RETENCAO_META[retStatus];
  return (
    <Card key={c.id} className={cn("border-0 shadow-sm hover:shadow-md transition-shadow", c.status === "inativo" && "opacity-70 bg-muted/30", !isMine && !vendedorNome && c.status !== "inativo" && "border-l-4 border-l-amber-400")}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/clientes/${c.id}`} className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-lg hover:text-primary transition-colors line-clamp-2">{c.nome_loja}</h3>
          </Link>
          <div className="flex gap-1 shrink-0 flex-wrap justify-end">
            {c.status !== "inativo" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={cn("text-[10px] gap-1 border", retMeta.badgeClass)}>
                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full", retMeta.dotClass)} />
                    {retMeta.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-xs">
                  {ret?.motivo_alerta ?? "Sem dados de pedidos ainda"}
                </TooltipContent>
              </Tooltip>
            )}
            {c.status === "inativo" && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <UserX className="h-3 w-3" /> Inativo
              </Badge>
            )}
            {c.segmento && c.segmento !== "Outros" && (
              <Badge className={cn("text-[10px]", segmentoColors[c.segmento] ?? "")}>{c.segmento}</Badge>
            )}
          </div>
        </div>

        {/* Linha de última compra (sempre visível para clientes ativos) */}
        {c.status !== "inativo" && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className={cn("h-3 w-3", retStatus !== "ativo" && retStatus !== "novo" ? "text-orange-500" : "text-muted-foreground/60")} />
            {descricaoUltimaCompra(ret?.dias_desde_ultima_compra ?? null)}
          </p>
        )}

        {c.status === "inativo" && c.motivo_inativacao && (
          <p className="text-xs italic text-muted-foreground border-l-2 border-muted-foreground/30 pl-2">
            Motivo: {c.motivo_inativacao}
          </p>
        )}

        {isAdminOrGestor && (
          <div className="flex items-center gap-1.5 text-xs">
            {isMine ? (
              <span className="flex items-center gap-1 text-primary"><UserCheck className="h-3 w-3" /> Você</span>
            ) : vendedorNome ? (
              <span className="flex items-center gap-1 text-muted-foreground"><UserCheck className="h-3 w-3" /> {vendedorNome}</span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium"><UserPlus className="h-3 w-3" /> Sem vendedor</span>
            )}
          </div>
        )}
        {!isAdminOrGestor && !isMine && c.status !== "inativo" && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <UserPlus className="h-3 w-3" /> Disponível
          </div>
        )}

        {c.nome_contato && <p className="text-sm text-muted-foreground">{c.nome_contato}</p>}
        {c.cnpj && <p className="text-xs text-muted-foreground font-mono">{c.cnpj}</p>}
        <div className="space-y-1 text-sm text-muted-foreground">
          {c.telefone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.telefone}</div>}
          {c.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{c.email}</div>}
          {c.cidade && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{c.cidade}{c.estado ? `, ${c.estado}` : ""}</div>}
        </div>
        <div className="flex gap-2 pt-1 flex-wrap">
          {(c.celular || c.telefone) && c.status !== "inativo" && (
            <WhatsAppActionButton
              phone={c.celular || c.telefone}
              message={`Olá ${(c.nome_contato || c.nome_loja || "").split(/\s+/)[0]}, aqui é ${vendedorNome || "da Cellos Representações"}. Tudo bem?`}
              variant="outline"
              size="sm"
              className="gap-1.5 min-h-[44px] text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
              title="Enviar WhatsApp"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </WhatsAppActionButton>
          )}
          {/* Ação rápida de retenção: aparece quando cliente não está ativo */}
          {retStatus !== "ativo" && retStatus !== "novo" && c.status !== "inativo" && (c.celular || c.telefone) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 min-h-[44px] text-orange-700 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950"
              onClick={() => {
                const nome = (c.nome_contato || c.nome_loja || "").split(/\s+/)[0];
                const tplPorStatus: Record<string, string> = {
                  atencao: `Olá ${nome}, aqui é ${vendedorNome || "da Cellos Representações"}. Notei que faz um tempinho desde a última compra — está tudo certo por aí? Posso te mandar as novidades?`,
                  em_risco: `Olá ${nome}, aqui é ${vendedorNome || "da Cellos Representações"}. Senti sua falta! Bora conversar pra eu entender como posso te ajudar?`,
                  inativo: `Olá ${nome}, aqui é ${vendedorNome || "da Cellos Representações"}. Preparei uma condição especial pra retomar nossa parceria. Posso te enviar?`,
                };
                openWhatsApp(c.celular || c.telefone, tplPorStatus[retStatus]);
              }}
            >
              <MessageCircle className="h-4 w-4" /> Enviar follow-up
            </Button>
          )}
          {canClaim && c.status !== "inativo" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 min-h-[44px] text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
              onClick={() => onAssignToMe(c.id)}
            >
              <UserPlus className="h-4 w-4" /> Atribuir para mim
            </Button>
          )}
          <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => onEdit(c)}>Editar</Button>
          <Link to={`/clientes/${c.id}`}>
            <Button variant="ghost" size="sm" className="min-h-[44px] text-primary">Ver ficha</Button>
          </Link>
          {c.status === "inativo" ? (
            <Button variant="outline" size="sm" className="gap-1.5 min-h-[44px]" onClick={() => onReativar(c)}>
              <RotateCcw className="h-4 w-4" /> Reativar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="gap-1.5 min-h-[44px] text-muted-foreground hover:text-destructive" onClick={() => onInativar(c)}>
              <UserX className="h-4 w-4" /> Inativar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default function Clientes() {
  const { user } = useAuth();
  const { isAdminOrGestor, canActAsOther, loading: roleLoading } = useUserRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientes, setClientes] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [segFilter, setSegFilter] = useState<string | null>(null);
  const [vendedorFilter, setVendedorFilter] = useState<string | null>(null);
  const [statusRetencaoFilter, setStatusRetencaoFilter] = useState<StatusRetencao | null>(
    (searchParams.get("retencao") as StatusRetencao) || null
  );
  const [showInativos, setShowInativos] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [vendedorAlvo, setVendedorAlvo] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [inativarOpen, setInativarOpen] = useState(false);
  const [inativarTarget, setInativarTarget] = useState<any | null>(null);
  const [motivoInativacao, setMotivoInativacao] = useState("");
  const [inativando, setInativando] = useState(false);
  const [vendedorNome, setVendedorNome] = useState<string>("");

  const { retencaoMap } = useClientesRetencao();

  // Mantém URL e estado em sync
  useEffect(() => {
    const fromUrl = searchParams.get("retencao") as StatusRetencao | null;
    if (fromUrl !== statusRetencaoFilter) setStatusRetencaoFilter(fromUrl);
  }, [searchParams]);

  const updateStatusFilter = (s: StatusRetencao | null) => {
    setStatusRetencaoFilter(s);
    const next = new URLSearchParams(searchParams);
    if (s) next.set("retencao", s);
    else next.delete("retencao");
    setSearchParams(next, { replace: true });
  };

  // Dispara job de geração de follow-ups automáticos 1x por dia por usuário (best-effort, silencioso).
  useEffect(() => {
    if (!user) return;
    const key = `retencao_job_${user.id}_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-followups-retencao`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {/* silencioso */});
    });
  }, [user?.id]);

  useEffect(() => { if (user && !roleLoading) fetchClientes(); }, [user?.id, roleLoading]);

  // Carrega o primeiro nome do vendedor logado para usar nas saudações de WhatsApp
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nome").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setVendedorNome(data?.nome?.split(/\s+/)[0] ?? "");
    });
  }, [user?.id]);

  const lookupCnpj = useCallback(async (cnpjValue: string) => {
    const digits = cnpjValue.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setCnpjLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consulta-cnpj`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ cnpj: digits }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setForm(prev => {
          const ie = prev.inscricao_estadual || prev.ie || data.inscricao_estadual || "";
          return {
            ...prev,
            nome_loja: prev.nome_loja || data.razao_social || data.nome_fantasia || prev.nome_loja,
            nome_fantasia: prev.nome_fantasia || data.nome_fantasia || prev.nome_fantasia,
            ie,
            inscricao_estadual: ie,
            endereco: data.logradouro
              ? `${data.logradouro}${data.numero ? `, ${data.numero}` : ""}${data.complemento ? ` - ${data.complemento}` : ""}`
              : prev.endereco,
            bairro: data.bairro || prev.bairro,
            cidade: data.municipio || prev.cidade,
            estado: data.uf || prev.estado,
            cep: data.cep ? formatCep(data.cep) : prev.cep,
            telefone: prev.telefone || (data.telefone ? formatPhone(data.telefone) : prev.telefone),
            email: prev.email || data.email || prev.email,
          };
        });
        if (data.ie_warning) {
          toast.warning(`Dados do CNPJ preenchidos. ${data.ie_warning}`);
        } else {
          const ieSource = data.ie_source ? `, IE: ${data.ie_source}` : "";
          toast.success(`Dados do CNPJ preenchidos! (fonte: ${data.source || "—"}${ieSource})`);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Não foi possível consultar o CNPJ.");
      }
    } catch {
      toast.error("Erro ao consultar CNPJ.");
    } finally {
      setCnpjLoading(false);
    }
  }, []);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchClientes = async () => {
    setFetchError(null);
    try {
      const { data, error } = await supabase.from("clientes").select("*").order("nome_loja").limit(2000);
      if (error) throw error;
      setClientes(data ?? []);

      if (isAdminOrGestor) {
        const { data: profs } = await supabase.from("profiles").select("user_id, nome, role");
        const map: Record<string, string> = {};
        const vendList: { id: string; nome: string }[] = [];
        (profs ?? []).forEach((p: any) => {
          map[p.user_id] = p.nome;
          if (p.role !== "secretaria") vendList.push({ id: p.user_id, nome: p.nome });
        });
        setProfiles(map);
        setVendedores(vendList);
      }
    } catch (e: any) {
      console.error("[Clientes] fetchClientes erro:", e);
      const msg = e?.message ?? "Erro desconhecido ao carregar clientes.";
      setFetchError(msg);
      toast.error(`Não foi possível carregar os clientes: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToMe = useCallback(async (clienteId: string) => {
    const { error } = await supabase.from("clientes").update({ representante_id: user!.id }).eq("id", clienteId);
    if (error) { toast.error("Erro ao atribuir cliente."); return; }
    toast.success("Cliente atribuído a você!");
    fetchClientes();
  }, [user?.id]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setVendedorAlvo(user?.id ?? "");
    setDrawerOpen(true);
  };
  const openEdit = useCallback((c: any) => {
    setEditing(c);
    const ie = c.inscricao_estadual || c.ie || "";
    setForm({
      nome_loja: c.nome_loja, nome_fantasia: c.nome_fantasia ?? "",
      nome_contato: c.nome_contato ?? "", pessoa_compras: c.pessoa_compras ?? "",
      cnpj: c.cnpj ?? "", ie, inscricao_estadual: ie,
      telefone: c.telefone ?? "", celular: c.celular ?? "", email: c.email ?? "",
      instagram: c.instagram ?? "",
      endereco: c.endereco ?? "", bairro: c.bairro ?? "", cidade: c.cidade ?? "", estado: c.estado ?? "", cep: c.cep ?? "",
      observacoes: c.observacoes ?? "", segmento: c.segmento ?? "Outros",
      regime_tributario: c.regime_tributario ?? "", marcas_concorrentes: c.marcas_concorrentes ?? "",
    });
    setVendedorAlvo(c.representante_id ?? user?.id ?? "");
    setDrawerOpen(true);
  }, [user?.id]);

  const handleFieldChange = (key: string, value: string, mask?: string) => {
    const nextValue = applyMask(value, mask);
    if (key === "inscricao_estadual") {
      setForm({ ...form, inscricao_estadual: nextValue, ie: nextValue });
      return;
    }
    setForm({ ...form, [key]: nextValue });
  };

  const handleSubmit = async () => {
    if (!form.nome_loja.trim()) { toast.error("Nome da loja é obrigatório."); return; }
    const ie = (form.inscricao_estadual || form.ie || "").trim();
    const payload: any = { ...form, ie, inscricao_estadual: ie };
    setSaving(true);
    if (editing) {
      // Secretária/gerente pode reatribuir vendedor
      if (canActAsOther && vendedorAlvo) payload.representante_id = vendedorAlvo;
      const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar cliente."); setSaving(false); return; }
      toast.success("Cliente atualizado!");
    } else {
      const repId = canActAsOther && vendedorAlvo ? vendedorAlvo : user!.id;
      const { error } = await supabase.from("clientes").insert({ ...payload, representante_id: repId });
      if (error) { toast.error("Erro ao cadastrar cliente."); setSaving(false); return; }
      toast.success("Cliente cadastrado!");
    }
    setSaving(false); setDrawerOpen(false); fetchClientes();
  };

  const handleDelete = async () => {
    if (!editing) return;
    const { error } = await supabase.from("clientes").delete().eq("id", editing.id);
    if (error) { toast.error("Erro ao excluir cliente."); return; }
    toast.success("Cliente excluído!"); setDrawerOpen(false); fetchClientes();
  };

  const isUnassigned = (c: any) => {
    return c.representante_id !== user?.id && !profiles[c.representante_id];
  };

  const openInativar = useCallback((c: any) => {
    setInativarTarget(c);
    setMotivoInativacao(c.motivo_inativacao ?? "");
    setInativarOpen(true);
  }, []);

  const confirmInativar = async () => {
    if (!inativarTarget) return;
    if (!motivoInativacao.trim()) { toast.error("Informe o motivo da inativação."); return; }
    setInativando(true);
    const { error } = await supabase
      .from("clientes")
      .update({
        status: "inativo",
        motivo_inativacao: motivoInativacao.trim(),
        inativado_em: new Date().toISOString(),
      })
      .eq("id", inativarTarget.id);
    setInativando(false);
    if (error) { toast.error("Erro ao inativar cliente."); return; }
    toast.success("Cliente inativado.");
    setInativarOpen(false);
    setInativarTarget(null);
    setMotivoInativacao("");
    fetchClientes();
  };

  const reativarCliente = useCallback(async (c: any) => {
    const { error } = await supabase
      .from("clientes")
      .update({ status: "ativo", motivo_inativacao: null, inativado_em: null })
      .eq("id", c.id);
    if (error) { toast.error("Erro ao reativar."); return; }
    toast.success(`${c.nome_loja} reativado!`);
    fetchClientes();
  }, []);

  const baseFiltered = useMemo(() => clientes
    .filter(c => showInativos ? c.status === "inativo" : c.status !== "inativo")
    .filter(c => !segFilter || c.segmento === segFilter)
    .filter(c => !vendedorFilter || (vendedorFilter === "sem_vendedor" ? isUnassigned(c) : c.representante_id === vendedorFilter))
    .filter(c => {
      if (!deferredSearch) return true;
      const s = deferredSearch.toLowerCase();
      return c.nome_loja.toLowerCase().includes(s) || (c.cidade ?? "").toLowerCase().includes(s) || (c.cnpj ?? "").toLowerCase().includes(s);
    }), [clientes, showInativos, segFilter, vendedorFilter, deferredSearch, user?.id, profiles]);

  // Contagens por status de retenção (sobre o conjunto filtrado pelos demais filtros)
  const statusCounts: Record<StatusRetencao | "todos", number> = useMemo(() => {
    const counts: Record<StatusRetencao | "todos", number> = {
      todos: baseFiltered.length,
      ativo: 0, atencao: 0, em_risco: 0, inativo: 0, novo: 0,
    };
    baseFiltered.forEach(c => {
      const r = retencaoMap.get(c.id);
      if (r) counts[r.status_retencao]++;
      else counts.novo++;
    });
    return counts;
  }, [baseFiltered, retencaoMap]);

  const filtered = useMemo(() => baseFiltered.filter(c => {
    if (!statusRetencaoFilter) return true;
    const r = retencaoMap.get(c.id);
    const st = r?.status_retencao ?? "novo";
    return st === statusRetencaoFilter;
  }), [baseFiltered, statusRetencaoFilter, retencaoMap]);

  if (loading || roleLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Clientes</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">{clientes.length} cadastrados · {filtered.length} exibidos</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, cidade ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 min-h-[44px]" />
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <Button variant={!segFilter ? "default" : "outline"} size="sm" className="min-h-[44px]" onClick={() => setSegFilter(null)}>Todos</Button>
        {SEGMENTOS.map(s => (
          <Button key={s} variant={segFilter === s ? "default" : "outline"} size="sm" className="min-h-[44px]" onClick={() => setSegFilter(segFilter === s ? null : s)}>{s}</Button>
        ))}
      </div>

      {isAdminOrGestor && vendedores.length > 0 && (
        <div className="flex gap-2 items-center flex-wrap">
          <Label className="text-xs font-medium text-muted-foreground">Vendedor:</Label>
          <Button variant={!vendedorFilter ? "default" : "outline"} size="sm" className="min-h-[36px] text-xs" onClick={() => setVendedorFilter(null)}>Todos</Button>
          <Button variant={vendedorFilter === "sem_vendedor" ? "default" : "outline"} size="sm" className="min-h-[36px] text-xs gap-1 border-dashed" onClick={() => setVendedorFilter(vendedorFilter === "sem_vendedor" ? null : "sem_vendedor")}>
            <UserPlus className="h-3 w-3" /> Sem vendedor
          </Button>
          {vendedores.map(v => (
            <Button key={v.id} variant={vendedorFilter === v.id ? "default" : "outline"} size="sm" className="min-h-[36px] text-xs" onClick={() => setVendedorFilter(vendedorFilter === v.id ? null : v.id)}>{v.nome || "Sem nome"}</Button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pl-1">
        <Switch id="show-inativos" checked={showInativos} onCheckedChange={setShowInativos} />
        <Label htmlFor="show-inativos" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5">
          <EyeOff className="h-3.5 w-3.5" /> Mostrar apenas inativos
        </Label>
      </div>

      {/* Filtros rápidos por status de retenção (não substituem os outros filtros) */}
      <div className="flex gap-2 flex-wrap items-center">
        <Label className="text-xs font-medium text-muted-foreground">Retenção:</Label>
        <Button
          variant={!statusRetencaoFilter ? "default" : "outline"}
          size="sm"
          className="min-h-[36px] text-xs"
          onClick={() => updateStatusFilter(null)}
        >
          Todos ({statusCounts.todos})
        </Button>
        {(["ativo", "atencao", "em_risco", "inativo", "novo"] as StatusRetencao[]).map((st) => {
          const meta = STATUS_RETENCAO_META[st];
          const active = statusRetencaoFilter === st;
          return (
            <Button
              key={st}
              variant={active ? "default" : "outline"}
              size="sm"
              className="min-h-[36px] text-xs gap-1.5"
              onClick={() => updateStatusFilter(active ? null : st)}
            >
              <span className={cn("inline-block w-2 h-2 rounded-full", meta.dotClass)} />
              {meta.label} ({statusCounts[st]})
            </Button>
          );
        })}
      </div>

      {fetchError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-destructive">Não foi possível carregar os clientes</p>
              <p className="text-xs text-muted-foreground break-words">{fetchError}</p>
              <Button size="sm" variant="outline" onClick={() => { setLoading(true); fetchClientes(); }}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!fetchError && filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center space-y-3">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            {clientes.length === 0 ? (
              <>
                <p className="text-sm font-medium text-foreground">Nenhum cliente encontrado</p>
                <p className="text-xs text-muted-foreground">
                  A consulta retornou vazia. Se você acabou de logar, tente recarregar a página.
                </p>
                <Button size="sm" variant="outline" onClick={() => { setLoading(true); fetchClientes(); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Recarregar
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  Você tem {clientes.length} cliente{clientes.length === 1 ? "" : "s"} cadastrado{clientes.length === 1 ? "" : "s"}, mas nenhum corresponde aos filtros atuais.
                </p>
                <p className="text-xs text-muted-foreground">Limpe os filtros para ver toda a lista.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setSegFilter(null);
                    setVendedorFilter(null);
                    setShowInativos(false);
                    updateStatusFilter(null);
                  }}
                >
                  Limpar todos os filtros
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <TooltipProvider delayDuration={150}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const vendedorNome = profiles[c.representante_id];
            const isMine = c.representante_id === user?.id;
            const canClaim = !isMine && !isAdminOrGestor && !canActAsOther;
            const ret = retencaoMap.get(c.id);
            return (
              <ClienteCard
                key={c.id}
                c={c}
                vendedorNome={vendedorNome}
                isMine={isMine}
                canClaim={canClaim}
                isAdminOrGestor={isAdminOrGestor}
                ret={ret}
                onAssignToMe={handleAssignToMe}
                onEdit={openEdit}
                onReativar={reativarCliente}
                onInativar={openInativar}
              />
            );
          })}
        </div>
      </TooltipProvider>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">Nenhum cliente encontrado</p>
          <p className="text-sm mt-1">
            {clientes.length === 0 ? "Cadastre seu primeiro cliente para começar a vender! 🚀" : "Tente outro filtro ou busca."}
          </p>
          {clientes.length === 0 && (
            <Button className="mt-4 min-h-[44px]" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Cadastrar primeiro cliente</Button>
          )}
        </div>
      )}

      <Button className="fixed bottom-24 right-4 md:bottom-8 md:right-8 h-14 w-14 rounded-full shadow-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 z-30" size="icon" onClick={openNew}>
        <Plus className="h-6 w-6" />
      </Button>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg p-4 sm:p-6">
          <SheetHeader>
            <SheetTitle className="text-primary">{editing ? "Editar Cliente" : "Novo Cliente"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            {canActAsOther && (
              <VendedorSelect value={vendedorAlvo} onChange={setVendedorAlvo} />
            )}

            {basicFields.map(({ key, label, placeholder, mask }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <div className="relative flex gap-2">
                  <Input
                    value={(form as any)[key]}
                    onChange={e => handleFieldChange(key, e.target.value, mask)}
                    onBlur={key === "cnpj" ? () => lookupCnpj(form.cnpj) : undefined}
                    placeholder={placeholder}
                    className="min-h-[44px] flex-1"
                  />
                  {key === "cnpj" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => lookupCnpj(form.cnpj)}
                      disabled={cnpjLoading || form.cnpj.replace(/\D/g, "").length !== 14}
                      className="min-h-[44px] whitespace-nowrap"
                    >
                      {cnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar dados"}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Endereço completo via CEP/Nominatim */}
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Endereço
              </Label>
              <EnderecoAutocomplete
                value={{ cep: form.cep, endereco: form.endereco, bairro: form.bairro, cidade: form.cidade, estado: form.estado }}
                onChange={(next) => setForm({ ...form, ...next })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Segmento</Label>
              <Select value={form.segmento} onValueChange={v => setForm({ ...form, segmento: v })}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENTOS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Notas sobre o cliente..." />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Regime tributário</Label>
              <Select value={form.regime_tributario || "__none__"} onValueChange={v => setForm({ ...form, regime_tributario: v === "__none__" ? "" : v })}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não informado</SelectItem>
                  {REGIMES_TRIBUTARIOS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Outras marcas com que trabalha</Label>
              <Textarea
                value={form.marcas_concorrentes}
                onChange={e => setForm({ ...form, marcas_concorrentes: e.target.value })}
                placeholder="Ex: Nestlé, Frooty, La Basque, Davene..."
                rows={2}
              />
            </div>

            <Button className="w-full min-h-[48px]" onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar Alterações" : "Cadastrar Cliente"}
            </Button>
            {editing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full min-h-[44px]"><Trash2 className="h-4 w-4 mr-2" />Excluir Cliente</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita. O cliente "{editing.nome_loja}" será removido permanentemente.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={inativarOpen} onOpenChange={setInativarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <UserX className="h-5 w-5" /> Inativar cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {inativarTarget && (
              <p className="text-sm text-muted-foreground">
                Você está inativando <span className="font-semibold text-foreground">{inativarTarget.nome_loja}</span>. Ele não vai mais gerar alertas de risco nem aparecer nas listas.
              </p>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo da inativação *</Label>
              <Textarea value={motivoInativacao} onChange={e => setMotivoInativacao(e.target.value)} placeholder="Ex: Fechou as portas, mudou de fornecedor..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInativarOpen(false)} disabled={inativando}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmInativar} disabled={inativando || !motivoInativacao.trim()}>
              {inativando ? "Inativando..." : "Confirmar inativação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
