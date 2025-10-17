import { Badge } from "@/components/ui/badge";
import { calcularPrecoPorDose, calcularPrecoCaixa, formatarPreco, isMarcaVolatil } from "@/lib/precosLoja";
import { MessageCircle } from "lucide-react";

interface PrecoCardProps {
  marca: string;
  precoKg?: number;
  pesoEmbalagem?: number;
  rendimentoDose?: number;
  compact?: boolean;
}

export const PrecoCard = ({
  marca,
  precoKg,
  pesoEmbalagem = 25,
  rendimentoDose,
  compact = false,
}: PrecoCardProps) => {
  const marcaUpper = marca.toUpperCase();

  // UNIKA - Mostrar preço por kg e por dose
  if (marcaUpper.includes('UNIKA') && precoKg && rendimentoDose) {
    const precoDose = calcularPrecoPorDose(precoKg, rendimentoDose);
    
    if (compact) {
      return (
        <div className="space-y-1">
          <div className="text-sm font-semibold text-primary">
            {formatarPreco(precoKg)}/kg
          </div>
          <div className="text-xs text-muted-foreground">
            {formatarPreco(precoDose)}/dose ({rendimentoDose}g)
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded">
          <span className="text-sm">Preço por Kg:</span>
          <span className="font-bold">{formatarPreco(precoKg)}</span>
        </div>
        <div className="flex justify-between p-3 bg-green-50 dark:bg-green-950 rounded">
          <span className="text-sm">Preço por Dose ({rendimentoDose}g):</span>
          <span className="font-bold text-green-700 dark:text-green-400">
            {formatarPreco(precoDose)}
          </span>
        </div>
        {pesoEmbalagem && (
          <p className="text-sm text-muted-foreground">
            Embalagem: {pesoEmbalagem}kg
          </p>
        )}
      </div>
    );
  }

  // GENCAU/CACAU - Preço volátil
  if (isMarcaVolatil(marca) && precoKg) {
    const precoCaixa = calcularPrecoCaixa(precoKg, pesoEmbalagem);
    
    if (compact) {
      return (
        <div className="space-y-1">
          <div className="text-sm font-semibold text-orange-600 flex items-center gap-1">
            {formatarPreco(precoKg)}/kg
            <span className="text-xs">⚠️</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Caixa: {formatarPreco(precoCaixa)}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex justify-between p-3 bg-muted rounded">
          <span className="text-sm">Preço por Kg (ref):</span>
          <span className="font-semibold">{formatarPreco(precoKg)}</span>
        </div>
        <div className="flex justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded">
          <span className="text-sm">Caixa {pesoEmbalagem}kg (ref):</span>
          <span className="font-bold text-orange-700 dark:text-orange-400">
            {formatarPreco(precoCaixa)}
          </span>
        </div>
      </div>
    );
  }

  // Outras marcas ou produtos sem preço - Sob consulta
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
};
