import { useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useReceitas, useDeleteReceita, useUploadReceita } from '@/hooks/useReceitas';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Upload, Search, Trash2, Eye, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const categorias = [
  { value: 'todos', label: 'Todas' },
  { value: 'sorvetes', label: 'Sorvetes', color: 'bg-blue-500' },
  { value: 'bolos', label: 'Bolos', color: 'bg-yellow-500' },
  { value: 'tortas', label: 'Tortas', color: 'bg-pink-500' },
  { value: 'outros', label: 'Outros', color: 'bg-gray-500' },
];

export default function Receitas() {
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfViewer, setPdfViewer] = useState<string | null>(null);
  
  // Form states
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('outros');

  const buscaDebounced = useDebounce(busca, 300);
  const { data: receitas = [], isLoading } = useReceitas(buscaDebounced, categoriaFiltro);
  const deleteReceita = useDeleteReceita();
  const uploadReceita = useUploadReceita();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setArquivo(file);
      if (!nome) setNome(file.name.replace('.pdf', ''));
    } else {
      toast({ title: 'Apenas arquivos PDF são permitidos', variant: 'destructive' });
    }
  }, [nome]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setArquivo(file);
      if (!nome) setNome(file.name.replace('.pdf', ''));
    } else {
      toast({ title: 'Apenas arquivos PDF são permitidos', variant: 'destructive' });
    }
  };

  const handleSubmit = async () => {
    if (!arquivo || !nome) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    uploadReceita.mutate(
      { file: arquivo, nome, descricao, categoria, usuarioId: user.id },
      {
        onSuccess: () => {
          setDialogAberto(false);
          setArquivo(null);
          setNome('');
          setDescricao('');
          setCategoria('outros');
        },
      }
    );
  };

  const getCategoriaColor = (cat: string) => {
    return categorias.find(c => c.value === cat)?.color || 'bg-gray-500';
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-subtle p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Receitas</h1>
            </div>
            <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Receita
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar Receita</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Drag and Drop Area */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                    }`}
                  >
                    <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragging ? 'text-primary animate-bounce' : 'text-muted-foreground'}`} />
                    <p className="text-sm text-muted-foreground mb-2">
                      Arraste seu PDF aqui ou clique para selecionar
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button variant="outline" type="button" asChild>
                        <span>Selecionar arquivo</span>
                      </Button>
                    </label>
                    {arquivo && (
                      <p className="mt-4 text-sm font-medium text-primary">{arquivo.name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="nome">Nome da Receita *</Label>
                    <Input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Sorvete de Chocolate"
                    />
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Descrição opcional da receita"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select value={categoria} onValueChange={setCategoria}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.filter(c => c.value !== 'todos').map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogAberto(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={uploadReceita.isPending}>
                      {uploadReceita.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filtros */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar receita..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grid de Receitas */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-32 bg-muted" />
                  <CardContent className="space-y-2 pt-4">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : receitas.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma receita encontrada</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {receitas.map((receita: any) => (
                <Card
                  key={receita.id}
                  className="shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105 animate-in fade-in"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{receita.nome}</CardTitle>
                      <Badge className={getCategoriaColor(receita.categoria)}>
                        {categorias.find(c => c.value === receita.categoria)?.label}
                      </Badge>
                    </div>
                    {receita.descricao && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{receita.descricao}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      Adicionado em {new Date(receita.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setPdfViewer(receita.arquivo_url)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Visualizar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja deletar esta receita? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteReceita.mutate({ id: receita.id, arquivoUrl: receita.arquivo_url })}
                            >
                              Deletar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* PDF Viewer Dialog */}
          <Dialog open={!!pdfViewer} onOpenChange={() => setPdfViewer(null)}>
            <DialogContent className="max-w-4xl h-[80vh]">
              <DialogHeader>
                <DialogTitle>Visualizar Receita</DialogTitle>
              </DialogHeader>
              {pdfViewer && (
                <iframe
                  src={pdfViewer}
                  className="w-full h-full rounded-lg"
                  title="PDF Viewer"
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AppLayout>
  );
}
