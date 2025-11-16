import { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    tipo_venda?: string;
    destaque_loja?: boolean;
    marcas?: { nome: string; slug: string };
    tabela_site?: {
      preco_por_kg?: number;
      nome_tabela?: string;
    };
    produto_imagens?: Array<{ 
      url: string; 
      ordem: number;
      largura?: number;
      altura?: number;
      object_fit?: string;
    }>;
  };
}

export const ProdutoCard = memo(({ produto }: ProdutoCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  
  const imagemPrincipal = produto.produto_imagens?.[0]?.url || "/placeholder.svg";
  const imagemConfig = produto.produto_imagens?.[0];
  const marca = produto.marcas?.nome || "Sem marca";
  const corMarca = getCorMarca(marca);

  // 🚀 LAZY LOADING: Carregar imagem apenas quando visível
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50px" } // Carregar 50px antes de aparecer
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div ref={imgRef} className="relative aspect-square overflow-hidden bg-muted">
        {isVisible ? (
          <img
            src={imagemPrincipal}
            alt={produto.nome_loja || produto.nome}
            className="w-full h-full transition-transform duration-300 group-hover:scale-110"
            style={{
              objectFit: (imagemConfig?.object_fit || 'cover') as any,
              width: imagemConfig?.largura ? `${imagemConfig.largura}px` : '100%',
              height: imagemConfig?.altura ? `${imagemConfig.altura}px` : '100%',
            }}
            loading="lazy"
            decoding="async"
            width={imagemConfig?.largura || 300}
            height={imagemConfig?.altura || 300}
          />
        ) : (
          <Skeleton className="w-full h-full" />
        )}
        {produto.destaque_loja && (
          <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
            ⭐ Destaque
          </Badge>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <Badge className={`${corMarca} text-white mb-2 text-xs`}>
            {marca}
          </Badge>
          <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
            {produto.nome_loja || produto.nome}
          </h3>
        </div>
        
        <div className="pt-2 border-t space-y-2">
          <PrecoCard produto={produto} compact={true} />
        </div>

        <Link to={`/loja/produto/${produto.id}`} className="block">
          <Button className="w-full" variant="default" size="sm">
            Ver Detalhes
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
});
