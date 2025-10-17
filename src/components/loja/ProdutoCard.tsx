import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProdutoCardProps {
  produto: {
    id: string;
    nome: string;
    sku: string;
    preco_por_kg?: number;
    peso_embalagem_kg?: number;
    tipo_calculo?: string;
    destaque_loja?: boolean;
    marcas?: { nome: string };
    produto_imagens?: Array<{ url: string; ordem: number }>;
  };
}

export const ProdutoCard = ({ produto }: ProdutoCardProps) => {
  const imagemPrincipal = produto.produto_imagens?.[0]?.url || "/placeholder.svg";
  const marca = produto.marcas?.nome || "Sem marca";
  
  const calcularPreco = () => {
    if (produto.tipo_calculo === "por_kg" && produto.preco_por_kg && produto.peso_embalagem_kg) {
      const precoCaixa = produto.preco_por_kg * produto.peso_embalagem_kg;
      return (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            R$ {produto.preco_por_kg.toFixed(2)}/kg
          </p>
          <p className="font-semibold text-primary">
            Caixa: R$ {precoCaixa.toFixed(2)}
          </p>
        </div>
      );
    }
    return <Badge variant="secondary">Preço sob consulta</Badge>;
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={imagemPrincipal}
          alt={produto.nome}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        {produto.destaque_loja && (
          <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
            Destaque
          </Badge>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <Badge variant="outline" className="mb-2">
            {marca}
          </Badge>
          <h3 className="font-semibold text-base line-clamp-2 min-h-[3rem]">
            {produto.nome}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">SKU: {produto.sku}</p>
        </div>
        
        <div className="pt-2 border-t">
          {calcularPreco()}
        </div>

        <Link to={`/loja/produto/${produto.id}`} className="block">
          <Button className="w-full" variant="default">
            Ver Detalhes
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
