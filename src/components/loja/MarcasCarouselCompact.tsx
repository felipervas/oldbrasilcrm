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
    <div className="w-full bg-muted/20 border-b py-2">
      <div className="container mx-auto px-4">
        <Carousel
          opts={{
            align: "center",
            loop: true,
          }}
          plugins={[
            Autoplay({
              delay: 2500,
              stopOnInteraction: false,
            }),
          ]}
          className="w-full max-w-md mx-auto"
        >
          <CarouselContent className="-ml-2">
            {marcasComLogo.map((marca) => (
              <CarouselItem key={marca.id} className="basis-1/2 pl-2">
                <Link 
                  to={`/loja/marca/${marca.slug}`}
                  className="flex items-center justify-center h-12 rounded-md hover:bg-accent/50 transition-colors p-2"
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
