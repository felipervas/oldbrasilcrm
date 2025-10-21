import { useState, useMemo, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Image as ImageIcon, Edit, Eye, EyeOff, Star } from 'lucide-react';
import { useGerenciarProdutos, useGerenciarMarcas, useToggleVisibilidadeProduto, useToggleDestaqueProduto } from '@/hooks/useGerenciarLoja';
import { ProdutoEditDialog } from '@/components/loja/ProdutoEditDialog';
import { MarcaEditDialog } from '@/components/loja/MarcaEditDialog';
import { ListLoadingSkeleton } from '@/components/LoadingSkeleton';
import { getCorMarca } from '@/lib/precosLoja';
import { supabase } from '@/integrations/supabase/client';

export default function GerenciarLoja() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduto, setSelectedProduto] = useState<any>(null);
  const [selectedMarca, setSelectedMarca] = useState<any>(null);
  const [showProdutoDialog, setShowProdutoDialog] = useState(false);
  const [showMarcaDialog, setShowMarcaDialog] = useState(false);
  const [filtros, setFiltros] = useState({
    marca: 'all',
    visibilidade: 'todos',
    destaque: 'todos',
  });

  const { data: produtosRaw, isLoading: loadingProdutos } = useGerenciarProdutos(searchTerm);
  const { data: marcas, isLoading: loadingMarcas } = useGerenciarMarcas();
  const toggleVisibilidade = useToggleVisibilidadeProduto();
  const toggleDestaque = useToggleDestaqueProduto();

  // Enriquecer produtos com contagem de tabelas
  const [produtos, setProdutos] = useState<any[]>([]);
  
  useEffect(() => {
    const enrichProducts = async () => {
      if (!produtosRaw) return;
      
      const enriched = await Promise.all(
        produtosRaw.map(async (p: any) => {
          const { data: tabelas } = await supabase
            .from('produto_tabelas_preco')
            .select('id, nome_tabela')
            .eq('produto_id', p.id)
            .eq('ativo', true);
          
          const { data: tabelaLoja } = await supabase
            .from('produto_tabelas_preco')
            .select('nome_tabela')
            .eq('id', p.tabela_preco_loja_id || '')
            .single();
          
          return {
            ...p,
            tabelas_count: tabelas?.length || 0,
            tabela_loja: tabelaLoja
          };
        })
      );
      
      setProdutos(enriched);
    };
    
    enrichProducts();
  }, [produtosRaw]);

  // Filtrar produtos
  const produtosFiltrados = useMemo(() => {
    if (!produtos) return [];
    
    return produtos.filter((p: any) => {
      if (filtros.marca !== 'all' && p.marcas?.id !== filtros.marca) return false;
      if (filtros.visibilidade === 'visiveis' && !p.visivel_loja) return false;
      if (filtros.visibilidade === 'ocultos' && p.visivel_loja) return false;
      if (filtros.destaque === 'destaque' && !p.destaque_loja) return false;
      if (filtros.destaque === 'normal' && p.destaque_loja) return false;
      return true;
    });
  }, [produtos, filtros]);

  // Agrupar produtos Gencau por SKU base
  const produtosGencauAgrupados = useMemo(() => {
    if (!produtos) return [];
    
    const gencauProdutos = produtos.filter((p: any) => 
      p.marcas?.nome?.toLowerCase().includes('gencau')
    );

    const grupos: any = {};
    
    gencauProdutos.forEach((p: any) => {
      const nomeBase = p.nome.replace(/\s*\(.*?\)\s*/g, '').trim();
      if (!grupos[nomeBase]) {
        grupos[nomeBase] = {
          nomeBase,
          nome: nomeBase,
          produtos: [],
          produtoVisivelId: null,
        };
      }
      grupos[nomeBase].produtos.push(p);
      if (p.visivel_loja && !grupos[nomeBase].produtoVisivelId) {
        grupos[nomeBase].produtoVisivelId = p.id;
      }
    });

    return Object.values(grupos);
  }, [produtos]);

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

  const handleToggleVisibilidade = (id: string, visivel: boolean) => {
    toggleVisibilidade.mutate({ id, visivel });
  };

  const handleToggleDestaque = (id: string, destaque: boolean) => {
    toggleDestaque.mutate({ id, destaque });
  };

  const handleSelecionarProdutoVisivel = async (grupo: any, produtoId: string) => {
    // Ocultar todos os produtos do grupo
    for (const produto of grupo.produtos) {
      if (produto.id !== produtoId && produto.visivel_loja) {
        await handleToggleVisibilidade(produto.id, false);
      }
    }
    // Mostrar o selecionado
    const produtoSelecionado = grupo.produtos.find((p: any) => p.id === produtoId);
    if (produtoSelecionado && !produtoSelecionado.visivel_loja) {
      await handleToggleVisibilidade(produtoId, true);
    }
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
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="marcas">Marcas</TabsTrigger>
            <TabsTrigger value="gencau">🎯 Curadoria Gencau</TabsTrigger>
          </TabsList>

          <TabsContent value="produtos" className="space-y-4">
            {/* Filtros */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex gap-2 flex-1 flex-wrap">
                    {/* Busca */}
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar produtos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Filtro por marca */}
                    <Select 
                      value={filtros.marca} 
                      onValueChange={(v) => setFiltros({...filtros, marca: v})}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Todas as marcas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as marcas</SelectItem>
                        {marcas?.map((m: any) => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Filtro por visibilidade */}
                    <Select 
                      value={filtros.visibilidade} 
                      onValueChange={(v) => setFiltros({...filtros, visibilidade: v})}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os produtos</SelectItem>
                        <SelectItem value="visiveis">✅ Visíveis na loja</SelectItem>
                        <SelectItem value="ocultos">❌ Ocultos</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Filtro por destaque */}
                    <Select 
                      value={filtros.destaque} 
                      onValueChange={(v) => setFiltros({...filtros, destaque: v})}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="destaque">⭐ Em destaque</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {produtosFiltrados?.length || 0} produto(s)
                  </div>
                </div>
              </CardContent>
            </Card>

            {loadingProdutos ? (
              <ListLoadingSkeleton />
            ) : (
              <div className="grid gap-4">
                {produtosFiltrados?.map((produto: any) => (
                  <Card key={produto.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Checkbox para seleção futura */}
                        <Checkbox 
                          id={`produto-${produto.id}`}
                          className="flex-shrink-0"
                        />

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
                            
                            <Badge variant={produto.ativo ? "default" : "destructive"}>
                              {produto.ativo ? "Ativo" : "Inativo"}
                            </Badge>

                            <Badge variant={produto.visivel_loja ? "default" : "secondary"}>
                              {produto.visivel_loja ? "Visível" : "Oculto"}
                            </Badge>

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

                            {produto.tabelas_count > 0 && (
                              <Badge variant="outline" className="gap-1">
                                📋 {produto.tabelas_count} {produto.tabelas_count === 1 ? 'tabela' : 'tabelas'}
                              </Badge>
                            )}

                            {produto.tabela_loja?.nome_tabela && (
                              <Badge variant="default" className="gap-1">
                                🌐 {produto.tabela_loja.nome_tabela}
                              </Badge>
                            )}
                          </div>

                          {/* Ações rápidas */}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant={produto.visivel_loja ? "default" : "outline"}
                              onClick={() => handleToggleVisibilidade(produto.id, !produto.visivel_loja)}
                            >
                              {produto.visivel_loja ? (
                                <><Eye className="h-3 w-3 mr-1" /> Visível</>
                              ) : (
                                <><EyeOff className="h-3 w-3 mr-1" /> Oculto</>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant={produto.destaque_loja ? "default" : "outline"}
                              onClick={() => handleToggleDestaque(produto.id, !produto.destaque_loja)}
                            >
                              <Star className="h-3 w-3 mr-1" />
                              {produto.destaque_loja ? 'Destaque' : 'Normal'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {produtosFiltrados?.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Nenhum produto encontrado com os filtros selecionados
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="gencau" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>🎯 Curadoria Gencau</CardTitle>
                <CardDescription>
                  Selecione qual variação de cada produto Gencau deve aparecer na loja.
                  Produtos com diferentes tabelas de comissão são agrupados automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {produtosGencauAgrupados.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum produto Gencau encontrado
                  </p>
                ) : (
                  produtosGencauAgrupados.map((grupo: any) => (
                    <Card key={grupo.nomeBase} className="border-2">
                      <CardHeader>
                        <CardTitle className="text-lg">{grupo.nome}</CardTitle>
                        <CardDescription>
                          {grupo.produtos.length} variação(ões) encontrada(s)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {grupo.produtos.map((p: any) => (
                          <div 
                            key={p.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              p.visivel_loja ? 'bg-primary/5 border-primary' : 'bg-muted'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{p.nome}</span>
                                {p.visivel_loja && (
                                  <Badge variant="default" className="gap-1">
                                    <Eye className="h-3 w-3" />
                                    Visível
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <span className="font-semibold text-foreground">
                                  R$ {p.preco_por_kg?.toFixed(2)}/kg
                                </span>
                                {p.tabela_preco_loja && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-xs">
                                      {p.tabela_preco_loja}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={p.visivel_loja ? "secondary" : "default"}
                              onClick={() => handleSelecionarProdutoVisivel(grupo, p.id)}
                            >
                              {p.visivel_loja ? 'Selecionado' : 'Selecionar'}
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
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
