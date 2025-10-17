import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProdutoCard } from './ProdutoCard';
import { ChevronRight } from 'lucide-react';

interface MarcaSectionProps {
  marca: any;
}

export const MarcaSection = ({ marca }: MarcaSectionProps) => {
  const { nome, slug, linhas, primeiros5, produtos, imagem_banner } = marca;
  
  return (
    <section className="mb-16">
      {/* Banner da Marca */}
      <div className="relative h-48 bg-gradient-to-r from-primary to-primary/80 rounded-lg mb-8 overflow-hidden">
        {/* Imagem de fundo se tiver */}
        {imagem_banner && (
          <img 
            src={imagem_banner} 
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            alt={nome}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">{nome}</h2>
        </div>
      </div>
      
      {/* Grid de Linhas/Produtos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {linhas ? (
          // Se tem linhas, mostrar cards de linhas
          <>
            {primeiros5.map((linhaNome: string) => (
              <Link 
                key={linhaNome}
                to={`/loja/marca/${slug}?linha=${encodeURIComponent(linhaNome)}`}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col items-center justify-center text-center">
                  <div className="text-lg font-semibold mb-2">{linhaNome}</div>
                  <div className="text-sm text-muted-foreground">
                    {linhas[linhaNome].length} {linhas[linhaNome].length === 1 ? 'produto' : 'produtos'}
                  </div>
                </Card>
              </Link>
            ))}
            
            {/* Botão Ver Mais se tiver mais de 5 linhas */}
            {Object.keys(linhas).length > 5 && (
              <Link to={`/loja/marca/${slug}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col items-center justify-center text-center bg-primary/10">
                  <ChevronRight className="h-8 w-8 text-primary mb-2" />
                  <div className="font-semibold text-primary">Ver Mais</div>
                  <div className="text-xs text-muted-foreground">
                    +{Object.keys(linhas).length - 5} {Object.keys(linhas).length - 5 === 1 ? 'linha' : 'linhas'}
                  </div>
                </Card>
              </Link>
            )}
          </>
        ) : (
          // Se não tem linhas, mostrar produtos direto
          <>
            {primeiros5.map((produto: any) => (
              <ProdutoCard key={produto.id} produto={produto} />
            ))}
            
            {/* Botão Ver Mais se tiver mais de 5 produtos */}
            {produtos.length > 5 && (
              <Link to={`/loja/marca/${slug}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col items-center justify-center text-center bg-primary/10">
                  <ChevronRight className="h-8 w-8 text-primary mb-2" />
                  <div className="font-semibold text-primary">Ver Mais</div>
                  <div className="text-xs text-muted-foreground">
                    +{produtos.length - 5} {produtos.length - 5 === 1 ? 'produto' : 'produtos'}
                  </div>
                </Card>
              </Link>
            )}
          </>
        )}
      </div>
    </section>
  );
};
