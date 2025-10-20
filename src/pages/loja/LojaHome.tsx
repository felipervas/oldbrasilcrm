import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MarcaSection } from "@/components/loja/MarcaSection";
import { useLojaAgrupada } from "@/hooks/useLojaAgrupada";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";

export default function LojaHome() {
  const { data: marcas, isLoading } = useLojaAgrupada();

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
      
      {/* Marcas e Produtos */}
      <div id="produtos" className="container mx-auto px-4 py-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
          </div>
        ) : (
          marcas?.map((marca) => (
            <MarcaSection key={marca.id} marca={marca} />
          ))
        )}
      </div>
    </div>
  );
}
