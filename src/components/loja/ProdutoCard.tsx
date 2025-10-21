import { memo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrecoCard } from "./PrecoCard";
import { getCorMarca } from "@/lib/precosLoja";

interface ProdutoCardProps {
  produto: {
    id: string;
    nome: string;
    nome_loja?: string;
    preco_por_kg?: number;
    peso_embalagem_kg?: number;
    rendimento_dose_gramas?: number;
    tipo_calculo?: string;
    destaque_loja?: boolean;
    marcas?: { nome: string; slug: string };
    produto_imagens?: Array<{ url: string; ordem: number }>;
  };
}

export const ProdutoCard = memo(({ produto }: ProdutoCardProps) => {
  const imagemPrincipal = produto.produto_imagens?.[0]?.url || "/placeholder.svg";
  const marca = produto.marcas?.nome || "Sem marca";
  const corMarca = getCorMarca(marca);

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={imagemPrincipal}
          alt={produto.nome}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
          decoding="async"
          width={400}
          height={400}
        />
        {produto.destaque_loja && (
          <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
            ⭐ Destaque
          </Badge>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <Badge className={`${corMarca} text-white mb-2`}>
            {marca}
          </Badge>
          <h3 className="font-semibold text-base line-clamp-2 min-h-[3rem]">
            {produto.nome_loja || produto.nome}
          </h3>
        </div>
        
        <div className="pt-2 border-t space-y-2">
          <PrecoCard produto={produto} compact={false} />
        </div>

        <Link to={`/loja/produto/${produto.id}`} className="block">
          <Button className="w-full" variant="default">
            Ver Detalhes
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
});
