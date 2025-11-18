import { Button } from "@/components/ui/button";
import { MarcaSection } from "@/components/loja/MarcaSection";
import { MarcasCarousel } from "@/components/loja/MarcasCarousel";
import { ModalAtendimentoExclusivo } from "@/components/loja/ModalAtendimentoExclusivo";
import { useLojaAgrupada } from "@/hooks/useLojaAgrupada";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, CheckCircle, Shield, Award } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useQueryClient } from '@tanstack/react-query';

export default function LojaHome() {
  const queryClient = useQueryClient();
  const { data: marcas, isLoading } = useLojaAgrupada();
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca, 300);

  // 🚀 PREFETCH INTELIGENTE: Aguarda 500ms de inatividade antes de prefetch
  useEffect(() => {
    if (!marcas || marcas.length === 0) return;
    
    const timer = setTimeout(() => {
      // Prefetch apenas dos primeiros 3 produtos das 5 primeiras marcas
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
            staleTime: 10 * 60 * 1000,
          });
        });
      });
    }, 500);
    
    return () => clearTimeout(timer);
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
    <div className="min-h-screen bg-slate-50 loja-theme">
      {/* Modal de Atendimento Exclusivo */}
      <ModalAtendimentoExclusivo />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-white py-16 md:py-24">
        {/* Background Pattern Sutil */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-600 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Badge Profissional */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
              <span className="text-sm font-semibold text-blue-700">
                Fornecedor Especializado
              </span>
            </div>

            {/* Título Principal */}
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 leading-tight">
              Ingredientes Premium para
              <span className="block text-blue-600">Sorveterias e Confeitarias</span>
            </h1>

            {/* Subtítulo */}
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Fornecemos produtos de alta qualidade das melhores marcas do mercado para impulsionar seu negócio
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <a href={gerarLinkWhatsApp()} target="_blank" rel="noopener noreferrer">
                <Button 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-6 text-base shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Solicitar Orçamento
                </Button>
              </a>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-8 py-6 text-base transition-all duration-300"
              >
                Ver Catálogo
                <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Entrega Rápida</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span>Garantia de Qualidade</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                <span>Marcas Renomadas</span>
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
