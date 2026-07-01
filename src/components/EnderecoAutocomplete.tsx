import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Search } from "lucide-react";

export interface EnderecoData {
  cep: string;
  endereco: string; // logradouro + número
  bairro: string;
  cidade: string;
  estado: string;
}

interface Props {
  value: EnderecoData;
  onChange: (next: EnderecoData) => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
  };
}

function formatCep(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

export function EnderecoAutocomplete({ value, onChange }: Props) {
  const [cepLoading, setCepLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  // ViaCEP lookup
  const handleCepBlur = async () => {
    const digits = value.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        onChange({
          cep: formatCep(digits),
          endereco: data.logradouro || value.endereco,
          bairro: data.bairro || value.bairro,
          cidade: data.localidade || value.cidade,
          estado: data.uf || value.estado,
        });
      }
    } catch {
      // silently fail
    } finally {
      setCepLoading(false);
    }
  };

  // Nominatim search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!busca || busca.trim().length < 4) { setSugestoes([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=5&q=${encodeURIComponent(busca)}`;
        const res = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
        if (res.ok) {
          const data: NominatimResult[] = await res.json();
          setSugestoes(data);
          setShowDropdown(true);
        }
      } catch {
        // silently fail
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [busca]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selecionarSugestao = (s: NominatimResult) => {
    const a = s.address;
    const rua = a.road ? `${a.road}${a.house_number ? `, ${a.house_number}` : ""}` : "";
    onChange({
      cep: a.postcode ? formatCep(a.postcode) : value.cep,
      endereco: rua || value.endereco,
      bairro: a.suburb || a.neighbourhood || value.bairro,
      cidade: a.city || a.town || a.village || a.municipality || value.cidade,
      estado: a.state || value.estado,
    });
    setBusca("");
    setSugestoes([]);
    setShowDropdown(false);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">CEP</Label>
        <div className="relative">
          <Input
            value={value.cep}
            onChange={(e) => onChange({ ...value, cep: formatCep(e.target.value) })}
            onBlur={handleCepBlur}
            placeholder="00000-000"
            className="min-h-[44px]"
            inputMode="numeric"
          />
          {cepLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Digite o CEP e saia do campo para preencher automaticamente.</p>
      </div>

      <div ref={containerRef} className="space-y-1.5 relative">
        <Label className="text-xs flex items-center gap-1"><Search className="h-3 w-3" /> Buscar endereço</Label>
        <div className="relative">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => sugestoes.length > 0 && setShowDropdown(true)}
            placeholder="Ex: Rua das Flores, 123, Florianópolis"
            className="min-h-[44px]"
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
          )}
        </div>
        {showDropdown && sugestoes.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-72 overflow-y-auto">
            {sugestoes.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selecionarSugestao(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 flex gap-2 items-start"
              >
                <MapPin className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
                <span className="text-xs text-foreground line-clamp-2">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Endereço (rua, número)</Label>
          <Input
            value={value.endereco}
            onChange={(e) => onChange({ ...value, endereco: e.target.value })}
            placeholder="Rua das Flores, 123"
            className="min-h-[44px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Bairro</Label>
          <Input
            value={value.bairro}
            onChange={(e) => onChange({ ...value, bairro: e.target.value })}
            placeholder="Centro"
            className="min-h-[44px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cidade</Label>
          <Input
            value={value.cidade}
            onChange={(e) => onChange({ ...value, cidade: e.target.value })}
            placeholder="Florianópolis"
            className="min-h-[44px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Estado (UF)</Label>
          <Input
            value={value.estado}
            onChange={(e) => onChange({ ...value, estado: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="SC"
            className="min-h-[44px]"
            maxLength={2}
          />
        </div>
      </div>
    </div>
  );
}
