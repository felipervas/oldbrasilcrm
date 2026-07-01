import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Search, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  category: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  notes: string | null;
  brand_id: string;
  is_active: boolean;
  price: number;
  unidade_medida: string | null;
  peso_liquido: number | null;
  volume: number | null;
  descricao_detalhada: string | null;
  codigo_referencia: string | null;
  brands?: { name: string; category: string | null } | null;
}

const UNIDADES_MEDIDA = ["Unidade", "Caixa", "Pacote", "Fardo", "Galão", "Kg", "g", "L", "ml", "Litro"];

const TABELAS_PRECO_GENCAU = [
  { key: "tabela_1", label: "Tabela 1" },
  { key: "tabela_2", label: "Tabela 2" },
  { key: "tabela_3", label: "Tabela 3" },
  { key: "tabela_4", label: "Tabela 4" },
  { key: "distribuidor", label: "Distribuidor" },
] as const;
type TipoTabela = typeof TABELAS_PRECO_GENCAU[number]["key"];

const brandColors: Record<string, string> = {
  "Vaccarin": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "PLUSPACK": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "WUDY": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "IMPEL": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "NR Foods": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "La Sereníssima": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Gencau": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "BUONO": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  "ISOTERM": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  "Unika": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
};

const formatBRL = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const emptyForm = {
  name: "",
  description: "",
  unit: "",
  notes: "",
  brand_id: "",
  is_active: true,
  price: "",
  unidade_medida: "",
  peso_liquido: "",
  volume: "",
  descricao_detalhada: "",
  codigo_referencia: "",
};

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [precosGencau, setPrecosGencau] = useState<Record<TipoTabela, string>>({
    tabela_1: "", tabela_2: "", tabela_3: "", tabela_4: "", distribuidor: "",
  });
  const [produtosRowId, setProdutosRowId] = useState<string | null>(null);

  const isGencau = (brandId: string) => {
    const b = brands.find(x => x.id === brandId);
    return (b?.name ?? "").toLowerCase() === "gencau";
  };

  const fetchAll = async () => {
    const [prodRes, brandRes] = await Promise.all([
      supabase.from("products").select("*, brands(name, category)").order("name"),
      supabase.from("brands").select("id, name, category").eq("active", true).order("name"),
    ]);
    setProducts((prodRes.data as Product[]) ?? []);
    setBrands(brandRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = products
    .filter(p => !brandFilter || p.brand_id === brandFilter)
    .filter(p => {
      if (!search) return true;
      const s = search.toLowerCase();
      return p.name.toLowerCase().includes(s) || (p.description ?? "").toLowerCase().includes(s) || (p.brands?.name ?? "").toLowerCase().includes(s);
    });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setPrecosGencau({ tabela_1: "", tabela_2: "", tabela_3: "", tabela_4: "", distribuidor: "" });
    setProdutosRowId(null);
    setDrawerOpen(true);
  };

  const loadPrecosGencau = async (productName: string) => {
    // Match com produtos.id pelo nome (mesma fonte usada nos pedidos)
    const { data: prodRow } = await supabase
      .from("produtos")
      .select("id")
      .eq("nome", productName)
      .maybeSingle();
    if (!prodRow) {
      setProdutosRowId(null);
      setPrecosGencau({ tabela_1: "", tabela_2: "", tabela_3: "", tabela_4: "", distribuidor: "" });
      return;
    }
    setProdutosRowId(prodRow.id);
    const { data: precos } = await supabase
      .from("produto_precos")
      .select("tipo_tabela, preco")
      .eq("produto_id", prodRow.id);
    const next: Record<TipoTabela, string> = { tabela_1: "", tabela_2: "", tabela_3: "", tabela_4: "", distribuidor: "" };
    (precos ?? []).forEach((r: any) => {
      next[r.tipo_tabela as TipoTabela] = r.preco != null ? String(r.preco) : "";
    });
    setPrecosGencau(next);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      unit: p.unit ?? "",
      notes: p.notes ?? "",
      brand_id: p.brand_id,
      is_active: p.is_active,
      price: p.price > 0 ? String(p.price) : "",
      unidade_medida: p.unidade_medida ?? "",
      peso_liquido: p.peso_liquido != null ? String(p.peso_liquido) : "",
      volume: p.volume != null ? String(p.volume) : "",
      descricao_detalhada: p.descricao_detalhada ?? "",
      codigo_referencia: p.codigo_referencia ?? "",
    });
    setPrecosGencau({ tabela_1: "", tabela_2: "", tabela_3: "", tabela_4: "", distribuidor: "" });
    setProdutosRowId(null);
    if (isGencau(p.brand_id)) {
      loadPrecosGencau(p.name);
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Nome do produto é obrigatório."); return; }
    if (!form.brand_id) { toast.error("Selecione uma marca."); return; }
    const gencau = isGencau(form.brand_id);
    const parsedPrice = form.price ? Number(form.price.replace(",", ".")) : 0;
    if (!gencau && (Number.isNaN(parsedPrice) || parsedPrice < 0)) { toast.error("Preço inválido."); return; }
    const parsedPeso = form.peso_liquido ? Number(form.peso_liquido.replace(",", ".")) : null;
    const parsedVolume = form.volume ? Number(form.volume.replace(",", ".")) : null;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      unit: form.unit.trim() || null,
      notes: form.notes.trim() || null,
      brand_id: form.brand_id,
      is_active: form.is_active,
      price: gencau ? 0 : parsedPrice,
      unidade_medida: form.unidade_medida || null,
      peso_liquido: parsedPeso,
      volume: parsedVolume,
      descricao_detalhada: form.descricao_detalhada.trim() || null,
      codigo_referencia: form.codigo_referencia.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar produto."); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error("Erro ao cadastrar produto."); setSaving(false); return; }
    }

    // Espelha em "produtos" (tabela usada no lançamento de pedidos)
    {
      const marcaNome = brands.find(b => b.id === payload.brand_id)?.name ?? null;
      const um = (payload.unidade_medida ?? "").toLowerCase();
      const unidadeEnum = um.startsWith("kg") ? "kg"
        : um.startsWith("cx") || um.startsWith("caix") ? "cx"
        : um.startsWith("l") || um.startsWith("lt") || um.startsWith("ml") || um.startsWith("gal") ? "lt"
        : "un";
      const produtosPayload: any = {
        nome: payload.name,
        descricao: payload.description,
        preco: payload.price,
        categoria: "Outros",
        unidade: unidadeEnum,
        ativo: payload.is_active,
        marca: marcaNome,
        unidade_medida: payload.unidade_medida,
        peso_liquido: payload.peso_liquido,
        volume: payload.volume,
        descricao_detalhada: payload.descricao_detalhada,
        codigo_referencia: payload.codigo_referencia,
        referencia: payload.codigo_referencia,
        observacoes: payload.notes,
      };
      const { data: existente } = await supabase
        .from("produtos").select("id").eq("nome", payload.name).maybeSingle();
      if (existente?.id) {
        await supabase.from("produtos").update(produtosPayload).eq("id", existente.id);
      } else {
        await supabase.from("produtos").insert(produtosPayload);
      }
    }

    // Persiste tabelas Gencau
    if (gencau) {
      let prodId = produtosRowId;
      if (!prodId) {
        const { data: prodRow } = await supabase
          .from("produtos").select("id").eq("nome", payload.name).maybeSingle();
        prodId = prodRow?.id ?? null;
      }
      if (prodId) {
        const rows = TABELAS_PRECO_GENCAU.map(t => ({
          produto_id: prodId!,
          tipo_tabela: t.key as any,
          preco: Number((precosGencau[t.key] || "0").replace(",", ".")) || 0,
        }));
        const { error: upErr } = await supabase
          .from("produto_precos")
          .upsert(rows, { onConflict: "produto_id,tipo_tabela" });
        if (upErr) {
          toast.error("Produto salvo, mas erro ao salvar tabelas de preço (verifique permissões).");
          console.error(upErr);
        }
      } else {
        toast.warning("Produto Gencau não encontrado na base de pedidos para vincular tabelas de preço.");
      }
    }

    toast.success(editing ? "Produto atualizado!" : "Produto cadastrado!");
    setSaving(false);
    setDrawerOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!editing) return;
    const { error } = await supabase.from("products").delete().eq("id", editing.id);
    if (error) { toast.error("Erro ao excluir produto."); return; }
    toast.success("Produto excluído!");
    setDrawerOpen(false);
    fetchAll();
  };

  const toggleAtivo = async (p: Product, checked: boolean) => {
    const { error } = await supabase.from("products").update({ is_active: checked }).eq("id", p.id);
    if (error) { toast.error("Erro ao atualizar status."); return; }
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: checked } : x));
    toast.success(checked ? "Produto ativado!" : "Produto desativado!");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Produtos por Marca</h1>
        <p className="text-muted-foreground mt-1">{products.length} produtos · {brands.length} marcas</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar produto ou marca..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={!brandFilter ? "default" : "outline"} size="sm" onClick={() => setBrandFilter(null)}>
          Todas
        </Button>
        {brands.map(b => (
          <Button
            key={b.id}
            variant={brandFilter === b.id ? "default" : "outline"}
            size="sm"
            onClick={() => setBrandFilter(brandFilter === b.id ? null : b.id)}
          >
            {b.name}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">Nenhum produto encontrado</p>
            <p className="text-sm mt-1">
              {products.length === 0 ? "Cadastre o primeiro produto para começar." : "Tente outro filtro ou busca."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
            return (
            <Card
              key={p.id}
              className={`border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${!p.is_active ? "opacity-60" : ""}`}
              onClick={() => openEdit(p)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground leading-tight">{p.name}</h3>
                  <Badge className={brandColors[brand?.name ?? ""] ?? "bg-muted text-muted-foreground"}>
                    {brand?.name ?? "—"}
                  </Badge>
                </div>
                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-baseline justify-between gap-2 pt-1">
                  <span className="text-xl font-bold text-primary">
                    {formatBRL(Number(p.price ?? 0))}
                  </span>
                  {p.unit && (
                    <span className="text-xs text-muted-foreground">por {p.unit}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {brand?.category && (
                      <Badge variant="outline" className="text-[10px]">{brand.category}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-muted-foreground">{p.is_active ? "Ativo" : "Inativo"}</span>
                    <Switch checked={p.is_active} onCheckedChange={v => toggleAtivo(p, v)} />
                  </div>
                </div>
                {p.notes && (
                  <p className="text-[11px] text-muted-foreground/70 line-clamp-1 italic">{p.notes}</p>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <Button className="fixed bottom-20 right-4 md:bottom-8 md:right-8 h-14 w-14 rounded-full shadow-xl bg-secondary text-secondary-foreground hover:bg-secondary/90" size="icon" onClick={openNew}>
        <Plus className="h-6 w-6" />
      </Button>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-primary">{editing ? "Editar Produto" : "Novo Produto"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do produto" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Marca *</Label>
              <Select
                value={form.brand_id}
                onValueChange={v => {
                  setForm({ ...form, brand_id: v });
                  if (editing && isGencau(v)) loadPrecosGencau(form.name || editing.name);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição do produto..." />
            </div>
            {form.brand_id && isGencau(form.brand_id) ? (
              <div className="space-y-2 p-3 rounded-lg border border-secondary/40 bg-secondary/5">
                <Label className="text-sm font-semibold text-primary">Tabelas de Preço (Gencau)</Label>
                <p className="text-[11px] text-muted-foreground">Uso interno — não aparece para o cliente.</p>
                <div className="grid grid-cols-2 gap-2">
                  {TABELAS_PRECO_GENCAU.map(t => (
                    <div key={t.key} className="space-y-1">
                      <Label className="text-[11px]">{t.label} (R$)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={precosGencau[t.key]}
                        onChange={e => setPrecosGencau(prev => ({ ...prev, [t.key]: e.target.value.replace(/[^\d.,]/g, "") }))}
                        placeholder="0,00"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Preço (R$)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value.replace(/[^\d.,]/g, "") })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unidade de medida</Label>
                  <Select value={form.unidade_medida} onValueChange={v => setForm({ ...form, unidade_medida: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES_MEDIDA.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {form.brand_id && isGencau(form.brand_id) && (
              <div className="space-y-1">
                <Label className="text-xs">Unidade de medida</Label>
                <Select value={form.unidade_medida} onValueChange={v => setForm({ ...form, unidade_medida: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES_MEDIDA.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Peso líq. (kg)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.peso_liquido}
                  onChange={e => setForm({ ...form, peso_liquido: e.target.value.replace(/[^\d.,]/g, "") })}
                  placeholder="0,000"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Volume (L)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.volume}
                  onChange={e => setForm({ ...form, volume: e.target.value.replace(/[^\d.,]/g, "") })}
                  placeholder="0,000"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cód. ref.</Label>
                <Input
                  value={form.codigo_referencia}
                  onChange={e => setForm({ ...form, codigo_referencia: e.target.value })}
                  placeholder="REF-001"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição detalhada</Label>
              <Textarea
                value={form.descricao_detalhada}
                onChange={e => setForm({ ...form, descricao_detalhada: e.target.value })}
                placeholder="Descrição completa para PDF/catálogo..."
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Antiga unidade (legado)</Label>
              <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="kg, un, cx..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observações internas</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas internas sobre o produto..." />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Produto ativo</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar Alterações" : "Cadastrar Produto"}
            </Button>
            {editing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />Excluir Produto
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O produto "{editing.name}" será removido permanentemente.
                    </AlertDialogDescription>
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
    </div>
  );
}
