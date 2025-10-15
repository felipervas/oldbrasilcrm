import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Package } from "lucide-react";

interface ProdutoTooltipProps {
  produtos: {
    nome: string;
    quantidade: number;
    preco_unitario: number;
  }[];
}

export const ProdutoTooltip = ({ produtos }: ProdutoTooltipProps) => {
  if (!produtos || produtos.length === 0) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Package className="h-3 w-3" />
            {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            {produtos.map((produto, index) => (
              <div key={index} className="text-xs border-b pb-1 last:border-0">
                <div className="font-semibold">{produto.nome}</div>
                <div className="flex justify-between gap-4 text-muted-foreground">
                  <span>Qtd: {produto.quantidade}</span>
                  <span>{formatCurrency(produto.preco_unitario)}</span>
                </div>
                <div className="font-semibold text-primary">
                  Subtotal: {formatCurrency(produto.quantidade * produto.preco_unitario)}
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
