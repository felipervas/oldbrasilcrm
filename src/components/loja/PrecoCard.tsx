import { Badge } from "@/components/ui/badge";
import { formatarPreco, formatarInfoPreco } from "@/lib/precosLoja";
import { MessageCircle } from "lucide-react";

interface PrecoCardProps {
  produto: any;
  compact?: boolean;
}

export const PrecoCard = ({
  produto,
  compact = false,
}: PrecoCardProps) => {
  const infoPreco = formatarInfoPreco(produto);
  
  if (!infoPreco) {
    if (compact) {
      return (
        <Badge variant="secondary" className="text-xs">
          <MessageCircle className="h-3 w-3 mr-1" />
          Consultar
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-base py-2 px-4">
        <MessageCircle className="h-4 w-4 mr-2" />
        Preço sob consulta
      </Badge>
    );
  }
  
  // FASE 2: UNIKA - Mostrar preço/kg + dose + embalagem total
  if (infoPreco.tipo === 'unika') {
    if (compact) {
      return (
        <div className="space-y-1">
          <div className="text-sm font-semibold text-primary">
            {formatarPreco(infoPreco.precoKg)}/kg
          </div>
          <div className="text-xs text-muted-foreground">
            Dose: {formatarPreco(infoPreco.precoDose)}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex justify-between p-2 bg-blue-50 dark:bg-blue-950 rounded">
          <span className="text-sm">💰 Preço/kg:</span>
          <span className="font-bold">{formatarPreco(infoPreco.precoKg)}</span>
        </div>
        <div className="flex justify-between p-2 bg-green-50 dark:bg-green-950 rounded">
          <span className="text-sm">🥄 Dose ({infoPreco.rendimentoDose}g):</span>
          <span className="font-bold text-green-700 dark:text-green-400">
            {formatarPreco(infoPreco.precoDose)}
          </span>
        </div>
        <div className="flex justify-between p-2 bg-purple-50 dark:bg-purple-950 rounded">
          <span className="text-sm">📦 Embalagem ({infoPreco.pesoEmbalagem}kg):</span>
          <span className="font-bold text-purple-700 dark:text-purple-400">
            {formatarPreco(infoPreco.precoEmbalagem)}
          </span>
        </div>
      </div>
    );
  }
  
  // FASE 2: GENCAU/CACAU - Preço volátil
  if (infoPreco.tipo === 'volatil') {
    if (compact) {
      return (
        <div className="space-y-1">
          <div className="text-sm font-semibold text-orange-600 flex items-center gap-1">
            {formatarPreco(infoPreco.precoKg)}/kg
            <span className="text-xs">⚠️</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Caixa: {formatarPreco(infoPreco.precoEmbalagem)}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex justify-between p-2 bg-orange-50 dark:bg-orange-950 rounded">
          <span className="text-sm">💰 Preço/kg (ref):</span>
          <span className="font-bold">{formatarPreco(infoPreco.precoKg)}</span>
        </div>
        <div className="flex justify-between p-2 bg-muted rounded">
          <span className="text-sm">📦 Caixa {infoPreco.pesoEmbalagem}kg:</span>
          <span className="font-bold">{formatarPreco(infoPreco.precoEmbalagem)}</span>
        </div>
        <p className="text-xs text-orange-600">⚠️ Preço sujeito a variação</p>
      </div>
    );
  }
  
  // Outras marcas - Mostrar preço/kg + total embalagem
  if (compact) {
    return (
      <div className="space-y-1">
        <div className="text-sm font-semibold text-primary">
          {formatarPreco(infoPreco.precoKg)}/kg
        </div>
        <div className="text-xs text-muted-foreground">
          Emb: {formatarPreco(infoPreco.precoEmbalagem)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between p-2 bg-muted rounded">
        <span className="text-sm">💰 Preço/kg:</span>
        <span className="font-bold">{formatarPreco(infoPreco.precoKg)}</span>
      </div>
      <div className="flex justify-between p-2 bg-muted rounded">
        <span className="text-sm">📦 Embalagem {infoPreco.pesoEmbalagem}kg:</span>
        <span className="font-bold">{formatarPreco(infoPreco.precoEmbalagem)}</span>
      </div>
    </div>
  );
};
