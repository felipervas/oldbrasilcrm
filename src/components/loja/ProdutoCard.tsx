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
    <Card className="group relative overflow-hidden border-0 bg-white shadow-loja-card hover:shadow-loja-hover transition-all duration-500 hover:-translate-y-2">
      {/* Badge Destaque */}
      {produto.destaque_loja && (
        <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-[hsl(16_100%_57%)] to-[hsl(16_100%_67%)] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
          ⭐ Destaque
        </div>
      )}

      {/* Imagem com Efeito Zoom */}
      <div ref={imgRef} className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
        {isVisible ? (
          <img
            src={imagemPrincipal}
            alt={produto.nome_loja || produto.nome}
            className="w-full h-full transition-transform duration-700 group-hover:scale-110"
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
        
        {/* Overlay com Gradiente no Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
          <Button 
            size="sm" 
            className="bg-white text-[hsl(16_100%_57%)] hover:bg-[hsl(16_100%_57%)] hover:text-white font-semibold transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
          >
            Ver Detalhes
          </Button>
        </div>
      </div>

      <CardContent className="p-5 space-y-3">
        {/* Badge da Marca */}
        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className="text-xs bg-gradient-to-r from-[hsl(16_100%_57%)]/10 to-[hsl(16_100%_67%)]/10 text-[hsl(16_100%_57%)] border-[hsl(16_100%_57%)]/20"
          >
            {marca}
          </Badge>
        </div>

        {/* Nome do Produto */}
        <h3 className="font-bold text-lg leading-tight text-gray-900 line-clamp-2 group-hover:text-[hsl(16_100%_57%)] transition-colors">
          {produto.nome_loja || produto.nome}
        </h3>

        {/* Preço com Destaque */}
        <div className="bg-gradient-to-br from-[#FFF5F2] to-[#FFF9E6] border border-[hsl(16_100%_57%)]/20 p-4 rounded-xl">
          <PrecoCard produto={produto} />
        </div>

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
