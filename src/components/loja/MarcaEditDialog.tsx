import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpdateMarca, useCreateMarca } from '@/hooks/useGerenciarLoja';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Plus, Trash2, User } from 'lucide-react';
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
    telefone: '',
    whatsapp: '',
    ativa: true,
    imagem_banner: '',
    mostrar_texto_banner: true,
    banner_largura: null,
    banner_altura: null,
    banner_object_fit: 'cover',
    banner_cor: '#000000',
    logo_url: '',
  });
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [contatos, setContatos] = useState<any[]>([]);
  const [novoContato, setNovoContato] = useState({
    nome: '',
    cargo: '',
    telefone: '',
    email: '',
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
        telefone: marca.telefone || '',
        whatsapp: marca.whatsapp || '',
        ativa: marca.ativa ?? true,
        imagem_banner: marca.imagem_banner || '',
        mostrar_texto_banner: marca.mostrar_texto_banner ?? true,
        banner_largura: marca.banner_largura || null,
        banner_altura: marca.banner_altura || null,
        banner_object_fit: marca.banner_object_fit || 'cover',
        banner_cor: marca.banner_cor || '#000000',
        logo_url: marca.logo_url || '',
      });
      loadContatos(marca.id);
    } else {
      setFormData({
        nome: '',
        slug: '',
        descricao: '',
        site: '',
        telefone: '',
        whatsapp: '',
        ativa: true,
        imagem_banner: '',
        mostrar_texto_banner: true,
        banner_largura: null,
        banner_altura: null,
        banner_object_fit: 'cover',
        banner_cor: '#000000',
        logo_url: '',
      });
      setContatos([]);
    }
  }, [marca]);

  const loadContatos = async (marcaId: string) => {
    const { data, error } = await supabase
      .from('marca_contatos')
      .select('*')
      .eq('marca_id', marcaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar contatos:', error);
    } else {
      setContatos(data || []);
    }
  };

  const handleAdicionarContato = async () => {
    if (!novoContato.nome.trim()) {
      toast.error('Nome do contato é obrigatório');
      return;
    }

    if (!marca?.id) {
      toast.error('Salve a marca antes de adicionar contatos');
      return;
    }

    const { error } = await supabase
      .from('marca_contatos')
      .insert({
        marca_id: marca.id,
        nome: novoContato.nome,
        cargo: novoContato.cargo || null,
        telefone: novoContato.telefone || null,
        email: novoContato.email || null,
      });

    if (error) {
      console.error('Erro ao adicionar contato:', error);
      toast.error('Erro ao adicionar contato');
    } else {
      toast.success('Contato adicionado!');
      setNovoContato({ nome: '', cargo: '', telefone: '', email: '' });
      loadContatos(marca.id);
    }
  };

  const handleRemoverContato = async (contatoId: string) => {
    if (!confirm('Deseja remover este contato?')) return;

    const { error } = await supabase
      .from('marca_contatos')
      .delete()
      .eq('id', contatoId);

    if (error) {
      console.error('Erro ao remover contato:', error);
      toast.error('Erro ao remover contato');
    } else {
      toast.success('Contato removido!');
      if (marca?.id) loadContatos(marca.id);
    }
  };

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setUploadingLogo(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${formData.slug || 'temp'}-${Date.now()}.${fileExt}`;
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

      setFormData({ ...formData, logo_url: publicUrl });
      toast.success('Logo enviado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar logo: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo_url: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{marca ? 'Editar Marca' : 'Nova Marca'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="contatos" disabled={!marca}>
              Contatos {marca && contatos.length > 0 && `(${contatos.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Telefone</Label>
              <Input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(11) 1234-5678"
              />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="(11) 98765-4321"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Clicável, abre o WhatsApp
              </p>
            </div>
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
                
                {/* Configurações de Dimensionamento */}
                <div className="space-y-3 p-3 bg-muted rounded-lg">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Largura (px)</Label>
                      <Input
                        type="number"
                        placeholder="Auto"
                        value={formData.banner_largura || ''}
                        onChange={(e) => setFormData({ ...formData, banner_largura: e.target.value ? parseInt(e.target.value) : null })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Altura (px)</Label>
                      <Input
                        type="number"
                        placeholder="Auto"
                        value={formData.banner_altura || ''}
                        onChange={(e) => setFormData({ ...formData, banner_altura: e.target.value ? parseInt(e.target.value) : null })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ajuste</Label>
                      <select
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        value={formData.banner_object_fit || 'cover'}
                        onChange={(e) => setFormData({ ...formData, banner_object_fit: e.target.value })}
                      >
                        <option value="cover">Preencher</option>
                        <option value="contain">Caber</option>
                        <option value="fill">Esticar</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Cor de Fundo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.banner_cor || '#000000'}
                        onChange={(e) => setFormData({ ...formData, banner_cor: e.target.value })}
                        className="w-20 h-9 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={formData.banner_cor || '#000000'}
                        onChange={(e) => setFormData({ ...formData, banner_cor: e.target.value })}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>
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

          <div>
            <Label>Logo da Marca (para carrossel)</Label>
            {formData.logo_url ? (
              <div className="space-y-2">
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border bg-background flex items-center justify-center">
                  <img 
                    src={formData.logo_url} 
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Clique para fazer upload da logo
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Recomendado: Logo quadrada (máx 5MB)
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
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

            <div className="flex justify-end gap-2 pt-4 border-t">
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
          </TabsContent>

          <TabsContent value="contatos" className="space-y-4 mt-4">
            {/* Adicionar Novo Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Adicionar Novo Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      placeholder="Ex: João Silva"
                      value={novoContato.nome}
                      onChange={(e) => setNovoContato({ ...novoContato, nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Cargo / Função</Label>
                    <Input
                      placeholder="Ex: Operacional, Secretária"
                      value={novoContato.cargo}
                      onChange={(e) => setNovoContato({ ...novoContato, cargo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={novoContato.telefone}
                      onChange={(e) => setNovoContato({ ...novoContato, telefone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="contato@empresa.com"
                      value={novoContato.email}
                      onChange={(e) => setNovoContato({ ...novoContato, email: e.target.value })}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAdicionarContato}
                  className="w-full"
                  disabled={!novoContato.nome.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Contato
                </Button>
              </CardContent>
            </Card>

            {/* Lista de Contatos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contatos da Marca ({contatos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contatos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum contato cadastrado ainda
                  </p>
                ) : (
                  <div className="space-y-3">
                    {contatos.map((contato) => (
                      <div 
                        key={contato.id}
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{contato.nome}</h4>
                              {contato.cargo && (
                                <span className="text-sm text-muted-foreground">
                                  • {contato.cargo}
                                </span>
                              )}
                            </div>
                            {contato.telefone && (
                              <p className="text-sm">
                                📞 <a href={`tel:${contato.telefone}`} className="hover:underline">
                                  {contato.telefone}
                                </a>
                              </p>
                            )}
                            {contato.email && (
                              <p className="text-sm">
                                ✉️ <a href={`mailto:${contato.email}`} className="hover:underline">
                                  {contato.email}
                                </a>
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoverContato(contato.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
