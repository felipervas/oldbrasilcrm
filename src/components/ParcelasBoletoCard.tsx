import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Receipt, RefreshCw } from "lucide-react";

export interface ParcelaInput {
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  vencimento: string; // yyyy-mm-dd
}

interface Props {
  total: number;
  value: ParcelaInput[];
  onChange: (parcelas: ParcelaInput[]) => void;
  baseDate?: string; // yyyy-mm-dd, default hoje
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const PRESETS: { label: string; dias: number[] }[] = [
  { label: "30", dias: [30] },
  { label: "30/60", dias: [30, 60] },
  { label: "30/60/90", dias: [30, 60, 90] },
  { label: "21/28/35", dias: [21, 28, 35] },
  { label: "28/35/42", dias: [28, 35, 42] },
];

function parseDias(texto: string): number[] {
  return texto
    .split(/[\/,;\s]+/)
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function ParcelasBoletoCard({ total, value, onChange, baseDate }: Props) {
  const [qtd, setQtd] = useState(value.length || 1);
  const [intervalo, setIntervalo] = useState(30);
  const [diasCustom, setDiasCustom] = useState("");
  const base = baseDate || todayISO();

  useEffect(() => {
    if (value.length && value.length !== qtd) setQtd(value.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.length]);

  const gerarComDias = (diasArr: number[]) => {
    const n = diasArr.length;
    if (n === 0) return;
    const valorBase = Math.floor((total / n) * 100) / 100;
    const resto = Math.round((total - valorBase * n) * 100) / 100;
    const novas: ParcelaInput[] = diasArr.map((d, i) => ({
      numero_parcela: i + 1,
      total_parcelas: n,
      valor: i === n - 1 ? Math.round((valorBase + resto) * 100) / 100 : valorBase,
      vencimento: addDays(base, d),
    }));
    onChange(novas);
    setQtd(n);
  };

  const gerar = () => {
    const diasParsed = parseDias(diasCustom);
    if (diasParsed.length > 0) {
      gerarComDias(diasParsed);
      return;
    }
    const n = Math.max(1, Math.min(24, qtd));
    gerarComDias(Array.from({ length: n }, (_, i) => intervalo * (i + 1)));
  };

  const aplicarPreset = (dias: number[]) => {
    setDiasCustom(dias.join("/"));
    gerarComDias(dias);
  };

  const updateParcela = (idx: number, patch: Partial<ParcelaInput>) => {
    onChange(value.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const somatorio = useMemo(() => value.reduce((acc, p) => acc + Number(p.valor || 0), 0), [value]);
  const diff = Math.round((total - somatorio) * 100) / 100;

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-secondary">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-secondary" />
          <Label className="text-base font-semibold">Parcelamento Boleto</Label>
        </div>

        {/* Presets rápidos */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase text-muted-foreground self-center mr-1">Presets:</span>
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px] px-2"
              onClick={() => aplicarPreset(p.dias)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Dias customizados */}
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">
            Dias customizados (ex: 21/28/35) — sobrescreve nº parcelas e intervalo
          </Label>
          <Input
            value={diasCustom}
            onChange={(e) => setDiasCustom(e.target.value)}
            placeholder="Ex: 30/60/90 ou 21,28,35"
            className="h-9"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Nº parcelas</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={qtd}
              disabled={parseDias(diasCustom).length > 0}
              onChange={(e) => setQtd(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Intervalo (dias)</Label>
            <Input
              type="number"
              min={1}
              max={180}
              value={intervalo}
              disabled={parseDias(diasCustom).length > 0}
              onChange={(e) => setIntervalo(Math.max(1, Math.min(180, Number(e.target.value) || 30)))}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">&nbsp;</Label>
            <Button type="button" variant="outline" className="h-9 w-full" onClick={gerar}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Gerar
            </Button>
          </div>
        </div>

        {value.length > 0 && (
          <div className="space-y-2">
            {value.map((p, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_1fr] gap-2 items-end border border-border rounded-lg p-2 bg-card">
                <div className="text-xs font-bold text-primary px-2">
                  {p.numero_parcela}/{p.total_parcelas}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Vencimento</Label>
                  <Input
                    type="date"
                    value={p.vencimento}
                    onChange={(e) => updateParcela(i, { vencimento: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    inputMode="decimal"
                    value={p.valor}
                    onChange={(e) => updateParcela(i, { valor: Math.max(0, Number(e.target.value) || 0) })}
                    className="h-9"
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-between text-xs pt-1 border-t border-border">
              <span className="text-muted-foreground">Soma das parcelas</span>
              <span className={`font-semibold ${Math.abs(diff) > 0.01 ? "text-destructive" : "text-foreground"}`}>
                {fmtBRL(somatorio)}
                {Math.abs(diff) > 0.01 && (
                  <span className="ml-2 text-[11px]">(diferença: {fmtBRL(diff)})</span>
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
