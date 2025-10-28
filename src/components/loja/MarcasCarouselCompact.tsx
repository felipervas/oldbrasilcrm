import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface Marca {
  id: string;
  nome: string;
  slug: string;
  logo_url?: string | null;
}

interface MarcasCarouselCompactProps {
  marcas: Marca[];
}

export function MarcasCarouselCompact({ marcas }: MarcasCarouselCompactProps) {
  const marcasComLogo = marcas.filter(marca => marca.logo_url);

  if (marcasComLogo.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-muted/20 border-b py-3">
      <div className="container mx-auto px-4">
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          plugins={[
            Autoplay({
              delay: 3000,
              stopOnInteraction: false,
            }),
          ]}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {marcasComLogo.map((marca) => (
              <CarouselItem key={marca.id} className="basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6 pl-2 md:pl-4">
                <Link 
                  to={`/loja/marca/${marca.slug}`}
                  className="flex items-center justify-center h-16 rounded-md hover:bg-accent/50 transition-colors p-2"
                >
                  <img
                    src={marca.logo_url!}
                    alt={marca.nome}
                    className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100"
                  />
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}
