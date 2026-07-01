import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BookOpen, Upload, FileText, Trash2, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
}

interface CatalogoArquivo {
  id: string;
  brand_id: string;
  nome: string;
  arquivo_url: string;
  created_at: string;
}

export default function Catalogo() {
  const { isAdminOrGestor } = useUserRole();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [arquivos, setArquivos] = useState<CatalogoArquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchData = async () => {
    const [brandRes, arqRes] = await Promise.all([
      supabase.from("brands").select("id, name").eq("active", true).order("name"),
      supabase.from("catalogo_arquivos").select("*").order("created_at", { ascending: false }),
    ]);
    setBrands(brandRes.data ?? []);
    setArquivos(arqRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpload = async (brandId: string, file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são aceitos.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 100MB).");
      return;
    }
    setUploading(brandId);
    // Sanitize filename: remove accents, replace invalid chars with underscore
    const safeName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");
    const fileName = `${brandId}/${Date.now()}_${safeName}`;
    const { error: uploadErr } = await supabase.storage.from("catalogos").upload(fileName, file, {
      contentType: "application/pdf",
    });
    if (uploadErr) {
      toast.error("Erro ao enviar arquivo.");
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("catalogos").getPublicUrl(fileName);
    const { error: dbErr } = await supabase.from("catalogo_arquivos").insert({
      brand_id: brandId,
      nome: file.name,
      arquivo_url: urlData.publicUrl,
    });
    if (dbErr) {
      toast.error("Erro ao salvar registro.");
      setUploading(null);
      return;
    }
    toast.success("Catálogo enviado!");
    setUploading(null);
    fetchData();
  };

  const handleDelete = async (arq: CatalogoArquivo) => {
    // Extract path from URL
    const urlParts = arq.arquivo_url.split("/catalogos/");
    const storagePath = urlParts[1] ? decodeURIComponent(urlParts[1]) : null;
    if (storagePath) {
      await supabase.storage.from("catalogos").remove([storagePath]);
    }
    const { error } = await supabase.from("catalogo_arquivos").delete().eq("id", arq.id);
    if (error) { toast.error("Erro ao excluir."); return; }
    toast.success("Arquivo excluído!");
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Catálogo</h1>
        <p className="text-muted-foreground mt-1">PDFs de catálogos organizados por marca</p>
      </div>

      {brands.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">Nenhuma marca cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {brands.map(brand => {
            const brandFiles = arquivos.filter(a => a.brand_id === brand.id);
            return (
              <Card key={brand.id} className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">{brand.name}</h2>
                    <span className="text-xs text-muted-foreground">{brandFiles.length} arquivo(s)</span>
                  </div>

                  {brandFiles.length > 0 && (
                    <div className="space-y-2">
                      {brandFiles.map(arq => (
                        <div key={arq.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 hover:bg-muted transition-colors border border-border">
                          <FileText className="h-5 w-5 text-red-500 shrink-0" />
                          <span className="flex-1 text-sm font-medium text-foreground truncate">{arq.nome}</span>
                          <span className="text-[11px] text-foreground/70 shrink-0">
                            {new Date(arq.created_at).toLocaleDateString("pt-BR")}
                          </span>
                          <a
                            href={arq.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir em nova aba"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <a
                            href={arq.arquivo_url}
                            download={arq.nome}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Baixar arquivo"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          {isAdminOrGestor && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
                                  <AlertDialogDescription>O arquivo "{arq.nome}" será removido permanentemente.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(arq)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isAdminOrGestor && (
                    <>
                      <input
                        ref={el => { fileRefs.current[brand.id] = el; }}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(brand.id, f);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        disabled={uploading === brand.id}
                        onClick={() => fileRefs.current[brand.id]?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        {uploading === brand.id ? "Enviando..." : "Enviar PDF"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
