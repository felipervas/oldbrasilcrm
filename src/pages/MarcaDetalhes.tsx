import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const MarcaDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [marca, setMarca] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [catalogos, setCatalogos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarcaDetalhes();
  }, [id]);

  const loadMarcaDetalhes = async () => {
    if (!id) return;

    setLoading(true);
    
    const [marcaRes, produtosRes, catalogosRes] = await Promise.all([
      supabase.from("marcas").select("*").eq("id", id).single(),
      supabase.from("produtos").select("*").eq("marca_id", id).order("nome"),
      supabase.from("catalogos").select("*").order("created_at", { ascending: false })
    ]);

    if (marcaRes.error) {
      toast({ title: "Erro ao carregar marca", variant: "destructive" });
      navigate("/marcas");
      return;
    }

    setMarca(marcaRes.data);
    setProdutos(produtosRes.data || []);
    setCatalogos(catalogosRes.data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <p className="text-center text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <Button variant="ghost" size="icon" onClick={() => navigate("/marcas")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {marca?.nome}
          </h1>
          <p className="text-muted-foreground">{marca?.descricao}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Produtos da Marca
            </CardTitle>
            <CardDescription>
              {produtos.length} produtos cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {produtos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum produto cadastrado para esta marca
              </p>
            ) : (
              <div className="space-y-3">
                {produtos.map((produto) => (
                  <div key={produto.id} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{produto.nome}</h4>
                        {produto.submarca && (
                          <Badge variant="secondary" className="mt-1">
                            Linha: {produto.submarca}
                          </Badge>
                        )}
                        {produto.sku && (
                          <p className="text-xs text-muted-foreground mt-1">SKU: {produto.sku}</p>
                        )}
                      </div>
                      {produto.preco_base && (
                        <p className="font-semibold text-primary">
                          R$ {parseFloat(produto.preco_base).toFixed(2)}
                        </p>
                      )}
                    </div>
                    {produto.descricao && (
                      <p className="text-sm text-muted-foreground mt-2">{produto.descricao}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Catálogos
            </CardTitle>
            <CardDescription>
              Material de vendas disponível
            </CardDescription>
          </CardHeader>
          <CardContent>
            {catalogos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum catálogo disponível
              </p>
            ) : (
              <div className="space-y-3">
                {catalogos.map((catalogo) => (
                  <div key={catalogo.id} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                    <h4 className="font-medium">{catalogo.nome}</h4>
                    {catalogo.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">{catalogo.descricao}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{catalogo.tipo}</Badge>
                      {catalogo.arquivo_url && (
                        <Button
                          size="sm"
                          variant="link"
                          className="h-auto p-0"
                          onClick={() => window.open(catalogo.arquivo_url, '_blank')}
                        >
                          Abrir arquivo
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarcaDetalhes;
