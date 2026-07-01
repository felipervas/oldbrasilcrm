import { useEffect, useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Coins, Target, Table as TableIcon, Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { useRegrasComissao, useMetasMensais, useComissoesPeriodo } from "@/hooks/useComissoes";
import { salvarComissaoPedido, type RegraTipo } from "@/lib/comissoes";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PCT = (v: number) => `${Number(v).toFixed(2).replace(".", ",")}%`;

const tipoLabel: Record<RegraTipo, string> = {
  base: "Base",
  marca: "Marca",
  produto: "Produto",
  bonus_meta: "Bônus por Meta",
};

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function Comissoes() {
  const { isAdminOrGestor, loading: loadingRole } = useUserRole();
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);

  if (loadingRole) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!isAdminOrGestor) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-3">
        <Coins className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground">
          Apenas gerentes e administradores podem gerenciar comissões e metas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Coins className="h-7 w-7 text-secondary" />
          Comissões e Metas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure regras flexíveis, metas mensais e acompanhe o cálculo das comissões.
        </p>
      </div>

      <Tabs defaultValue="regras" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="regras"><Coins className="h-4 w-4 mr-1" />Regras</TabsTrigger>
          <TabsTrigger value="metas"><Target className="h-4 w-4 mr-1" />Metas</TabsTrigger>
          <TabsTrigger value="resumo"><TableIcon className="h-4 w-4 mr-1" />Resumo</TabsTrigger>
        </TabsList>

        <TabsContent value="regras" className="mt-4">
          <RegrasTab />
        </TabsContent>
        <TabsContent value="metas" className="mt-4">
          <MetasTab ano={ano} setAno={setAno} mes={mes} setMes={setMes} />
        </TabsContent>
        <TabsContent value="resumo" className="mt-4">
          <ResumoTab ano={ano} setAno={setAno} mes={mes} setMes={setMes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* =========================================================================
 * REGRAS DE COMISSÃO
 * ========================================================================= */
function RegrasTab() {
  const { regras, loading, reload } = useRegrasComissao();
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const handleEdit = (r: any) => { setEditing(r); setOpenForm(true); };
  const handleNew = () => { setEditing(null); setOpenForm(true); };

  const toggleAtivo = async (r: any) => {
    await supabase.from("regras_comissao" as any).update({ ativo: !r.ativo }).eq("id", r.id);
    toast.success(r.ativo ? "Regra desativada" : "Regra ativada");
    reload();
  };

  const handleDelete = async (r: any) => {
    if (!confirm(`Excluir regra "${r.nome}"?`)) return;
    await supabase.from("regras_comissao" as any).delete().eq("id", r.id);
    toast.success("Regra excluída");
    reload();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Regras de Comissão</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Hierarquia: Produto → Marca → Base. Bônus por meta é somado ao final.
          </p>
        </div>
        <Button onClick={handleNew} size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="h-4 w-4 mr-1" /> Nova regra
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : regras.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma regra cadastrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 px-2 font-medium">Nome</th>
                  <th className="py-2 px-2 font-medium">Tipo</th>
                  <th className="py-2 px-2 font-medium text-right">Percentual</th>
                  <th className="py-2 px-2 font-medium">Vigência</th>
                  <th className="py-2 px-2 font-medium text-center">Ativo</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {regras.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent transition-colors">
                    <td className="py-2 px-2 font-medium">{r.nome}</td>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className="text-xs">{tipoLabel[r.tipo]}</Badge>
                      {r.tipo === "bonus_meta" && r.meta_percentual_min && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ≥ {r.meta_percentual_min}% meta
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-secondary">{PCT(r.percentual)}</td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">
                      {new Date(r.vigencia_inicio + "T00:00:00").toLocaleDateString("pt-BR")}
                      {r.vigencia_fim ? ` → ${new Date(r.vigencia_fim + "T00:00:00").toLocaleDateString("pt-BR")}` : " → ∞"}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <Switch checked={r.ativo} onCheckedChange={() => toggleAtivo(r)} />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(r)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <RegraFormDialog open={openForm} onOpenChange={setOpenForm} regra={editing} onSaved={reload} />
    </Card>
  );
}

function RegraFormDialog({
  open, onOpenChange, regra, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; regra: any; onSaved: () => void }) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<RegraTipo>("marca");
  const [alvoNome, setAlvoNome] = useState("");
  const [percentual, setPercentual] = useState("0");
  const [metaMin, setMetaMin] = useState("");
  const [vigenciaInicio, setVigenciaInicio] = useState(new Date().toISOString().split("T")[0]);
  const [vigenciaFim, setVigenciaFim] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (regra) {
      setNome(regra.nome ?? "");
      setTipo(regra.tipo ?? "marca");
      setAlvoNome(regra.alvo_nome ?? "");
      setPercentual(String(regra.percentual ?? 0));
      setMetaMin(regra.meta_percentual_min ? String(regra.meta_percentual_min) : "");
      setVigenciaInicio(regra.vigencia_inicio ?? new Date().toISOString().split("T")[0]);
      setVigenciaFim(regra.vigencia_fim ?? "");
      setAtivo(regra.ativo ?? true);
    } else {
      setNome(""); setTipo("marca"); setAlvoNome(""); setPercentual("0");
      setMetaMin(""); setVigenciaInicio(new Date().toISOString().split("T")[0]);
      setVigenciaFim(""); setAtivo(true);
    }
  }, [regra, open]);

  const save = async () => {
    if (!nome.trim()) { toast.error("Informe o nome"); return; }
    if (tipo !== "base" && tipo !== "bonus_meta" && !alvoNome.trim()) {
      toast.error("Informe o alvo (marca ou produto)"); return;
    }
    if (tipo === "bonus_meta" && !metaMin) { toast.error("Informe % mínimo da meta"); return; }

    setSaving(true);
    const payload: any = {
      nome: nome.trim(),
      tipo,
      alvo_nome: tipo === "marca" || tipo === "produto" ? alvoNome.trim() : null,
      percentual: Number(percentual) || 0,
      meta_percentual_min: tipo === "bonus_meta" ? Number(metaMin) : null,
      vigencia_inicio: vigenciaInicio,
      vigencia_fim: vigenciaFim || null,
      ativo,
    };

    const { error } = regra
      ? await supabase.from("regras_comissao" as any).update(payload).eq("id", regra.id)
      : await supabase.from("regras_comissao" as any).insert(payload);

    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success(regra ? "Regra atualizada" : "Regra criada");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{regra ? "Editar regra" : "Nova regra"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: BUONO" />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as RegraTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="base">Comissão Base (padrão)</SelectItem>
                <SelectItem value="marca">Comissão por Marca</SelectItem>
                <SelectItem value="produto">Comissão por Produto</SelectItem>
                <SelectItem value="bonus_meta">Bônus por Meta Batida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(tipo === "marca" || tipo === "produto") && (
            <div>
              <Label>{tipo === "marca" ? "Nome da marca" : "Nome do produto"}</Label>
              <Input value={alvoNome} onChange={(e) => setAlvoNome(e.target.value)} placeholder={tipo === "marca" ? "Ex: GENCAU" : "Ex: Casquinha 100un"} />
            </div>
          )}
          {tipo === "bonus_meta" && (
            <div>
              <Label>% mínimo da meta atingida</Label>
              <Input type="number" value={metaMin} onChange={(e) => setMetaMin(e.target.value)} placeholder="100" />
              <p className="text-xs text-muted-foreground mt-1">Ex: 100 (ao atingir 100% da meta) ou 120 (ao atingir 120%).</p>
            </div>
          )}
          <div>
            <Label>Percentual de comissão (%)</Label>
            <Input type="number" step="0.01" value={percentual} onChange={(e) => setPercentual(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Vigência início</Label>
              <Input type="date" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} />
            </div>
            <div>
              <Label>Vigência fim (opcional)</Label>
              <Input type="date" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Ativo</Label>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
 * METAS MENSAIS
 * ========================================================================= */
function MetasTab({
  ano, setAno, mes, setMes,
}: { ano: number; setAno: (v: number) => void; mes: number; setMes: (v: number) => void }) {
  const { metas, loading, reload } = useMetasMensais(ano, mes);
  const [vendedores, setVendedores] = useState<{ user_id: string; nome: string }[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("user_id, nome").order("nome").then(({ data }) => {
      setVendedores(data ?? []);
    });
  }, []);

  useEffect(() => {
    const map: Record<string, string> = {};
    metas.forEach((m) => { map[m.vendedor_id] = String(m.meta_valor); });
    setValores(map);
  }, [metas]);

  const handleSaveAll = async () => {
    setSaving(true);
    const upserts = vendedores
      .filter((v) => valores[v.user_id] !== undefined && valores[v.user_id] !== "")
      .map((v) => ({
        vendedor_id: v.user_id,
        ano,
        mes,
        meta_valor: Number(valores[v.user_id]) || 0,
      }));

    for (const u of upserts) {
      const existing = metas.find((m) => m.vendedor_id === u.vendedor_id);
      if (existing) {
        await supabase.from("metas_mensais" as any).update({ meta_valor: u.meta_valor }).eq("id", existing.id);
      } else {
        await supabase.from("metas_mensais" as any).insert(u);
      }
    }
    setSaving(false);
    toast.success("Metas salvas!");
    reload();
  };

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" /> Metas Mensais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <Label className="text-xs">Mês</Label>
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {meses.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ano</Label>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 px-2 font-medium">Vendedor</th>
                  <th className="py-2 px-2 font-medium text-right">Meta R$</th>
                </tr>
              </thead>
              <tbody>
                {vendedores.map((v) => (
                  <tr key={v.user_id} className="border-b border-border last:border-0">
                    <td className="py-2 px-2">{v.nome || "—"}</td>
                    <td className="py-2 px-2 text-right">
                      <Input
                        type="number"
                        className="w-40 ml-auto text-right"
                        value={valores[v.user_id] ?? ""}
                        onChange={(e) => setValores((s) => ({ ...s, [v.user_id]: e.target.value }))}
                        placeholder="0,00"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button onClick={handleSaveAll} disabled={saving} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          {saving ? "Salvando..." : "Salvar metas do período"}
        </Button>
      </CardContent>
    </Card>
  );
}

/* =========================================================================
 * RESUMO DE COMISSÕES
 * ========================================================================= */
function ResumoTab({
  ano, setAno, mes, setMes,
}: { ano: number; setAno: (v: number) => void; mes: number; setMes: (v: number) => void }) {
  const { comissoes, loading, reload } = useComissoesPeriodo(ano, mes);
  const [pedidos, setPedidos] = useState<Record<string, any>>({});
  const [vendedores, setVendedores] = useState<Record<string, string>>({});
  const [recalculando, setRecalculando] = useState(false);

  useEffect(() => {
    if (comissoes.length === 0) return;
    const ids = comissoes.map((c) => c.pedido_id);
    Promise.all([
      supabase.from("pedidos").select("id, numero, cliente_nome, valor_total, created_at").in("id", ids),
      supabase.from("profiles").select("user_id, nome"),
    ]).then(([pRes, vRes]) => {
      const pMap: Record<string, any> = {};
      (pRes.data ?? []).forEach((p: any) => { pMap[p.id] = p; });
      setPedidos(pMap);
      const vMap: Record<string, string> = {};
      (vRes.data ?? []).forEach((p: any) => { vMap[p.user_id] = p.nome; });
      setVendedores(vMap);
    });
  }, [comissoes]);

  const recalcularTodos = async () => {
    setRecalculando(true);
    const inicio = new Date(ano, mes - 1, 1).toISOString();
    const fim = new Date(ano, mes, 0, 23, 59, 59).toISOString();
    const { data: pedidosMes } = await supabase
      .from("pedidos")
      .select("id")
      .in("status", ["Confirmado", "Enviado"])
      .gte("created_at", inicio)
      .lte("created_at", fim);

    for (const p of pedidosMes ?? []) {
      await salvarComissaoPedido(p.id);
    }
    setRecalculando(false);
    toast.success(`${pedidosMes?.length ?? 0} pedidos recalculados`);
    reload();
  };

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const totalComissao = comissoes.reduce((acc, c) => acc + (Number(c.comissao_total) || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <TableIcon className="h-4 w-4" /> Comissões calculadas
        </CardTitle>
        <Button size="sm" variant="outline" onClick={recalcularTodos} disabled={recalculando}>
          {recalculando ? "Recalculando..." : "Recalcular mês"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <Label className="text-xs">Mês</Label>
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {meses.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ano</Label>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <p className="text-xs text-muted-foreground">Total a pagar</p>
            <p className="text-xl font-bold text-secondary">{BRL(totalComissao)}</p>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-40" />
        ) : comissoes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma comissão calculada. Clique em "Recalcular mês" para processar pedidos confirmados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 px-2 font-medium">Pedido</th>
                  <th className="py-2 px-2 font-medium">Vendedor</th>
                  <th className="py-2 px-2 font-medium">Cliente</th>
                  <th className="py-2 px-2 font-medium text-right">Bruto</th>
                  <th className="py-2 px-2 font-medium text-right">Comissão</th>
                  <th className="py-2 px-2 font-medium text-right">Bônus</th>
                  <th className="py-2 px-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {comissoes.map((c) => {
                  const p = pedidos[c.pedido_id];
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent transition-colors">
                      <td className="py-2 px-2 text-xs font-mono">#{c.pedido_id.slice(0, 8)}</td>
                      <td className="py-2 px-2">{vendedores[c.vendedor_id] ?? "—"}</td>
                      <td className="py-2 px-2 truncate max-w-[180px]">{p?.cliente_nome ?? "—"}</td>
                      <td className="py-2 px-2 text-right">{BRL(c.valor_bruto)}</td>
                      <td className="py-2 px-2 text-right">{BRL(c.comissao_base)}</td>
                      <td className="py-2 px-2 text-right text-secondary">{BRL(c.comissao_bonus)}</td>
                      <td className="py-2 px-2 text-right font-bold">{BRL(c.comissao_total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
