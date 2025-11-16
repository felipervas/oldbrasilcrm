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
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 md:py-16 px-4">
        <div className="container mx-auto text-center space-y-4 md:space-y-6">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground">
            Loja OLD BRASIL
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Produtos Premium para Sorveterias e Confeitarias
          </p>
          <a href={gerarLinkWhatsApp()} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-[#25d366] hover:bg-[#20ba5a] text-white">
              Solicite seu Orçamento via WhatsApp
            </Button>
          </a>
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
