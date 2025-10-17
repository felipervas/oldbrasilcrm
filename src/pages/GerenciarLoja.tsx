import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Image as ImageIcon, Edit, Eye, EyeOff, Star } from 'lucide-react';
import { useGerenciarProdutos, useGerenciarMarcas } from '@/hooks/useGerenciarLoja';
import { ProdutoEditDialog } from '@/components/loja/ProdutoEditDialog';
import { MarcaEditDialog } from '@/components/loja/MarcaEditDialog';
import { ListLoadingSkeleton } from '@/components/LoadingSkeleton';
import { getCorMarca } from '@/lib/precosLoja';

export default function GerenciarLoja() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduto, setSelectedProduto] = useState<any>(null);
  const [selectedMarca, setSelectedMarca] = useState<any>(null);
  const [showProdutoDialog, setShowProdutoDialog] = useState(false);
  const [showMarcaDialog, setShowMarcaDialog] = useState(false);

  const { data: produtos, isLoading: loadingProdutos } = useGerenciarProdutos(searchTerm);
  const { data: marcas, isLoading: loadingMarcas } = useGerenciarMarcas();

  const handleEditProduto = (produto: any) => {
    setSelectedProduto(produto);
    setShowProdutoDialog(true);
  };

  const handleEditMarca = (marca: any) => {
    setSelectedMarca(marca);
    setShowMarcaDialog(true);
  };

  const handleNovaMarca = () => {
    setSelectedMarca(null);
    setShowMarcaDialog(true);
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">🛍️ Gerenciar Loja Online</h1>
          <p className="text-muted-foreground">
            Gerencie produtos, marcas e configurações da loja
          </p>
        </div>

        <Tabs defaultValue="produtos" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="marcas">Marcas</TabsTrigger>
          </TabsList>

          <TabsContent value="produtos" className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loadingProdutos ? (
              <ListLoadingSkeleton />
            ) : (
              <div className="grid gap-4">
                {produtos?.map((produto: any) => (
                  <Card key={produto.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Imagem preview */}
                        <div className="w-20 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          {produto.produto_imagens?.[0]?.url ? (
                            <img
                              src={produto.produto_imagens[0].url}
                              alt={produto.nome}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold truncate">{produto.nome}</h3>
                              <p className="text-sm text-muted-foreground">
                                SKU: {produto.sku || 'N/A'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditProduto(produto)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {produto.marcas && (
                              <Badge 
                                variant="outline"
                                className={getCorMarca(produto.marcas.nome)}
                              >
                                {produto.marcas.nome}
                              </Badge>
                            )}
                            
                            {produto.visivel_loja ? (
                              <Badge variant="default" className="gap-1">
                                <Eye className="h-3 w-3" />
                                Visível
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <EyeOff className="h-3 w-3" />
                                Oculto
                              </Badge>
                            )}

                            {produto.destaque_loja && (
                              <Badge variant="default" className="gap-1 bg-yellow-500">
                                <Star className="h-3 w-3" />
                                Destaque
                              </Badge>
                            )}

                            <Badge variant="outline">
                              <ImageIcon className="h-3 w-3 mr-1" />
                              {produto.produto_imagens?.length || 0} imagens
                            </Badge>

                            {produto.preco_por_kg && (
                              <Badge variant="outline">
                                R$ {produto.preco_por_kg.toFixed(2)}/kg
                              </Badge>
                            )}

                            {produto.categoria && (
                              <Badge variant="secondary">
                                {produto.categoria}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {produtos?.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Nenhum produto encontrado
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="marcas" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleNovaMarca}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Marca
              </Button>
            </div>

            {loadingMarcas ? (
              <ListLoadingSkeleton />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {marcas?.map((marca: any) => (
                  <Card key={marca.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{marca.nome}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            /{marca.slug}
                          </p>
                        </div>
                        <Badge variant={marca.ativa ? "default" : "secondary"}>
                          {marca.ativa ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {marca.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {marca.descricao}
                        </p>
                      )}
                      {marca.site && (
                        <p className="text-sm">
                          <a 
                            href={marca.site} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {marca.site}
                          </a>
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleEditMarca(marca)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar Marca
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {marcas?.length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Nenhuma marca cadastrada
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedProduto && (
        <ProdutoEditDialog
          produto={selectedProduto}
          open={showProdutoDialog}
          onOpenChange={setShowProdutoDialog}
        />
      )}

      {showMarcaDialog && (
        <MarcaEditDialog
          marca={selectedMarca}
          open={showMarcaDialog}
          onOpenChange={setShowMarcaDialog}
        />
      )}
    </AppLayout>
  );
}
