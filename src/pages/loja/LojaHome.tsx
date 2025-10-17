import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProdutoCard } from "@/components/loja/ProdutoCard";
import { useProdutosLoja, useMarcasLoja } from "@/hooks/useLojaPublic";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";

export default function LojaHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [marcaSelecionada, setMarcaSelecionada] = useState<string | undefined>(
    searchParams.get("marca") || undefined
  );
  const [busca, setBusca] = useState(searchParams.get("busca") || "");
  const [buscaInput, setBuscaInput] = useState(busca);

  const { data: produtos, isLoading: loadingProdutos } = useProdutosLoja({
    marca: marcaSelecionada,
    busca: busca || undefined,
  });

  const { data: produtosDestaque } = useProdutosLoja({ destaque: true });
  const { data: marcas } = useMarcasLoja();

  useEffect(() => {
    const marca = searchParams.get("marca");
    const buscaParam = searchParams.get("busca");
    if (marca) setMarcaSelecionada(marca);
    if (buscaParam) {
      setBusca(buscaParam);
      setBuscaInput(buscaParam);
    }
  }, [searchParams]);

  const handleMarcaClick = (marcaId: string | undefined) => {
    setMarcaSelecionada(marcaId);
    if (marcaId) {
      searchParams.set("marca", marcaId);
    } else {
      searchParams.delete("marca");
    }
    setSearchParams(searchParams);
  };

  const handleBuscaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusca(buscaInput);
    if (buscaInput.trim()) {
      searchParams.set("busca", buscaInput);
    } else {
      searchParams.delete("busca");
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 px-4">
        <div className="container mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Loja OLD BRASIL
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Produtos Premium para Sorveterias e Confeitarias
          </p>
          <a href={gerarLinkWhatsApp()} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-[#25d366] hover:bg-[#20ba5a] text-white">
              Solicite seu Orçamento via WhatsApp
            </Button>
          </a>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Produtos em Destaque */}
        {produtosDestaque && produtosDestaque.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <Package className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Produtos em Destaque</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {produtosDestaque.slice(0, 8).map((produto: any) => (
                <ProdutoCard key={produto.id} produto={produto} />
              ))}
            </div>
          </section>
        )}

        {/* Filtros */}
        <section className="mb-8 space-y-6">
          {/* Busca */}
          <form onSubmit={handleBuscaSubmit} className="max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nome ou SKU..."
                className="pl-10"
                value={buscaInput}
                onChange={(e) => setBuscaInput(e.target.value)}
              />
            </div>
          </form>

          {/* Filtro por Marca */}
          {marcas && marcas.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3">Filtrar por Marca:</p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={marcaSelecionada ? "outline" : "default"}
                  className="cursor-pointer"
                  onClick={() => handleMarcaClick(undefined)}
                >
                  Todas
                </Badge>
                {marcas.map((marca: any) => (
                  <Badge
                    key={marca.id}
                    variant={marcaSelecionada === marca.id ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleMarcaClick(marca.id)}
                  >
                    {marca.nome} ({marca.produtos_count})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Grid de Produtos */}
        <section>
          <h2 className="text-2xl font-bold mb-6">
            {busca
              ? `Resultados para "${busca}"`
              : marcaSelecionada
              ? `Produtos ${marcas?.find((m: any) => m.id === marcaSelecionada)?.nome}`
              : "Todos os Produtos"}
          </h2>

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
                Nenhum produto encontrado
              </p>
              {(busca || marcaSelecionada) && (
                <Button
                  variant="link"
                  onClick={() => {
                    setBusca("");
                    setBuscaInput("");
                    setMarcaSelecionada(undefined);
                    setSearchParams({});
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
