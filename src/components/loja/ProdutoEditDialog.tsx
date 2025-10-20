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

interface ProdutoEditDialogProps {
  produto: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProdutoEditDialog = ({ produto, open, onOpenChange }: ProdutoEditDialogProps) => {
  const [formData, setFormData] = useState<any>({});
  const updateProduto = useUpdateProduto();
  const uploadImagem = useUploadImagemProduto();
  const removeImagem = useRemoveImagemProduto();

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
        sku: produto.sku || '',
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
      });
    }
  }, [produto]);

  const handleSave = () => {
    // Validação: não permitir salvar se nome estiver vazio
    if (!formData.nome || formData.nome.trim() === '') {
      return;
    }

    // Sanitizar ANTES de enviar: converter strings vazias e NaN em null
    const sanitizedData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (typeof value === 'string' && value.trim() === '') {
        acc[key] = null;
      } else if (typeof value === 'number' && isNaN(value)) {
        acc[key] = null;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    console.log("📤 ProdutoEditDialog - Enviando dados sanitizados:", sanitizedData);

    updateProduto.mutate({
      id: produto.id,
      data: sanitizedData,
    }, {
      onSuccess: () => {
        console.log("✅ ProdutoEditDialog - Produto atualizado com sucesso");
        onOpenChange(false);
      },
      onError: (error: any) => {
        console.error("❌ ProdutoEditDialog - Erro ao atualizar:", error);
      },
    });
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
                <Label>SKU</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
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
          <Button onClick={handleSave} disabled={updateProduto.isPending}>
            {updateProduto.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
