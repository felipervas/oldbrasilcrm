import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Upload, Download, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Catalogos = () => {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [catalogoSelecionado, setCatalogoSelecionado] = useState<any>(null);
  const [catalogos, setCatalogos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState("");
  const [editFormData, setEditFormData] = useState<any>({});
  const { toast } = useToast();

  const loadCatalogos = async () => {
    const { data, error } = await supabase
      .from("catalogos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar catálogos", variant: "destructive" });
    } else {
      setCatalogos(data || []);
    }
  };

  useEffect(() => {
    loadCatalogos();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (validTypes.includes(fileExt)) {
        setSelectedFile(file);
        toast({ title: "Arquivo selecionado: " + file.name });
      } else {
        toast({ 
          title: "Tipo de arquivo não suportado", 
          description: "Use PDF ou imagens (JPG, PNG, WEBP)",
          variant: "destructive" 
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({ title: "Selecione um arquivo", variant: "destructive" });
      return;
    }

    setLoading(true);
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    const nome = formData.get("nome") as string;
    const descricao = formData.get("descricao") as string;

    try {
      // Upload do arquivo
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('catalogos')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('catalogos')
        .getPublicUrl(filePath);

      // Inserir registro no banco
      const { error: insertError } = await supabase.from("catalogos").insert({
        nome,
        descricao,
        tipo: tipo as "tabela_precos" | "catalogo",
        arquivo_url: urlData.publicUrl,
        arquivo_nome: selectedFile.name,
      });

      if (insertError) throw insertError;

      toast({ title: "Catálogo adicionado com sucesso!" });
      setOpen(false);
      setSelectedFile(null);
      setTipo("");
      loadCatalogos();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro ao adicionar catálogo", variant: "destructive" });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, arquivoUrl: string) => {
    if (!confirm("Tem certeza que deseja excluir este catálogo?")) return;

    try {
      // Extrair caminho do arquivo da URL
      const urlParts = arquivoUrl.split('/');
      const filePath = urlParts[urlParts.length - 1];

      // Deletar arquivo do storage
      await supabase.storage.from('catalogos').remove([filePath]);

      // Deletar registro do banco
      const { error } = await supabase.from("catalogos").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Catálogo excluído com sucesso!" });
      loadCatalogos();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro ao excluir catálogo", variant: "destructive" });
    }
  };

  const handleEdit = (catalogo: any) => {
    setCatalogoSelecionado(catalogo);
    setEditFormData({
      nome: catalogo.nome,
      descricao: catalogo.descricao || "",
    });
    setTipo(catalogo.tipo);
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogoSelecionado) return;

    setLoading(true);
    const { error } = await supabase
      .from("catalogos")
      .update({
        nome: editFormData.nome,
        descricao: editFormData.descricao,
        tipo: tipo,
      })
      .eq("id", catalogoSelecionado.id);

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao atualizar catálogo", variant: "destructive" });
    } else {
      toast({ title: "Catálogo atualizado com sucesso!" });
      setEditOpen(false);
      loadCatalogos();
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Tabelas de Preços e Catálogos
            </h1>
            <p className="text-muted-foreground">
              Gerencie seus catálogos e tabelas de preços
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Arquivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Catálogo ou Tabela de Preços</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" name="nome" required placeholder="Ex: Catálogo Invento 2024" />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={tipo} onValueChange={setTipo} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tabela_precos">Tabela de Preços</SelectItem>
                    <SelectItem value="catalogo">Catálogo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" name="descricao" placeholder="Descrição do arquivo" />
              </div>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors"
              >
                <Label htmlFor="arquivo" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Arraste arquivos aqui ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF ou Imagens (JPG, PNG, WEBP)
                    </p>
                  </div>
                </Label>
                <Input 
                  id="arquivo" 
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  required 
                  className="hidden"
                />
                {selectedFile && (
                  <p className="text-sm text-primary mt-3 font-medium">
                    ✓ {selectedFile.name}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={loading || uploading} className="w-full">
                {uploading ? "Enviando..." : "Adicionar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Arquivos Disponíveis
          </CardTitle>
          <CardDescription>
            Seus catálogos e tabelas de preços
          </CardDescription>
        </CardHeader>
        <CardContent>
          {catalogos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum arquivo ainda</p>
              <p className="text-sm">Adicione catálogos e tabelas de preços para sua equipe</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {catalogos.map((catalogo) => (
                <div key={catalogo.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold">{catalogo.nome}</h3>
                      <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded mt-1 inline-block">
                        {catalogo.tipo === 'tabela_precos' ? 'Tabela de Preços' : 'Catálogo'}
                      </span>
                    </div>
                  </div>
                  {catalogo.descricao && (
                    <p className="text-sm text-muted-foreground mb-3">{catalogo.descricao}</p>
                  )}
                  <p className="text-xs text-muted-foreground mb-3">
                    Arquivo: {catalogo.arquivo_nome}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(catalogo)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => window.open(catalogo.arquivo_url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(catalogo.id, catalogo.arquivo_url)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Catálogo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit_nome">Nome *</Label>
              <Input 
                id="edit_nome" 
                required
                value={editFormData.nome || ""}
                onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tabela_precos">Tabela de Preços</SelectItem>
                  <SelectItem value="catalogo">Catálogo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_descricao">Descrição</Label>
              <Textarea 
                id="edit_descricao"
                value={editFormData.descricao || ""}
                onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Catalogos;
