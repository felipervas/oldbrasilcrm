import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, ExternalLink } from "lucide-react";

export default function LojaCatalogos() {
  const [catalogos, setCatalogos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCatalogos();
  }, []);

  const loadCatalogos = async () => {
    try {
      const { data, error } = await supabase
        .from("catalogos")
        .select("*, marcas(nome)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCatalogos(data || []);
    } catch (error) {
      console.error("Erro ao carregar catálogos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTipoBadge = (tipo: string) => {
    const tipos: Record<string, { label: string; color: string }> = {
      tabela_preco: { label: "Tabela de Preço", color: "bg-blue-100 text-blue-800" },
      tabela_precos: { label: "Tabela de Preço", color: "bg-blue-100 text-blue-800" },
      catalogo: { label: "Catálogo", color: "bg-green-100 text-green-800" },
      ficha_tecnica: { label: "Ficha Técnica", color: "bg-purple-100 text-purple-800" },
      outro: { label: "Outro", color: "bg-gray-100 text-gray-800" },
    };
    const config = tipos[tipo] || tipos.outro;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Catálogos e Tabelas de Preço</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Acesse nossos catálogos, tabelas de preço e fichas técnicas
          </p>
        </div>

        {/* Grid de Catálogos */}
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
        ) : catalogos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogos.map((catalogo) => (
              <Card key={catalogo.id} className="group hover:shadow-lg transition-all hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <FileText className="h-8 w-8 text-primary" />
                    {getTipoBadge(catalogo.tipo)}
                  </div>
                  <CardTitle className="text-xl">{catalogo.nome}</CardTitle>
                  {catalogo.descricao && (
                    <CardDescription className="text-sm mt-2">{catalogo.descricao}</CardDescription>
                  )}
                  {catalogo.marcas && (
                    <div className="mt-2">
                      <Badge variant="outline">{catalogo.marcas.nome}</Badge>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <a href={catalogo.arquivo_url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Baixar / Visualizar
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Nenhum catálogo disponível no momento</p>
          </div>
        )}
      </div>
    </div>
  );
}
