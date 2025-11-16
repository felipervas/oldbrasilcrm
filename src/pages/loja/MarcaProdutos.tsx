import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronRight, Package, ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProdutoCard } from "@/components/loja/ProdutoCard";
import { OrdenacaoLoja } from "@/components/loja/OrdenacaoLoja";
import { AvisoVolatilidade } from "@/components/loja/AvisoVolatilidade";
import { useProdutosLoja, useMarcaDetalhes } from "@/hooks/useLojaPublic";
import { useState } from "react";
import { isMarcaVolatil, getCorMarca } from "@/lib/precosLoja";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

export default function MarcaProdutos() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [ordenacao, setOrdenacao] = useState("ordem_exibicao");
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca, 500);

  const { data: marca, isLoading: loadingMarca } = useMarcaDetalhes(slug!);
  const { data: produtos, isLoading: loadingProdutos } = useProdutosLoja({
    marca: marca?.id,
    ordenacao,
    busca: buscaDebounced,
  });

  if (loadingMarca) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-48 w-full mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!marca) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Marca não encontrada</h2>
        <Link to="/loja/marcas">
          <Button>Ver Todas as Marcas</Button>
        </Link>
      </div>
    );
  }

  const corMarca = getCorMarca(marca.nome);
  const marcaVolatil = isMarcaVolatil(marca.nome);

  return (
    <div className="min-h-screen bg-background">
      {/* Botão Voltar Mobile */}
      <div className="md:hidden container mx-auto px-4 pt-4">
        <Button 
          variant="ghost" 
          size="lg"
          onClick={() => navigate(-1)}
          className="w-full justify-start text-lg"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Voltar para Loja
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-6">
        <nav className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
          <Link to="/loja" className="hover:text-primary">
            Loja
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/loja/marcas" className="hover:text-primary">
            Marcas
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{marca.nome}</span>
        </nav>
      </div>

      {/* Header da Marca */}
      <section className={`${corMarca} py-16 px-4 text-white`}>
        <div className="container mx-auto text-center space-y-4">
          <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-white/40">
            Marca Premium
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold">{marca.nome}</h1>
          {marca.descricao && (
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              {marca.descricao}
            </p>
          )}
          <div className="flex flex-wrap gap-3 justify-center pt-4">
            <a href={gerarLinkWhatsApp()} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-[#25d366] hover:bg-[#20ba5a] text-white">
                Solicitar Orçamento via WhatsApp
              </Button>
            </a>
            {marca.site && (
              <a href={marca.site} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/40 hover:bg-white/20">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Visite o Site da Marca
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Aviso de Volatilidade */}
      {marcaVolatil && (
        <div className="container mx-auto px-4 py-6">
          <AvisoVolatilidade />
        </div>
      )}

      {/* Produtos */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-2xl font-bold">
              Produtos {marca.nome}
              {produtos && (
                <span className="text-muted-foreground ml-2 text-lg">
                  ({produtos.length})
                </span>
              )}
            </h2>
            <OrdenacaoLoja value={ordenacao} onChange={setOrdenacao} />
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar produtos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loadingProdutos ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : produtos && produtos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {produtos.map((produto: any) => (
              <ProdutoCard key={produto.id} produto={produto} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              Nenhum produto disponível para esta marca
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
