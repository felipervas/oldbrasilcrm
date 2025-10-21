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
import { Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface ProdutoEditDialogProps {
  produto: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProdutoEditDialog = ({ produto, open, onOpenChange }: ProdutoEditDialogProps) => {
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [novaTabela, setNovaTabela] = useState<{ marcadas?: string[] }>({ marcadas: [] });
  
  const updateProduto = useUpdateProduto();
  const uploadImagem = useUploadImagemProduto();
  const removeImagem = useRemoveImagemProduto();
  const { toast } = useToast();
  
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


  const handleUpdateTabela = (id: string, field: 'nome_tabela' | 'preco_por_kg', value: string) => {
    updateTabela.mutate({
      id,
      produto_id: produto.id,
      [field]: field === 'preco_por_kg' ? (value ? parseFloat(value) : null) : value,
    });
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

            {/* Seção de Tabelas - COMPACTA e INTEGRADA */}
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div>
                <Label className="text-sm font-semibold">📊 Tabelas de Negociação</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Marque para criar novas tabelas com o preço atual
                </p>
              </div>
              
              {/* Tabelas existentes (badges compactos) */}
              {tabelasPreco.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Existentes:</Label>
                  <div className="flex flex-wrap gap-2">
                    {tabelasPreco.map(t => (
                      <div key={t.id} className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs">
                        <span>{t.nome_tabela} - R$ {t.preco_por_kg?.toFixed(2)}/kg</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 hover:text-destructive"
                          onClick={() => handleDeleteTabela(t.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Grid de checkboxes para criar novas */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Criar novas:
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }, (_, i) => {
                    const num = tabelasPreco.length + i + 1;
                    const nomeTabela = `Tabela ${String(num).padStart(2, '0')}`;
                    const isChecked = novaTabela.marcadas?.includes(nomeTabela) || false;
                    
                    return (
                      <div key={num} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-tabela-${num}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const marcadas = novaTabela.marcadas || [];
                            if (checked) {
                              setNovaTabela({
                                ...novaTabela,
                                marcadas: [...marcadas, nomeTabela]
                              });
                            } else {
                              setNovaTabela({
                                ...novaTabela,
                                marcadas: marcadas.filter(n => n !== nomeTabela)
                              });
                            }
                          }}
                        />
                        <Label
                          htmlFor={`new-tabela-${num}`}
                          className="text-xs cursor-pointer"
                        >
                          {String(num).padStart(2, '0')}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Botão para criar tabelas marcadas */}
              {novaTabela.marcadas && novaTabela.marcadas.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const precoAtual = formData.preco_por_kg || 0;
                    novaTabela.marcadas?.forEach(nome => {
                      createTabela.mutate({
                        produto_id: produto.id,
                        nome_tabela: nome,
                        preco_por_kg: precoAtual,
                      });
                    });
                    setNovaTabela({ marcadas: [] });
                    toast({
                      title: "Tabelas criadas!",
                      description: `${novaTabela.marcadas.length} tabelas adicionadas`
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Criar {novaTabela.marcadas.length} tabelas selecionadas
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="loja" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Tabela de Preço para Loja Pública</Label>
                <Select
                  value={formData.tabela_preco_loja_id || ''}
                  onValueChange={(value) => 
                    setFormData({ ...formData, tabela_preco_loja_id: value || null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Usar preço padrão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Preço Padrão (preco_por_kg)</SelectItem>
                    {tabelasPreco.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome_tabela} - R$ {t.preco_por_kg?.toFixed(2)}/kg
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Preço exibido na loja online para o público
                </p>
              </div>

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
