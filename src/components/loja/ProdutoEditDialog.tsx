import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUploadZone } from './ImageUploadZone';
import { useUpdateProduto, useUploadImagemProduto, useRemoveImagemProduto } from '@/hooks/useGerenciarLoja';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTabelasPreco, useCreateTabelaPreco, useUpdateTabelaPreco, useDeleteTabelaPreco } from '@/hooks/useTabelasPreco';
import { Plus, X, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryClient } from '@tanstack/react-query';

interface ProdutoEditDialogProps {
  produto: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProdutoEditDialog = ({ produto, open, onOpenChange }: ProdutoEditDialogProps) => {
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [localTables, setLocalTables] = useState<Record<string, { nome_tabela: string; preco_por_kg: string }>>({});
  const [marcas, setMarcas] = useState<any[]>([]);
  
  const updateProduto = useUpdateProduto();
  const uploadImagem = useUploadImagemProduto();
  const removeImagem = useRemoveImagemProduto();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: tabelasPreco = [], isLoading: loadingTabelas } = useTabelasPreco(produto?.id);
  const createTabela = useCreateTabelaPreco();
  const updateTabela = useUpdateTabelaPreco();
  const deleteTabela = useDeleteTabelaPreco();

  // Carregar marcas
  useEffect(() => {
    const loadMarcas = async () => {
      const { data } = await supabase.from('marcas').select('*').eq('ativa', true).order('nome');
      setMarcas(data || []);
    };
    loadMarcas();
  }, []);

