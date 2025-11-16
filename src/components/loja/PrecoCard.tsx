import { Badge } from "@/components/ui/badge";
import { formatarPreco, formatarInfoPreco } from "@/lib/precosLoja";
import { MessageCircle } from "lucide-react";

interface PrecoCardProps {
  produto: any;
  compact?: boolean;
}

const getEmbalagemIcon = (tipo: string) => {
  const icons: Record<string, string> = {
    'caixa': '📦',
    'saco': '🛍️',
    'balde': '🪣'
  };
  return icons[tipo] || '📦';
};

export const PrecoCard = ({
  produto,
  compact = false,
}: PrecoCardProps) => {
  // Usar preço da tabela_site se existir, senão usar preco_por_kg
  const produtoComPreco = {
    ...produto,
    preco_por_kg: produto.tabela_site?.preco_por_kg || produto.preco_por_kg
  };
  
  const infoPreco = formatarInfoPreco(produtoComPreco);
  const tipoEmb = produto.tipo_embalagem || 'caixa';
  const iconEmb = getEmbalagemIcon(tipoEmb);
  const nomeEmb = tipoEmb.charAt(0).toUpperCase() + tipoEmb.slice(1);
  const nomeTabela = produto.tabela_site?.nome_tabela;
  
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
    // Se vendido por unidade, mostrar apenas preço da embalagem
    if (infoPreco.tipoVenda === 'unidade') {
      if (compact) {
        return (
          <div className="space-y-1">
            <div className="text-sm font-semibold text-primary">
              {formatarPreco(infoPreco.precoEmbalagem)}
            </div>
            <div className="text-xs text-muted-foreground">
              {iconEmb} {infoPreco.pesoEmbalagem}kg
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950 dark:to-sky-950 rounded-lg border border-blue-100 dark:border-blue-800">
            <span className="text-sm">{iconEmb} {nomeEmb} ({infoPreco.pesoEmbalagem}kg)</span>
            <span className="font-bold text-lg text-blue-700 dark:text-blue-400">{formatarPreco(infoPreco.precoEmbalagem)}</span>
          </div>
          {infoPreco.precoDose && (
            <div className="flex justify-between items-center p-2.5 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950 dark:to-rose-950 rounded-lg border border-pink-200 dark:border-pink-800">
              <span className="text-xs font-medium text-pink-900 dark:text-pink-200">🥄 Dose ({infoPreco.rendimentoDose}g)</span>
              <span className="font-bold text-base text-pink-700 dark:text-pink-400">
                {formatarPreco(infoPreco.precoDose)}
              </span>
            </div>
          )}
        </div>
      );
    }

    // Vendido por kg - mostrar preço/kg + dose + embalagem
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
        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950 dark:to-sky-950 rounded-lg border border-blue-100 dark:border-blue-800">
          <span className="text-sm">💰 Preço/kg</span>
          <span className="font-bold text-lg text-blue-700 dark:text-blue-400">{formatarPreco(infoPreco.precoKg)}</span>
        </div>
        {infoPreco.precoDose && (
          <div className="flex justify-between items-center p-2.5 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950 dark:to-rose-950 rounded-lg border border-pink-200 dark:border-pink-800">
            <span className="text-xs font-medium text-pink-900 dark:text-pink-200">🥄 Dose ({infoPreco.rendimentoDose}g)</span>
            <span className="font-bold text-base text-pink-700 dark:text-pink-400">
              {formatarPreco(infoPreco.precoDose)}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center p-2.5 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 rounded-lg border border-amber-200 dark:border-amber-800">
          <span className="text-xs text-amber-900 dark:text-amber-200">{iconEmb} {nomeEmb} ({infoPreco.pesoEmbalagem}kg)</span>
          <span className="font-semibold text-sm text-amber-700 dark:text-amber-400">{formatarPreco(infoPreco.precoEmbalagem)}</span>
        </div>
      </div>
    );
  }
  
  // FASE 2: GENCAU/CACAU - Preço volátil
  if (infoPreco.tipo === 'volatil') {
    // Sempre mostrar preço/kg para voláteis pois o preço flutua
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
        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 rounded-lg border border-orange-200 dark:border-orange-800">
          <span className="text-sm">💰 Preço/kg (ref)</span>
          <span className="font-bold text-lg text-orange-700 dark:text-orange-400">{formatarPreco(infoPreco.precoKg)}</span>
        </div>
        <div className="flex justify-between items-center p-2.5 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 rounded-lg border border-amber-200 dark:border-amber-800">
          <span className="text-xs text-amber-900 dark:text-amber-200">{iconEmb} {nomeEmb} ({infoPreco.pesoEmbalagem}kg)</span>
          <span className="font-semibold text-sm text-amber-700 dark:text-amber-400">{formatarPreco(infoPreco.precoEmbalagem)}</span>
        </div>
        <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
          ⚠️ Preço sujeito a variação
        </p>
      </div>
    );
  }
  
  // Outras marcas - Considerar tipo de venda
  // Se vendido por unidade, mostrar apenas preço da embalagem
  if (infoPreco.tipoVenda === 'unidade') {
    if (compact) {
      return (
        <div className="space-y-1">
          <div className="text-sm font-semibold text-primary">
            {formatarPreco(infoPreco.precoEmbalagem)}
          </div>
          <div className="text-xs text-muted-foreground">
            {iconEmb} {infoPreco.pesoEmbalagem}kg
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950 dark:to-sky-950 rounded-lg border border-blue-100 dark:border-blue-800">
          <span className="text-sm">{iconEmb} {nomeEmb} ({infoPreco.pesoEmbalagem}kg)</span>
          <span className="font-bold text-lg text-blue-700 dark:text-blue-400">{formatarPreco(infoPreco.precoEmbalagem)}</span>
        </div>
      </div>
    );
  }

  // Vendido por kg - mostrar preço/kg + total embalagem
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
      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950 dark:to-sky-950 rounded-lg border border-blue-100 dark:border-blue-800">
        <span className="text-sm">💰 Preço/kg</span>
        <span className="font-bold text-lg text-blue-700 dark:text-blue-400">{formatarPreco(infoPreco.precoKg)}</span>
      </div>
      <div className="flex justify-between items-center p-2.5 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 rounded-lg border border-amber-200 dark:border-amber-800">
        <span className="text-xs text-amber-900 dark:text-amber-200">{iconEmb} {nomeEmb} ({infoPreco.pesoEmbalagem}kg)</span>
        <span className="font-semibold text-sm text-amber-700 dark:text-amber-400">{formatarPreco(infoPreco.precoEmbalagem)}</span>
      </div>
    </div>
  );
};
