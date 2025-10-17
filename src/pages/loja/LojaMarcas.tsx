import { Link } from "react-router-dom";
import { ExternalLink, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarcasLoja } from "@/hooks/useLojaPublic";

export default function LojaMarcas() {
  const { data: marcas, isLoading } = useMarcasLoja();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Nossas Marcas</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Representamos as melhores marcas do mercado de sorveterias e confeitarias
          </p>
        </div>

        {/* Grid de Marcas */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : marcas && marcas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marcas.map((marca: any) => (
              <Card
                key={marca.id}
                className="hover:shadow-lg transition-shadow duration-300"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl mb-2">{marca.nome}</CardTitle>
                      <Badge variant="secondary">
                        <Package className="h-3 w-3 mr-1" />
                        {marca.produtos_count} {marca.produtos_count === 1 ? "produto" : "produtos"}
                      </Badge>
                    </div>
                  </div>
                  {marca.descricao && (
                    <CardDescription className="mt-3 line-clamp-3">
                      {marca.descricao}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link to={`/loja?marca=${marca.id}`}>
                    <Button className="w-full" variant="default">
                      Ver Produtos
                    </Button>
                  </Link>
                  {marca.site && (
                    <a
                      href={marca.site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full" variant="outline">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Visitar Site
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Nenhuma marca cadastrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
