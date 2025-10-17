import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateMarca, useCreateMarca } from '@/hooks/useGerenciarLoja';

interface MarcaEditDialogProps {
  marca?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MarcaEditDialog = ({ marca, open, onOpenChange }: MarcaEditDialogProps) => {
  const [formData, setFormData] = useState<any>({
    nome: '',
    slug: '',
    descricao: '',
    site: '',
    ativa: true,
    imagem_banner: '',
  });

  const updateMarca = useUpdateMarca();
  const createMarca = useCreateMarca();

  useEffect(() => {
    if (marca) {
      setFormData({
        nome: marca.nome || '',
        slug: marca.slug || '',
        descricao: marca.descricao || '',
        site: marca.site || '',
        ativa: marca.ativa ?? true,
        imagem_banner: marca.imagem_banner || '',
      });
    } else {
      setFormData({
        nome: '',
        slug: '',
        descricao: '',
        site: '',
        ativa: true,
        imagem_banner: '',
      });
    }
  }, [marca]);

  const handleSave = () => {
    if (marca) {
      updateMarca.mutate({
        id: marca.id,
        data: formData,
      }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createMarca.mutate(formData, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const generateSlug = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{marca ? 'Editar Marca' : 'Nova Marca'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome da Marca</Label>
            <Input
              value={formData.nome}
              onChange={(e) => {
                const nome = e.target.value;
                setFormData({ 
                  ...formData, 
                  nome,
                  slug: generateSlug(nome)
                });
              }}
              placeholder="Ex: UNIKA, Gencau..."
            />
          </div>

          <div>
            <Label>Slug (URL amigável)</Label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="unika, gencau..."
            />
            <p className="text-sm text-muted-foreground mt-1">
              Usado na URL: /loja/marca/{formData.slug || 'exemplo'}
            </p>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição da marca para a loja..."
              rows={3}
            />
          </div>

          <div>
            <Label>Site Oficial</Label>
            <Input
              type="url"
              value={formData.site}
              onChange={(e) => setFormData({ ...formData, site: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label>URL do Banner (opcional)</Label>
            <Input
              type="url"
              value={formData.imagem_banner}
              onChange={(e) => setFormData({ ...formData, imagem_banner: e.target.value })}
              placeholder="https://..."
            />
            <p className="text-sm text-muted-foreground mt-1">
              Banner exibido na página da loja (recomendado: 1200x400px)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.ativa}
              onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
            />
            <Label>Marca ativa</Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateMarca.isPending || createMarca.isPending}
          >
            {(updateMarca.isPending || createMarca.isPending) ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
