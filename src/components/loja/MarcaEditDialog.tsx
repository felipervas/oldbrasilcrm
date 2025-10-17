import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateMarca, useCreateMarca } from '@/hooks/useGerenciarLoja';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

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
    mostrar_texto_banner: true,
  });
  const [uploadingBanner, setUploadingBanner] = useState(false);

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
        mostrar_texto_banner: marca.mostrar_texto_banner ?? true,
      });
    } else {
      setFormData({
        nome: '',
        slug: '',
        descricao: '',
        site: '',
        ativa: true,
        imagem_banner: '',
        mostrar_texto_banner: true,
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

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    try {
      setUploadingBanner(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.slug || 'temp'}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('marca-banners')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('marca-banners')
        .getPublicUrl(filePath);

      setFormData({ ...formData, imagem_banner: publicUrl });
      toast.success('Banner enviado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar banner: ' + error.message);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = () => {
    setFormData({ ...formData, imagem_banner: '' });
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
            <Label>Banner da Marca</Label>
            {formData.imagem_banner ? (
              <div className="space-y-2">
                <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                  <img 
                    src={formData.imagem_banner} 
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveBanner}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Clique para fazer upload do banner
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Recomendado: 1200x400px (máx 5MB)
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                  className="cursor-pointer"
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.mostrar_texto_banner}
              onCheckedChange={(checked) => setFormData({ ...formData, mostrar_texto_banner: checked })}
            />
            <Label>Mostrar nome da marca sobre o banner</Label>
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
