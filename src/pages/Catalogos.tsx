import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Upload, Download, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Catalogos = () => {
  const [open, setOpen] = useState(false);
  const [catalogos, setCatalogos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState("");
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
              <div>
                <Label htmlFor="arquivo">Arquivo (PDF ou Imagem) *</Label>
                <Input 
                  id="arquivo" 
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  required 
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Arquivo selecionado: {selectedFile.name}
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
    </div>
  );
};

export default Catalogos;
