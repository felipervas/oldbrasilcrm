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
    <Card className="group relative overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      {/* Badge Destaque */}
      {produto.destaque_loja && (
        <div className="absolute top-3 right-3 z-10 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
          ⭐ Destaque
        </div>
      )}

      {/* Imagem com Efeito Zoom */}
      <div ref={imgRef} className="relative aspect-square overflow-hidden bg-slate-50">
        {isVisible ? (
          <img
            src={imagemPrincipal}
            alt={produto.nome_loja || produto.nome}
            className="w-full h-full transition-transform duration-500 group-hover:scale-105"
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
        
        {/* Overlay no Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
          <Link to={`/loja/produto/${produto.id}`}>
            <Button 
              size="sm" 
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
            >
              Ver Detalhes
            </Button>
          </Link>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Badge da Marca */}
        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className={`text-xs ${corMarca} text-white border-0`}
          >
            {marca}
          </Badge>
        </div>

        {/* Nome do Produto */}
        <Link to={`/loja/produto/${produto.id}`}>
          <h3 className="font-semibold text-base leading-tight text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {produto.nome_loja || produto.nome}
          </h3>
        </Link>

        {/* Preço */}
        <PrecoCard produto={produto} compact />

        {/* Botão de Ação */}
        <Button 
          variant="loja-primary"
          className="w-full"
          asChild
        >
          <Link to={`/loja/produto/${produto.id}`}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Solicitar Orçamento
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
});
