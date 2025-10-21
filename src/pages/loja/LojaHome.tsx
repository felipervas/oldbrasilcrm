import { Button } from "@/components/ui/button";
import { MarcaSection } from "@/components/loja/MarcaSection";
import { ModalAtendimentoExclusivo } from "@/components/loja/ModalAtendimentoExclusivo";
import { useLojaAgrupada } from "@/hooks/useLojaAgrupada";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";

export default function LojaHome() {
  const { data: marcas, isLoading } = useLojaAgrupada();

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
      
      {/* Marcas e Produtos */}
      <div id="produtos" className="container mx-auto px-4 py-8 md:py-16">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mb-4"></div>
            <p className="text-muted-foreground">Carregando produtos...</p>
          </div>
        ) : marcas && marcas.length > 0 ? (
          marcas.map((marca) => (
            <MarcaSection key={marca.id} marca={marca} />
          ))
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">Nenhum produto disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
