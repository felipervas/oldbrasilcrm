import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, MessageCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProdutoCard } from "@/components/loja/ProdutoCard";
import { PrecoCard } from "@/components/loja/PrecoCard";
import { AvisoVolatilidade } from "@/components/loja/AvisoVolatilidade";
import { useProdutoDetalhes, useProdutosRelacionados } from "@/hooks/useLojaPublic";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";
import { isMarcaVolatil, getCorMarca } from "@/lib/precosLoja";

export default function ProdutoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const [imagemAtual, setImagemAtual] = useState(0);

  const { data: produto, isLoading } = useProdutoDetalhes(id!);
  const { data: produtosRelacionados } = useProdutosRelacionados(
    produto?.marcas?.id || "",
    id!
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Produto não encontrado</h2>
        <Link to="/loja">
          <Button>Voltar para a Loja</Button>
        </Link>
      </div>
    );
  }

  const imagens = produto.produto_imagens || [];
  const imagemPrincipal = imagens[imagemAtual]?.url || "/placeholder.svg";
  const marca = produto.marcas?.nome || "Sem marca";
  const corMarca = getCorMarca(marca);
  const marcaVolatil = isMarcaVolatil(marca);


  const linkWhatsApp = gerarLinkWhatsApp({
    nome: produto.nome,
    sku: produto.sku,
    marca: marca,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-8">
          <Link to="/loja" className="hover:text-primary">
            Loja
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to={`/loja?marca=${produto.marcas?.id}`} className="hover:text-primary">
            {marca}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{produto.nome}</span>
        </nav>

        {/* Produto */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* Galeria de Imagens */}
          <div className="space-y-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
              <img
                src={imagemPrincipal}
                alt={produto.nome}
                className="w-full h-full object-cover"
              />
            </div>
            {imagens.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {imagens.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setImagemAtual(idx)}
                    className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${
                      imagemAtual === idx
                        ? "border-primary ring-2 ring-primary"
                        : "border-transparent hover:border-muted-foreground"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`${produto.nome} - ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informações do Produto */}
          <div className="space-y-6">
            <div>
              <Badge className={`${corMarca} text-white mb-3`}>{marca}</Badge>
              <h1 className="text-3xl font-bold mb-2">{produto.nome}</h1>
              <p className="text-muted-foreground">SKU: {produto.sku}</p>
              {produto.categoria && (
                <p className="text-sm text-muted-foreground mt-1">
                  Categoria: {produto.categoria}
                </p>
              )}
            </div>

            {marcaVolatil && produto.preco_atualizado_em && (
              <AvisoVolatilidade dataAtualizacao={produto.preco_atualizado_em} />
            )}

            <PrecoCard produto={produto} />

            {produto.descricao && (
              <div>
                <h2 className="font-semibold mb-2">Descrição</h2>
                <p className="text-muted-foreground">{produto.descricao}</p>
              </div>
            )}

            {produto.peso_embalagem_kg && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Peso da embalagem: <span className="font-semibold text-foreground">{produto.peso_embalagem_kg}kg</span>
                </p>
              </div>
            )}

            <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer" className="block">
              <Button size="lg" className="w-full bg-[#25d366] hover:bg-[#20ba5a] text-white">
                <MessageCircle className="mr-2 h-5 w-5" />
                Solicitar Orçamento via WhatsApp
              </Button>
            </a>

            {produto.marcas?.site && (
              <a
                href={produto.marcas.site}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-primary hover:underline"
              >
                Visite o site da marca
              </a>
            )}
          </div>
        </div>

        {/* Produtos Relacionados */}
        {produtosRelacionados && produtosRelacionados.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Produtos Relacionados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {produtosRelacionados.map((produtoRel: any) => (
                <ProdutoCard key={produtoRel.id} produto={produtoRel} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
