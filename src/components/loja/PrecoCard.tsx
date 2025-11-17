import { Badge } from "@/components/ui/badge";
import { formatarPreco } from "@/lib/precosLoja";
import { MessageCircle } from "lucide-react";

interface PrecoCardProps {
  produto: any;
  compact?: boolean;
}

export const PrecoCard = ({ produto, compact = false }: PrecoCardProps) => {
  // 1. Determinar preço final (ordem de prioridade)
  const precoFinal = produto.tabela_site?.preco_por_kg || produto.preco_por_kg || null;
  
  // 2. Calcular preço por dose (se aplicável)
  const precoPorDose = produto.rendimento_dose_gramas && precoFinal
    ? (precoFinal * produto.rendimento_dose_gramas) / 1000
    : null;

  // 3. Se não tem preço, mostrar "Consultar"
  if (!precoFinal) {
    if (compact) {
      return (
        <Badge variant="secondary" className="text-xs">
          <MessageCircle className="h-3 w-3 mr-1" />
          Consultar
        </Badge>
      );
    }
    
    return (
      <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-100">
        <div className="flex items-center gap-2 text-blue-700">
          <MessageCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold text-sm">Consulte o Preço</p>
            <p className="text-xs text-blue-600">Entre em contato via WhatsApp</p>
          </div>
        </div>
      </div>
    );
  }

  // 4. Mostrar preço - versão compacta
  if (compact) {
    return (
      <div className="space-y-1">
        <div className="text-sm font-semibold text-primary">
          {formatarPreco(precoFinal)}/kg
        </div>
        {precoPorDose && (
          <div className="text-xs text-muted-foreground">
            Dose: {formatarPreco(precoPorDose)}
          </div>
        )}
      </div>
    );
  }

  // 5. Mostrar preço - versão completa
  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border-2 border-blue-100">
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-slate-600 mb-1">Preço por kg</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatarPreco(precoFinal)}
          </p>
        </div>
        {precoPorDose && produto.rendimento_dose_gramas && (
          <div className="pt-2 border-t border-blue-100">
            <p className="text-xs text-slate-500 mb-1">
              Dose ({produto.rendimento_dose_gramas}g)
            </p>
            <p className="text-base font-semibold text-slate-700">
              {formatarPreco(precoPorDose)}
            </p>
          </div>
        )}
        {produto.peso_embalagem_kg && (
          <div className="pt-2 border-t border-blue-100">
            <p className="text-xs text-slate-500 mb-1">
              Embalagem ({produto.peso_embalagem_kg}kg)
            </p>
            <p className="text-base font-semibold text-slate-700">
              {formatarPreco(precoFinal * produto.peso_embalagem_kg)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
