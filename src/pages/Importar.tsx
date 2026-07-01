import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, FileText, CheckCircle2, AlertTriangle, Users, Package, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

type Entidade = "clientes" | "produtos" | "pedidos";

const SCHEMAS: Record<Entidade, { cols: string[]; required: string[]; sample: string[] }> = {
  clientes: {
    cols: ["nome", "telefone", "email", "cidade", "endereco", "latitude", "longitude", "codigo"],
    required: ["nome"],
    sample: ["Padaria Doce Sabor", "47999998888", "contato@docesabor.com.br", "Blumenau", "Rua das Flores 100", "-26.9194", "-49.0661", "CLI001"],
  },
  produtos: {
    cols: ["codigo", "nome", "marca", "preco", "unidade"],
    required: ["nome"],
    sample: ["PRD001", "Cacau em Pó 1kg", "GENCAU", "45.90", "kg"],
  },
  pedidos: {
    cols: ["cliente_codigo", "data", "produto_codigo", "quantidade", "valor_unitario", "forma_pagamento"],
    required: ["cliente_codigo", "data", "produto_codigo", "quantidade"],
    sample: ["CLI001", "2025-01-15", "PRD001", "10", "45.90", "Boleto"],
  },
};

const LABELS: Record<Entidade, string> = {
  clientes: "Clientes",
  produtos: "Produtos",
  pedidos: "Pedidos Históricos",
};

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

interface ImportResult { ok: number; errors: { linha: number; motivo: string }[] }

