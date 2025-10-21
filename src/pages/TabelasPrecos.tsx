import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Upload, Download, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TabelasPrecos = () => {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [tabelaSelecionada, setTabelaSelecionada] = useState<any>(null);
  const [tabelas, setTabelas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const tabelasFiltradas = tabelas.filter(tabela =>
    tabela.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tabela.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tabela.arquivo_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadTabelas = async () => {
    const { data, error } = await supabase
      .from("catalogos")
      .select("*")
      .eq("tipo", "tabela_precos")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar tabelas", variant: "destructive" });
    } else {
      setTabelas(data || []);
    }
  };

  useEffect(() => {
    loadTabelas();
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
      console.log("❌ Nenhum arquivo selecionado");
      toast({ title: "Selecione um arquivo", variant: "destructive" });
      return;
    }

    console.log("🔵 Iniciando upload:", selectedFile.name, "Tamanho:", selectedFile.size);
    setLoading(true);
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    const nome = formData.get("nome") as string;
    const descricao = formData.get("descricao") as string;

    console.log("📝 Dados do formulário:", { nome, descricao });

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log("📤 Fazendo upload para:", filePath);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('catalogos')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error("❌ Erro no upload:", uploadError);
        throw uploadError;
      }

      console.log("✅ Upload concluído:", uploadData);

      const { data: urlData } = supabase.storage
        .from('catalogos')
        .getPublicUrl(filePath);

      console.log("🔗 URL pública:", urlData.publicUrl);

      const { error: insertError } = await supabase.from("catalogos").insert({
        nome,
        descricao,
        tipo: "tabela_precos",
        arquivo_url: urlData.publicUrl,
        arquivo_nome: selectedFile.name,
      });

      if (insertError) {
        console.error("❌ Erro ao inserir no DB:", insertError);
        throw insertError;
      }

      console.log("✅ Tabela criada com sucesso!");
      toast({ title: "✅ Tabela adicionada com sucesso!" });
      setOpen(false);
      setSelectedFile(null);
      loadTabelas();
    } catch (error: any) {
      console.error("❌ Erro geral:", error);
      toast({ 
        title: "❌ Erro ao adicionar tabela", 
        description: error.message || "Erro desconhecido",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, arquivoUrl: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tabela?")) return;

    try {
      const urlParts = arquivoUrl.split('/');
      const filePath = urlParts[urlParts.length - 1];
      await supabase.storage.from('catalogos').remove([filePath]);
      const { error } = await supabase.from("catalogos").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Tabela excluída com sucesso!" });
      loadTabelas();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro ao excluir tabela", variant: "destructive" });
    }
  };

  const handleEdit = (tabela: any) => {
    setTabelaSelecionada(tabela);
    setEditFormData({
      nome: tabela.nome,
      descricao: tabela.descricao || "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tabelaSelecionada) return;

    setLoading(true);
    const { error } = await supabase
      .from("catalogos")
      .update({
        nome: editFormData.nome,
        descricao: editFormData.descricao,
      })
      .eq("id", tabelaSelecionada.id);

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao atualizar tabela", variant: "destructive" });
    } else {
      toast({ title: "Tabela atualizada com sucesso!" });
      setEditOpen(false);
      loadTabelas();
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              💰 Tabelas de Preços
            </h1>
            <p className="text-muted-foreground">
              Gerencie suas tabelas de preços
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Tabela
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Tabela de Preços</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" name="nome" required placeholder="Ex: Tabela 2024" />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" name="descricao" placeholder="Descrição da tabela" />
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
            Tabelas Disponíveis
          </CardTitle>
          <CardDescription>
            Suas tabelas de preços
          </CardDescription>
          <div className="mt-4">
            <Input
              placeholder="Buscar por nome, descrição ou arquivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {tabelasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma tabela ainda</p>
              <p className="text-sm">Adicione tabelas de preços para sua equipe</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tabelasFiltradas.map((tabela) => (
                <div key={tabela.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold">{tabela.nome}</h3>
                    </div>
                  </div>
                  {tabela.descricao && (
                    <p className="text-sm text-muted-foreground mb-3">{tabela.descricao}</p>
                  )}
                  <p className="text-xs text-muted-foreground mb-3">
                    Arquivo: {tabela.arquivo_nome}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(tabela)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => window.open(tabela.arquivo_url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(tabela.id, tabela.arquivo_url)}
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
            <DialogTitle>Editar Tabela</DialogTitle>
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

export default TabelasPrecos;