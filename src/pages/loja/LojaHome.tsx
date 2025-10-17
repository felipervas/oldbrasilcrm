import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Package, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ProdutoCard } from "@/components/loja/ProdutoCard";
import { FiltrosLoja } from "@/components/loja/FiltrosLoja";
import { OrdenacaoLoja } from "@/components/loja/OrdenacaoLoja";
import { useProdutosLoja, useMarcasLoja, useCategoriasLoja } from "@/hooks/useLojaPublic";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";

export default function LojaHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [filtrosMarcas, setFiltrosMarcas] = useState<string[]>([]);
  const [filtrosCategorias, setFiltrosCategorias] = useState<string[]>([]);
  const [busca, setBusca] = useState(searchParams.get("busca") || "");
  const [buscaInput, setBuscaInput] = useState(busca);
  const [ordenacao, setOrdenacao] = useState("ordem_exibicao");

  const { data: produtos, isLoading: loadingProdutos } = useProdutosLoja({
    marcas: filtrosMarcas.length > 0 ? filtrosMarcas : undefined,
    categorias: filtrosCategorias.length > 0 ? filtrosCategorias : undefined,
    busca: busca || undefined,
    ordenacao,
  });

  const { data: marcas } = useMarcasLoja();
  const { data: categorias } = useCategoriasLoja();

  // Extrair produtos em destaque da query principal (evita query duplicada)
  const produtosDestaque = useMemo(() => 
    produtos?.filter(p => p.destaque_loja).slice(0, 8) || [],
    [produtos]
  );

  const handleMarcaChange = (marcaId: string) => {
    setFiltrosMarcas(prev =>
      prev.includes(marcaId)
        ? prev.filter(id => id !== marcaId)
        : [...prev, marcaId]
    );
  };

  const handleCategoriaChange = (categoria: string) => {
    setFiltrosCategorias(prev =>
      prev.includes(categoria)
        ? prev.filter(c => c !== categoria)
        : [...prev, categoria]
    );
  };

  const handleLimparFiltros = () => {
    setFiltrosMarcas([]);
    setFiltrosCategorias([]);
    setBusca("");
    setBuscaInput("");
    setSearchParams({});
  };

  const handleBuscaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusca(buscaInput);
  };

  const totalFiltrosAtivos = filtrosMarcas.length + filtrosCategorias.length;

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
              {produtosDestaque.map((produto: any) => (
                <ProdutoCard key={produto.id} produto={produto} />
              ))}
            </div>
          </section>
        )}

        {/* Busca */}
        <section className="mb-8">
          <form onSubmit={handleBuscaSubmit} className="max-w-xl mx-auto">
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
        </section>

        {/* Layout com Filtros Laterais */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Filtros - Desktop */}
          <aside className="hidden lg:block space-y-4">
            <FiltrosLoja
              marcas={marcas || []}
              categorias={categorias || []}
              filtrosMarcas={filtrosMarcas}
              filtrosCategorias={filtrosCategorias}
              onMarcaChange={handleMarcaChange}
              onCategoriaChange={handleCategoriaChange}
              onLimparFiltros={handleLimparFiltros}
            />
          </aside>

          {/* Produtos */}
          <main className="space-y-6">
            {/* Barra de Ações - Mobile e Desktop */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-bold">
                {busca
                  ? `Resultados para "${busca}"`
                  : "Todos os Produtos"}
                {produtos && (
                  <span className="text-muted-foreground ml-2 text-lg">
                    ({produtos.length})
                  </span>
                )}
              </h2>

              <div className="flex items-center gap-3">
                {/* Filtros - Mobile */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden relative">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtros
                      {totalFiltrosAtivos > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                          {totalFiltrosAtivos}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <div className="mt-6">
                      <FiltrosLoja
                        marcas={marcas || []}
                        categorias={categorias || []}
                        filtrosMarcas={filtrosMarcas}
                        filtrosCategorias={filtrosCategorias}
                        onMarcaChange={handleMarcaChange}
                        onCategoriaChange={handleCategoriaChange}
                        onLimparFiltros={handleLimparFiltros}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Ordenação */}
                <OrdenacaoLoja value={ordenacao} onChange={setOrdenacao} />
              </div>
            </div>

            {/* Grid de Produtos */}
            {loadingProdutos ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : produtos && produtos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                {(busca || totalFiltrosAtivos > 0) && (
                  <Button
                    variant="link"
                    onClick={handleLimparFiltros}
                    className="mt-4"
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
