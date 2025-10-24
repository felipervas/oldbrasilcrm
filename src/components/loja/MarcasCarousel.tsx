import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card } from "@/components/ui/card";

interface Marca {
  id: string;
  nome: string;
  slug: string;
  logo_url?: string | null;
}

interface MarcasCarouselProps {
  marcas: Marca[];
}

export function MarcasCarousel({ marcas }: MarcasCarouselProps) {
  // Filtrar apenas marcas com logo
  const marcasComLogo = marcas.filter(marca => marca.logo_url);

  if (marcasComLogo.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12 px-4 bg-muted/30">
      <div className="container mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-foreground">
          Nossas Marcas
        </h2>
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-5xl mx-auto"
        >
          <CarouselContent>
            {marcasComLogo.map((marca) => (
              <CarouselItem key={marca.id} className="md:basis-1/3 lg:basis-1/4">
                <Link to={`/loja/marca/${marca.slug}`}>
                  <Card className="p-4 hover:shadow-lg transition-shadow duration-200 bg-background border-border">
                    <div className="aspect-square flex items-center justify-center">
                      <img
                        src={marca.logo_url || '/placeholder.svg'}
                        alt={marca.nome}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </Card>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </section>
  );
}
