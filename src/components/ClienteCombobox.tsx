import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClienteOption {
  id: string;
  nome_loja: string;
  cidade: string | null;
  cnpj: string | null;
  celular: string | null;
  data_ultima_compra: string | null;
}

interface Props {
  value: ClienteOption | null;
  onChange: (cliente: ClienteOption | null) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function ClienteCombobox({ value, onChange, placeholder = "Buscar cliente (nome, doc, fantasia)…", className, autoFocus }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClienteOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const safe = query.replace(/[%_\\]/g, "\\$&");
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_loja, cidade, cnpj, celular, data_ultima_compra")
        .or(`nome_loja.ilike.%${safe}%,cnpj.ilike.%${safe}%,cnpj_cpf.ilike.%${safe}%,nome_contato.ilike.%${safe}%`)
        .order("nome_loja")
        .limit(8);
      setResults(data ?? []);
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

  if (value) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-card min-h-[44px]", className)}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{value.nome_loja}</p>
          <p className="text-xs text-muted-foreground truncate">
            {[value.cidade, value.cnpj].filter(Boolean).join(" · ") || "Sem detalhes"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { onChange(null); setQuery(""); setResults([]); }}
          className="p-2 rounded-md hover:bg-muted shrink-0"
          aria-label="Trocar cliente"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder={placeholder}
        className="pl-9 pr-9 h-11"
      />
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground">Nenhum cliente encontrado.</div>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
              className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b border-border/40 last:border-0"
            >
              <p className="text-sm font-medium">{c.nome_loja}</p>
              <p className="text-[11px] text-muted-foreground">
                {[c.cidade, c.cnpj].filter(Boolean).join(" · ") || "—"}
                {c.data_ultima_compra && ` · Última: ${new Date(c.data_ultima_compra).toLocaleDateString("pt-BR")}`}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