  // FASE 1: Função helper para tratar valores numéricos
  const parseNumericValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '') return null;
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? null : parsed;
  };

  useEffect(() => {
    if (produto) {
      setFormData({
        nome: produto.nome || '',
        submarca: produto.submarca || '',
        marca_id: produto.marca_id || null,
        preco_base: produto.preco_base || '',
        preco_por_kg: produto.preco_por_kg || '',
        peso_unidade_kg: produto.peso_unidade_kg || '',
        peso_embalagem_kg: produto.peso_embalagem_kg || '',
        rendimento_dose_gramas: produto.rendimento_dose_gramas || '',
        descricao: produto.descricao || '',
        categoria: produto.categoria || '',
        subcategoria: produto.subcategoria || '',
        nome_loja: produto.nome_loja || '',
        visivel_loja: produto.visivel_loja ?? true,
        destaque_loja: produto.destaque_loja ?? false,
        ordem_exibicao: produto.ordem_exibicao || 0,
        ativo: produto.ativo ?? true,
        tipo_embalagem: produto.tipo_embalagem || 'caixa',
        tipo_venda: produto.tipo_venda || 'unidade',
        tabela_preco_loja_id: produto.tabela_preco_loja_id || null,
      });
    }
  }, [produto]);

  // Sincronizar localTables com tabelasPreco
  useEffect(() => {
    if (tabelasPreco.length > 0) {
      const tables: Record<string, { nome_tabela: string; preco_por_kg: string }> = {};
      tabelasPreco.forEach(t => {
        tables[t.id] = {
          nome_tabela: t.nome_tabela,
          preco_por_kg: t.preco_por_kg?.toString() || '',
        };
      });
      setLocalTables(tables);
    }
  }, [tabelasPreco]);

  const handleSave = async () => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      console.log('💾 Salvando produto:', formData);

      // Validação de campos obrigatórios
      if (!formData.nome?.trim()) {
        toast({
          title: "❌ Campo obrigatório",
          description: "O nome do produto é obrigatório",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Helper para converter valores numéricos
      const toNumericOrNull = (value: any): number | null => {
        if (value === '' || value === null || value === undefined) return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      };

      // Sanitizar dados com conversão correta de tipos
      const sanitizedData = {
        ...formData,
        nome: formData.nome?.trim(),
        submarca: formData.submarca?.trim() || null,
        nome_loja: formData.nome_loja?.trim() || null,
        descricao: formData.descricao?.trim() || null,
        categoria: formData.categoria?.trim() || null,
        subcategoria: formData.subcategoria?.trim() || null,
        // Converter campos numéricos corretamente
        preco_base: toNumericOrNull(formData.preco_base),
        preco_por_kg: toNumericOrNull(formData.preco_por_kg),
        peso_unidade_kg: toNumericOrNull(formData.peso_unidade_kg),
        peso_embalagem_kg: toNumericOrNull(formData.peso_embalagem_kg),
        rendimento_dose_gramas: toNumericOrNull(formData.rendimento_dose_gramas),
        ordem_exibicao: toNumericOrNull(formData.ordem_exibicao) || 0,
      };

      console.log('📤 Dados sanitizados:', sanitizedData);

      const result = await updateProduto.mutateAsync({
        id: produto.id,
        data: sanitizedData,
      });

      console.log('✅ Resultado da atualização:', result);

      toast({
        title: "✅ Produto atualizado",
        description: "As alterações foram salvas com sucesso",
      });
      
      // Aguardar um pouco antes de fechar para garantir que a query foi invalidada
      await new Promise(resolve => setTimeout(resolve, 500));
      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      toast({
        title: "❌ Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar o produto",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      await uploadImagem.mutateAsync({
        produtoId: produto.id,
        file,
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    const image = produto.produto_imagens[index];
    if (image?.id) {
      removeImagem.mutate({
        imagemId: image.id,
        url: image.url,
      });
    }
  };


  // Debounce para atualização automática de tabelas
  const debouncedTables = useDebounce(localTables, 1000);

  useEffect(() => {
    if (Object.keys(debouncedTables).length > 0 && tabelasPreco.length > 0) {
      Object.entries(debouncedTables).forEach(([id, values]) => {
        const original = tabelasPreco.find(t => t.id === id);
        if (!original) return;

        const updates: any = {};
        if (values.nome_tabela !== original.nome_tabela && values.nome_tabela.trim() !== '') {
          updates.nome_tabela = values.nome_tabela.trim();
        }
        if (values.preco_por_kg !== original.preco_por_kg?.toString()) {
          const preco = parseFloat(values.preco_por_kg);
          if (!isNaN(preco)) {
            updates.preco_por_kg = preco;
          }
        }
        
        if (Object.keys(updates).length > 0) {
          updateTabela.mutate({
            id,
            produto_id: produto.id,
            ...updates,
          });
        }
      });
    }
  }, [debouncedTables]);

  const handleTableChange = (id: string, field: 'nome_tabela' | 'preco_por_kg', value: string) => {
    setLocalTables(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      }
    }));
  };

  const handleDeleteTabela = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta tabela de preço?')) {
      deleteTabela.mutate({ id, produto_id: produto.id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto: {produto?.nome}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basico" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basico">Básico</TabsTrigger>
            <TabsTrigger value="imagens">Imagens</TabsTrigger>
            <TabsTrigger value="precos">Preços</TabsTrigger>
            <TabsTrigger value="loja">Loja</TabsTrigger>
          </TabsList>

          <TabsContent value="basico" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Produto</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>Marca</Label>
                <Select
                  value={formData.marca_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, marca_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {marcas.map((marca) => (
                      <SelectItem key={marca.id} value={marca.id}>
                        {marca.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Como é vendido?</Label>
              <Select
                value={formData.tipo_venda || 'unidade'}
                onValueChange={(value) => setFormData({ ...formData, tipo_venda: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidade">📦 Por Unidade/Caixa</SelectItem>
                  <SelectItem value="kg">⚖️ Por Kilo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Define como o produto será vendido nos pedidos
              </p>
            </div>

            <div>
              <Label>Submarca</Label>
              <Input
                value={formData.submarca}
                onChange={(e) => setFormData({ ...formData, submarca: e.target.value })}
                placeholder="Ex: Premium, Light..."
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label>Produto Ativo</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="imagens">
            <ImageUploadZone
              images={produto?.produto_imagens || []}
              onUpload={handleUpload}
              onRemove={handleRemoveImage}
              maxImages={5}
            />
          </TabsContent>

          <TabsContent value="precos" className="space-y-4">
            {/* Seção de Cálculos */}
            <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
              <div>
                <Label className="text-sm font-semibold">💰 Cálculos de Preço</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure o peso e preço para cálculos automáticos
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Peso da Embalagem (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.peso_embalagem_kg ?? ''}
                    onChange={(e) => {
                      const peso = parseNumericValue(e.target.value);
                      const precoKg = formData.preco_por_kg;
                      setFormData({
                        ...formData,
                        peso_embalagem_kg: peso,
                        preco_base: peso && precoKg ? (peso * precoKg).toFixed(2) : formData.preco_base
                      });
                    }}
                  />
                </div>
                
                <div>
                  <Label>Preço por Kg (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_por_kg ?? ''}
                    onChange={(e) => {
                      const precoKg = parseNumericValue(e.target.value);
                      const peso = formData.peso_embalagem_kg;
                      setFormData({
                        ...formData,
                        preco_por_kg: precoKg,
                        preco_base: precoKg && peso ? (precoKg * peso).toFixed(2) : formData.preco_base
                      });
                    }}
                  />
                </div>

                <div>
                  <Label>Tipo de Embalagem</Label>
                  <Select
                    value={formData.tipo_embalagem}
                    onValueChange={(value) => setFormData({ ...formData, tipo_embalagem: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caixa">Caixa</SelectItem>
                      <SelectItem value="saco">Saco</SelectItem>
                      <SelectItem value="balde">Balde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Rendimento por Dose (gramas)</Label>
                <Input
                  type="number"
                  value={formData.rendimento_dose_gramas ?? ''}
                  onChange={(e) => setFormData({ ...formData, rendimento_dose_gramas: parseNumericValue(e.target.value) })}
                  placeholder="Ex: 150 (gramas por dose de sorvete)"
                />
              </div>

              {/* Resumo dos Cálculos */}
              {formData.preco_por_kg && formData.peso_embalagem_kg && (
                <div className="bg-primary/10 p-4 rounded-lg space-y-2 text-sm">
                  <p className="font-semibold text-primary">📊 Resumo de Preços:</p>
                  <p>
                    <strong>Preço Total da Embalagem:</strong>{' '}
                    R$ {(parseFloat(formData.preco_por_kg) * parseFloat(formData.peso_embalagem_kg)).toFixed(2)}
                  </p>
                  
                  {formData.rendimento_dose_gramas && (
                    <>
                      <p>
                        <strong>Doses por kg:</strong>{' '}
                        {(1000 / parseInt(formData.rendimento_dose_gramas)).toFixed(1)} doses
                      </p>
                      <p>
                        <strong>Custo por dose ({formData.rendimento_dose_gramas}g):</strong>{' '}
                        R$ {((parseFloat(formData.preco_por_kg) * parseInt(formData.rendimento_dose_gramas)) / 1000).toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Seção de Tabelas */}
            <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
              <div>
                <Label className="text-sm font-semibold">📊 Tabelas de Negociação</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Edite as tabelas diretamente. Alterações são salvas automaticamente (500ms).
                </p>
              </div>
              
              {/* Tabelas existentes - CARDS EDITÁVEIS */}
              {tabelasPreco.length > 0 ? (
                <div className="space-y-3">
                  {tabelasPreco.map(t => {
                    const tabelaId = t.id;
                    return (
                      <div key={tabelaId} className="border rounded-lg p-3 bg-background space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Nome da Tabela</Label>
                            <Input
                              type="text"
                              value={localTables[tabelaId]?.nome_tabela || ''}
                              className="h-9"
                              onChange={(e) => handleTableChange(tabelaId, 'nome_tabela', e.target.value)}
                              placeholder="Nome"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Preço (R$/kg)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={localTables[tabelaId]?.preco_por_kg || ''}
                              className="h-9"
                              onChange={(e) => handleTableChange(tabelaId, 'preco_por_kg', e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`ativo-${tabelaId}`}
                                checked={t.ativo}
                                onCheckedChange={(checked) => {
                                  updateTabela.mutate({
                                    id: tabelaId,
                                    produto_id: produto.id,
                                    ativo: checked,
                                  });
                                }}
                              />
                              <Label htmlFor={`ativo-${tabelaId}`} className="text-xs cursor-pointer">
                                Ativa
                              </Label>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`usar-site-${tabelaId}`}
                                checked={t.usar_no_site}
                                onCheckedChange={(checked) => {
                                  updateTabela.mutate({
                                    id: tabelaId,
                                    produto_id: produto.id,
                                    usar_no_site: !!checked,
                                  });
                                }}
                              />
                              <Label htmlFor={`usar-site-${tabelaId}`} className="text-xs cursor-pointer">
                                Usar no site
                              </Label>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:text-destructive"
                            onClick={() => handleDeleteTabela(tabelaId)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma tabela de preço cadastrada
                </p>
              )}
              
              {/* Botão para adicionar nova tabela */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  const precoAtual = formData.preco_por_kg || 0;
                  const proximoNumero = tabelasPreco.length + 1;
                  createTabela.mutate({
                    produto_id: produto.id,
                    nome_tabela: `Tabela ${String(proximoNumero).padStart(2, '0')}`,
                    preco_por_kg: precoAtual,
                    usar_no_site: false,
                  });
                  toast({
                    title: "✅ Nova tabela criada",
                    description: "Edite o nome e preço conforme necessário"
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Nova Tabela
              </Button>

              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 Marque "Usar no site" na tabela que deseja exibir na loja pública. Apenas uma pode estar marcada.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="loja" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.visivel_loja}
                  onCheckedChange={(checked) => setFormData({ ...formData, visivel_loja: checked })}
                />
                <Label>Visível na loja online</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.destaque_loja}
                  onCheckedChange={(checked) => setFormData({ ...formData, destaque_loja: checked })}
                />
                <Label>Produto em destaque</Label>
              </div>

              <div>
                <Label>Ordem de Exibição</Label>
                <Input
                  type="number"
                  value={formData.ordem_exibicao}
                  onChange={(e) => setFormData({ ...formData, ordem_exibicao: parseInt(e.target.value) })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Menor número aparece primeiro
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bases e Pastas">Bases e Pastas</SelectItem>
                      <SelectItem value="Coberturas">Coberturas</SelectItem>
                      <SelectItem value="Toppings">Toppings</SelectItem>
                      <SelectItem value="Embalagens">Embalagens</SelectItem>
                      <SelectItem value="Acessórios">Acessórios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Subcategoria</Label>
                  <Input
                    value={formData.subcategoria}
                    onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })}
                    placeholder="Ex: Chocolates, Frutas..."
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || updateProduto.isPending}>
            {(isSaving || updateProduto.isPending) ? (
              <>
                <span className="animate-pulse">Salvando...</span>
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
