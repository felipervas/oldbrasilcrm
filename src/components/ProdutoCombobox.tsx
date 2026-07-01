import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProdutoOption {
  id: string;
  nome: string;
  marca: string | null;
  preco: number;
  unidade: string;
  codigo_sku: string | null;
  imagem_url: string | null;
}

interface Props {
  onPick: (p: ProdutoOption) => void;
  placeholder?: string;
  className?: string;
}

export function ProdutoCombobox({ onPick, placeholder = "Buscar produto (nome, SKU, marca)…", className }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProdutoOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const safe = query.replace(/[%_\\]/g, "\\$&");

      // 1) Tabela legada "produtos" (fonte principal usada pelos pedidos)
      const prodLegacy = await supabase
        .from("produtos")
        .select("id, nome, marca, preco, unidade, codigo_sku, imagem_url")
        .eq("ativo", true)
        .or(`nome.ilike.%${safe}%,marca.ilike.%${safe}%,codigo_sku.ilike.%${safe}%,referencia.ilike.%${safe}%`)
        .order("nome")
        .limit(15);

      // 2) Tabela nova "products" (cadastro recente) — garante que produto novo apareça
      //    mesmo se o espelho em "produtos" falhar.
      const prodNew = await supabase
        .from("products")
        .select("id, name, price, unidade_medida, codigo_referencia, brand_id, brands(name)")
        .eq("is_active", true)
        .or(`name.ilike.%${safe}%,codigo_referencia.ilike.%${safe}%`)
        .order("name")
        .limit(15);

      const fromLegacy: ProdutoOption[] = (prodLegacy.data ?? []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        marca: p.marca,
        preco: Number(p.preco),
        unidade: p.unidade,
        codigo_sku: p.codigo_sku,
        imagem_url: p.imagem_url,
      }));

      const fromNew: ProdutoOption[] = (prodNew.data ?? []).map((p: any) => ({
        id: p.id,
        nome: p.name,
        marca: p.brands?.name ?? null,
        preco: Number(p.price ?? 0),
        unidade: (p.unidade_medida ?? "un") as string,
        codigo_sku: p.codigo_referencia ?? null,
        imagem_url: null,
      }));

      // Dedup por nome normalizado — preferindo o registro de "produtos"
      const norm = (s: string) => (s ?? "").trim().toLowerCase();
      const seen = new Set<string>();
      const merged: ProdutoOption[] = [];
      for (const p of [...fromLegacy, ...fromNew]) {
        const key = norm(p.nome);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(p);
      }

      setResults(merged.slice(0, 12));
      setLoading(false);
      setOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder={placeholder}
        className="pl-9 pr-9 h-11"
      />
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground">Nenhum produto encontrado.</div>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onPick(p); setQuery(""); setOpen(false); }}
              className="w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-muted/50 border-b border-border/40 last:border-0"
            >
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {p.imagem_url ? (
                  <img src={p.imagem_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.nome}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {[p.marca, p.codigo_sku].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-secondary">
                  R$ {p.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">{p.unidade}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
