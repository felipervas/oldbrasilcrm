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
  imagem_banner?: string | null;
}

interface MarcasCarouselCompactProps {
  marcas: Marca[];
}

export function MarcasCarouselCompact({ marcas }: MarcasCarouselCompactProps) {
  const marcasComBanner = marcas.filter(marca => marca.imagem_banner);

  if (marcasComBanner.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-background via-muted/30 to-background border-b py-3">
      <div className="w-full px-4">
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
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {marcasComBanner.map((marca) => (
              <CarouselItem key={marca.id} className="basis-1/2 pl-4">
                <Link 
                  to={`/loja/marca/${marca.slug}`}
                  className="flex items-center justify-center h-16 rounded-lg hover:bg-accent/30 transition-all hover:scale-105 p-3"
                >
                  <img
                    src={marca.imagem_banner!}
                    alt={marca.nome}
                    className="max-w-full max-h-full object-contain transition-all opacity-90 hover:opacity-100"
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
