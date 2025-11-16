import { Button } from "@/components/ui/button";
import { MarcaSection } from "@/components/loja/MarcaSection";
import { MarcasCarousel } from "@/components/loja/MarcasCarousel";
import { ModalAtendimentoExclusivo } from "@/components/loja/ModalAtendimentoExclusivo";
import { useLojaAgrupada } from "@/hooks/useLojaAgrupada";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useQueryClient } from '@tanstack/react-query';

export default function LojaHome() {
  const queryClient = useQueryClient();
  const { data: marcas, isLoading } = useLojaAgrupada();
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca, 300);

  // 🚀 PREFETCH: Carregar detalhes dos produtos mais acessados
  useEffect(() => {
    if (marcas && marcas.length > 0) {
      // Prefetch dos primeiros 3 produtos das 5 primeiras marcas
      marcas.slice(0, 5).forEach(marca => {
        marca.produtos.slice(0, 3).forEach(produto => {
          queryClient.prefetchQuery({
            queryKey: ['produto-detalhes', produto.id],
            queryFn: async () => {
              const { data } = await import('@/integrations/supabase/client').then(m => 
                m.supabase
                  .from('produtos')
                  .select('*, produto_imagens(*), marcas(*)')
                  .eq('id', produto.id)
                  .single()
              );
              return data;
            },
            staleTime: 5 * 60 * 1000,
          });
        });
      });
    }
  }, [marcas, queryClient]);

  // Filtrar produtos por busca
  const marcasFiltradas = useMemo(() => {
    if (!buscaDebounced || !marcas) return marcas;
    
    return marcas.map(marca => ({
      ...marca,
      produtos: marca.produtos.filter(produto =>
        produto.nome?.toLowerCase().includes(buscaDebounced.toLowerCase()) ||
        produto.nome_loja?.toLowerCase().includes(buscaDebounced.toLowerCase()) ||
        produto.categoria?.toLowerCase().includes(buscaDebounced.toLowerCase())
      )
    })).filter(marca => marca.produtos.length > 0);
  }, [marcas, buscaDebounced]);

  return (
    <div className="min-h-screen bg-background">
      {/* Modal de Atendimento Exclusivo */}
      <ModalAtendimentoExclusivo />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FFF5F2] via-[#FFF9E6] to-[#F0FDF4] py-20 md:py-28">
        {/* Background Pattern Decorativo */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-[hsl(16_100%_57%)] rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[hsl(142_76%_45%)] rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            {/* Badge Destaque */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-[hsl(16_100%_57%)]/20 animate-fade-in">
              <span className="w-2 h-2 bg-[hsl(16_100%_57%)] rounded-full animate-pulse" />
              <span className="text-sm font-medium text-[hsl(16_100%_57%)]">
                Produtos Premium para Profissionais
              </span>
            </div>

            {/* Título Principal com Gradiente */}
            <h1 className="text-5xl md:text-7xl font-black animate-fade-in">
              <span className="bg-gradient-to-r from-[hsl(16_100%_57%)] via-[hsl(16_100%_67%)] to-[hsl(142_76%_45%)] bg-clip-text text-transparent">
                Loja OLD BRASIL
              </span>
            </h1>

            {/* Subtítulo com Maior Destaque */}
            <p className="text-xl md:text-2xl text-gray-700 font-medium leading-relaxed animate-fade-in">
              Ingredientes e Acessórios de{" "}
              <span className="text-[hsl(16_100%_57%)] font-bold">Alta Performance</span>
              {" "}para Sorveterias e Confeitarias que buscam{" "}
              <span className="text-[hsl(142_76%_45%)] font-bold">Excelência</span>
            </p>

            {/* CTA com Micro-interação */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in">
              <a href={gerarLinkWhatsApp()} target="_blank" rel="noopener noreferrer">
                <Button 
                  size="lg" 
                  className="group bg-gradient-to-r from-[#25d366] to-[#20ba5a] hover:from-[#20ba5a] hover:to-[#1da851] text-white font-semibold px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  <svg className="mr-3 h-6 w-6 group-hover:rotate-12 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Solicitar Orçamento via WhatsApp
                </Button>
              </a>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-2 border-[hsl(16_100%_57%)] text-[hsl(16_100%_57%)] hover:bg-[hsl(16_100%_57%)] hover:text-white font-semibold px-8 py-6 text-lg transition-all duration-300"
              >
                Ver Catálogo
                <svg className="ml-2 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-8 pt-8 text-sm text-gray-600 animate-fade-in flex-wrap">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[hsl(142_76%_45%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Entrega Rápida</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[hsl(142_76%_45%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>Garantia de Qualidade</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[hsl(142_76%_45%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="7"></circle>
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                </svg>
                <span>Marcas Premium</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Carrossel de Marcas */}
      {marcas && marcas.length > 0 && (
        <MarcasCarousel marcas={marcas} />
      )}
      
      {/* Marcas e Produtos */}
      <div id="produtos" className="container mx-auto px-4 py-8 md:py-16">
        {/* Campo de Busca */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar produtos, marcas ou categorias..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
          {buscaDebounced && (
            <p className="text-sm text-muted-foreground mt-2">
              {marcasFiltradas?.reduce((acc, m) => acc + m.produtos.length, 0) || 0} produto(s) encontrado(s)
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mb-4"></div>
            <p className="text-muted-foreground">Carregando produtos...</p>
          </div>
        ) : marcasFiltradas && marcasFiltradas.length > 0 ? (
          marcasFiltradas.map((marca) => (
            <MarcaSection key={marca.id} marca={marca} />
          ))
        ) : buscaDebounced ? (
          <div className="text-center py-20">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground mb-2">Nenhum produto encontrado</p>
            <p className="text-sm text-muted-foreground">Tente buscar por outro termo</p>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">Nenhum produto disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