function ImportCard({ entidade, icon: Icon }: { entidade: Entidade; icon: any }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [filename, setFilename] = useState("");
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const schema = SCHEMAS[entidade];

  const [encoding, setEncoding] = useState<"auto" | "utf-8" | "windows-1252">("auto");

  const decodeFile = async (f: File): Promise<string> => {
    const buf = await f.arrayBuffer();
    const tryDecode = (enc: string, fatal = false) => {
      try { return new TextDecoder(enc, { fatal }).decode(buf); } catch { return null; }
    };
    if (encoding === "utf-8") return tryDecode("utf-8") ?? "";
    if (encoding === "windows-1252") return tryDecode("windows-1252") ?? "";
    // Auto: tenta UTF-8 estrito; se falhar ou houver mojibake típico, cai para windows-1252
    const utf8Strict = tryDecode("utf-8", true);
    if (utf8Strict && !/Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]/.test(utf8Strict)) {
      return utf8Strict;
    }
    return tryDecode("windows-1252") ?? tryDecode("utf-8") ?? "";
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    setResult(null);
    try {
      const text = await decodeFile(f);
      const { default: Papa } = await import("papaparse");
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          setRows(res.data as any[]);
          toast.success(`${(res.data as any[]).length} linhas lidas`);
        },
        error: (err: any) => toast.error("Erro ao ler CSV: " + err.message),
      });
    } catch (err: any) {
      toast.error("Erro ao ler arquivo: " + (err?.message ?? "desconhecido"));
    }
  };

  const baixarTemplate = () => {
    downloadCSV(`template_${entidade}.csv`, [schema.cols, schema.sample]);
  };

  const exportarTudo = async () => {
    let data: any[] = [];
    if (entidade === "clientes") {
      const { data: d } = await supabase.from("clientes").select("nome_loja, telefone, email, cidade, endereco, latitude, longitude, id_old_brasil");
      data = (d ?? []).map((c: any) => ({
        nome: c.nome_loja, telefone: c.telefone, email: c.email, cidade: c.cidade,
        endereco: c.endereco, latitude: c.latitude, longitude: c.longitude, codigo: c.id_old_brasil,
      }));
    } else if (entidade === "produtos") {
      const { data: d } = await supabase.from("produtos").select("id_old_brasil, nome, marca, preco, unidade");
      data = (d ?? []).map((p: any) => ({
        codigo: p.id_old_brasil, nome: p.nome, marca: p.marca, preco: p.preco, unidade: p.unidade,
      }));
    } else {
      const { data: d } = await supabase.from("pedidos")
        .select("cliente_id, created_at, valor_total, forma_pagamento, clientes(id_old_brasil)");
      data = (d ?? []).map((p: any) => {
        const cli = Array.isArray(p.clientes) ? p.clientes[0] : p.clientes;
        return {
          cliente_codigo: cli?.id_old_brasil ?? p.cliente_id,
          data: p.created_at, valor: p.valor_total, forma_pagamento: p.forma_pagamento,
        };
      });
    }
    if (data.length === 0) { toast.info("Nada para exportar."); return; }
    const cols = Object.keys(data[0]);
    downloadCSV(`export_${entidade}_${new Date().toISOString().slice(0, 10)}.csv`,
      [cols, ...data.map(r => cols.map(c => r[c] ?? ""))]);
    toast.success(`${data.length} registros exportados`);
  };

  const importar = async () => {
    if (!user || rows.length === 0) return;
    setImporting(true); setProgress(0);
    const errors: { linha: number; motivo: string }[] = [];
    let ok = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // Validate required
      const missing = schema.required.filter(c => !r[c] || String(r[c]).trim() === "");
      if (missing.length > 0) {
        errors.push({ linha: i + 2, motivo: `Faltam colunas: ${missing.join(", ")}` });
      } else {
        try {
          if (entidade === "clientes") {
            const { error } = await supabase.from("clientes").insert({
              nome_loja: r.nome,
              telefone: r.telefone || null,
              email: r.email || null,
              cidade: r.cidade || null,
              endereco: r.endereco || null,
              latitude: r.latitude ? Number(r.latitude) : null,
              longitude: r.longitude ? Number(r.longitude) : null,
              id_old_brasil: r.codigo || null,
              representante_id: user.id,
            });
            if (error) errors.push({ linha: i + 2, motivo: error.message });
            else ok++;
          } else if (entidade === "produtos") {
            const { error } = await supabase.from("produtos").insert({
              nome: r.nome,
              marca: r.marca || null,
              preco: r.preco ? Number(r.preco) : 0,
              unidade: (r.unidade || "un").toLowerCase(),
              id_old_brasil: r.codigo || null,
            });
            if (error) errors.push({ linha: i + 2, motivo: error.message });
            else ok++;
          } else {
            // Pedidos históricos: requer cliente cadastrado pelo código
            const { data: cli } = await supabase.from("clientes")
              .select("id, nome_loja").eq("id_old_brasil", r.cliente_codigo).maybeSingle();
            if (!cli) {
              errors.push({ linha: i + 2, motivo: `Cliente ${r.cliente_codigo} não encontrado` });
            } else {
              const valor = (Number(r.quantidade) || 0) * (Number(r.valor_unitario ?? 0) || 0);
              const { error } = await supabase.from("pedidos").insert({
                representante_id: user.id,
                cliente_id: cli.id,
                cliente_nome: cli.nome_loja,
                valor_total: valor,
                subtotal: valor,
                qtd_itens: Number(r.quantidade) || 0,
                forma_pagamento: r.forma_pagamento || null,
                status: "Confirmado",
                origem: "Importação",
                created_at: r.data ? new Date(r.data).toISOString() : undefined,
              });
              if (error) errors.push({ linha: i + 2, motivo: error.message });
              else ok++;
            }
          }
        } catch (err: any) {
          errors.push({ linha: i + 2, motivo: err.message ?? "Erro desconhecido" });
        }
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    setResult({ ok, errors });
    setImporting(false);
    toast.success(`Importação concluída: ${ok} ok, ${errors.length} com erro`);
  };

  const previewCols = rows.length > 0 ? Object.keys(rows[0]).slice(0, 6) : [];
  const missingCols = schema.required.filter(c => rows.length > 0 && !(c in rows[0]));

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-secondary/20 flex items-center justify-center">
            <Icon className="h-5 w-5 text-secondary" />
          </div>
          Importar {LABELS[entidade]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={baixarTemplate}>
            <Download className="h-3 w-3 mr-1" /> Modelo CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportarTudo}>
            <FileText className="h-3 w-3 mr-1" /> Exportar tudo
          </Button>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>Codificação:</span>
            <Select value={encoding} onValueChange={(v) => setEncoding(v as any)}>
              <SelectTrigger className="h-8 w-[170px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Detectar (recomendado)</SelectItem>
                <SelectItem value="utf-8">UTF-8</SelectItem>
                <SelectItem value="windows-1252">Windows-1252 / Latin-1</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/20">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            {filename || "Arraste ou selecione um arquivo CSV"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFile}
          />
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            Escolher arquivo
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <strong>Colunas esperadas:</strong> {schema.cols.join(", ")}
        </div>

        {missingCols.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Faltam colunas obrigatórias: {missingCols.join(", ")}
          </div>
        )}

        {rows.length > 0 && previewCols.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <p className="text-xs font-semibold p-2 bg-muted/50">Preview ({Math.min(5, rows.length)} de {rows.length})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30">
                    {previewCols.map(c => <th key={c} className="px-2 py-1 text-left font-medium">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {previewCols.map(c => <td key={c} className="px-2 py-1 truncate max-w-[120px]">{String(r[c] ?? "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {importing && (
          <div className="space-y-1">
            <Progress value={progress} indicatorClassName="bg-secondary" />
            <p className="text-xs text-muted-foreground text-center">{progress}%</p>
          </div>
        )}

        {rows.length > 0 && missingCols.length === 0 && !importing && (
          <Button onClick={importar} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            Importar {rows.length} registros
          </Button>
        )}

        {result && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <strong>{result.ok}</strong> importados com sucesso
            </div>
            {result.errors.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <strong>{result.errors.length}</strong> com erro
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver detalhes</summary>
                  <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.slice(0, 50).map((e, i) => (
                      <li key={i} className="text-destructive">
                        Linha {e.linha}: {e.motivo}
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Importar() {
  const [tab, setTab] = useState<Entidade>("clientes");
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-primary">Importação de Dados</h1>
        <p className="text-muted-foreground mt-1">Carregue clientes, produtos e pedidos via CSV.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Entidade)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clientes"><Users className="h-4 w-4 mr-1" /> Clientes</TabsTrigger>
          <TabsTrigger value="produtos"><Package className="h-4 w-4 mr-1" /> Produtos</TabsTrigger>
          <TabsTrigger value="pedidos"><ShoppingCart className="h-4 w-4 mr-1" /> Pedidos</TabsTrigger>
        </TabsList>
        <TabsContent value="clientes" className="mt-4">
          <ImportCard entidade="clientes" icon={Users} />
        </TabsContent>
        <TabsContent value="produtos" className="mt-4">
          <ImportCard entidade="produtos" icon={Package} />
        </TabsContent>
        <TabsContent value="pedidos" className="mt-4">
          <ImportCard entidade="pedidos" icon={ShoppingCart} />
        </TabsContent>
      </Tabs>

      <Card className="border-0 shadow-md bg-secondary/5">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">💡 Dicas</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Baixe o modelo CSV antes de preencher para evitar erros de coluna.</li>
            <li>Use o "código" do cliente/produto para vincular pedidos históricos.</li>
            <li>Datas no formato AAAA-MM-DD (ex: 2025-01-15).</li>
            <li>Coordenadas opcionais — o sistema busca via endereço se faltar.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
