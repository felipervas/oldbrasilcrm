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
  const [novaTabela, setNovaTabela] = useState<{ marcadas?: string[] }>({ marcadas: [] });
  const [editingTables, setEditingTables] = useState<Record<string, { nome: string; preco: string }>>({});
  
  const updateProduto = useUpdateProduto();
  const uploadImagem = useUploadImagemProduto();
  const removeImagem = useRemoveImagemProduto();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: tabelasPreco = [], isLoading: loadingTabelas } = useTabelasPreco(produto?.id);
  const createTabela = useCreateTabelaPreco();
  const updateTabela = useUpdateTabelaPreco();
  const deleteTabela = useDeleteTabelaPreco();

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
        tabela_preco_loja_id: produto.tabela_preco_loja_id || null,
      });
    }
  }, [produto]);

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
        return;
      }

      // Sanitizar dados
      const sanitizedData = {
        ...formData,
        nome: formData.nome?.trim(),
        nome_loja: formData.nome_loja?.trim() || null,
        descricao: formData.descricao?.trim() || null,
        categoria: formData.categoria?.trim() || null,
      };

      console.log('📤 Dados sanitizados:', sanitizedData);

      await updateProduto.mutateAsync({
        id: produto.id,
        data: sanitizedData,
      });

      toast({
        title: "✅ Produto atualizado",
        description: "As alterações foram salvas com sucesso",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
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
  const debouncedUpdate = useDebounce(editingTables, 1000);

  useEffect(() => {
    if (Object.keys(debouncedUpdate).length > 0) {
      Object.entries(debouncedUpdate).forEach(([id, values]) => {
        const updates: any = {};
        if (values.nome !== undefined && values.nome !== '') updates.nome_tabela = values.nome;
        if (values.preco !== undefined && values.preco !== '') {
          updates.preco_por_kg = parseFloat(values.preco);
        }
        
        if (Object.keys(updates).length > 0) {
          updateTabela.mutate({
            id,
            produto_id: produto.id,
            ...updates,
          });
        }
      });
      setEditingTables({});
    }
  }, [debouncedUpdate, produto?.id, updateTabela]);

  const handleTableChange = (id: string, field: 'nome' | 'preco', value: string) => {
    setEditingTables(prev => ({
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
                <Label>Submarca</Label>
                <Input
                  value={formData.submarca}
                  onChange={(e) => setFormData({ ...formData, submarca: e.target.value })}
                  placeholder="Ex: Premium, Light..."
                />
              </div>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Preço por Kg (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.preco_por_kg ?? ''}
                  onChange={(e) => setFormData({ ...formData, preco_por_kg: parseNumericValue(e.target.value) })}
                />
              </div>
              <div>
                <Label>Peso da Embalagem (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.peso_embalagem_kg ?? ''}
                  onChange={(e) => setFormData({ ...formData, peso_embalagem_kg: parseNumericValue(e.target.value) })}
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

            {produto?.marcas?.nome?.toUpperCase().includes('UNIKA') && (
              <div>
                <Label>Rendimento por Dose (gramas)</Label>
                <Input
                  type="number"
                  value={formData.rendimento_dose_gramas ?? ''}
                  onChange={(e) => setFormData({ ...formData, rendimento_dose_gramas: parseNumericValue(e.target.value) })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Ex: 150g por dose de sorvete
                </p>
              </div>
            )}

            {/* Seção de Tabelas - NOVA INTERFACE */}
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
                              key={`nome-${tabelaId}-${t.nome_tabela}`}
                              defaultValue={t.nome_tabela}
                              className="h-9"
                              onChange={(e) => handleTableChange(tabelaId, 'nome', e.target.value)}
                              placeholder="Nome"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Preço (R$/kg)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              key={`preco-${tabelaId}-${t.preco_por_kg}`}
                              defaultValue={t.preco_por_kg || ''}
                              className="h-9"
                              onChange={(e) => handleTableChange(tabelaId, 'preco', e.target.value)}
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
