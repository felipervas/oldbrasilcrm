import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAmostras, Amostra } from "@/hooks/useAmostras";
import { RegistrarAmostraDialog } from "@/components/RegistrarAmostraDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Package, Plus, Trash2, Truck, Calendar, MessageSquare, Edit2, Check, X, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  opportunityId?: string | null;
  clienteId: string;
  clienteNome: string;
  readOnly?: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  enviada: { label: "Enviada", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  recebida: { label: "Recebida", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  aprovada: { label: "Aprovada", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejeitada: { label: "Rejeitada", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  sem_retorno: { label: "Sem retorno", className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
};

const formaEnvioLabel: Record<string, string> = {
  correios: "Correios",
  transportadora: "Transportadora",
  pessoal: "Entrega pessoal",
  outro: "Outro",
};

export function AmostrasPanel({ opportunityId, clienteId, clienteNome, readOnly = false }: Props) {
  const { amostras, loading, refetch } = useAmostras(
    opportunityId ? { opportunityId } : { clienteId }
  );
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>("enviada");
  const [editFeedback, setEditFeedback] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startEdit = (a: Amostra) => {
    setEditing(a.id);
    setEditStatus(a.status);
    setEditFeedback(a.feedback_cliente ?? "");
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from("amostras_enviadas")
      .update({ status: editStatus, feedback_cliente: editFeedback || null })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar.");
      return;
    }
    toast.success("Status atualizado.");
    setEditing(null);
    refetch();
  };

  const exportarPDF = async () => {
    if (amostras.length === 0) {
      toast.error("Nenhuma amostra para exportar.");
      return;
    }
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabeçalho
    doc.setFillColor(30, 58, 95); // primary #1E3A5F
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Histórico de Amostras Enviadas", 14, 13);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${clienteNome}`, 14, 21);

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")} • ${amostras.length} registro(s)`,
      14,
      36
    );

    // Tabela
    autoTable(doc, {
      startY: 42,
      head: [["Data", "Produto", "Marca", "Qtd", "Forma envio", "Rastreio", "Status", "Feedback / Obs."]],
      body: amostras.map((a) => [
        new Date(a.data_envio + "T00:00:00").toLocaleDateString("pt-BR"),
        a.produto_nome,
        a.produto_marca ?? "-",
        Number(a.quantidade ?? 0).toLocaleString("pt-BR"),
        a.forma_envio ? formaEnvioLabel[a.forma_envio] ?? a.forma_envio : "-",
        a.codigo_rastreio ?? "-",
        statusConfig[a.status]?.label ?? a.status,
        [a.observacoes, a.feedback_cliente ? `Feedback: ${a.feedback_cliente}` : null]
          .filter(Boolean)
          .join("\n") || "-",
      ]),
      styles: { fontSize: 8, cellPadding: 2.5, valign: "top" },
      headStyles: { fillColor: [212, 168, 67], textColor: [255, 255, 255], fontStyle: "bold" }, // secondary
      alternateRowStyles: { fillColor: [248, 248, 250] },
      columnStyles: {
        0: { cellWidth: 20 },
        3: { cellWidth: 14, halign: "right" },
        7: { cellWidth: 50 },
      },
      margin: { left: 10, right: 10 },
    });

    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Cellos Representações • Página ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: "center" }
      );
    }

    const filename = `amostras-${clienteNome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    toast.success("PDF gerado com sucesso!");
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("amostras_enviadas").delete().eq("id", deletingId);
    setDeletingId(null);
    if (error) {
      toast.error("Erro ao excluir.");
      return;
    }
    toast.success("Amostra excluída.");
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-secondary" />
            Amostras enviadas
            {amostras.length > 0 && <Badge variant="secondary" className="text-[10px]">{amostras.length}</Badge>}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Rastreio das amostras de produto enviadas ao cliente.</p>
        </div>
        <div className="flex items-center gap-2">
          {amostras.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportarPDF}>
              <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
            </Button>
          )}
          {!readOnly && (
            <Button size="sm" onClick={() => setOpenNew(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Plus className="h-4 w-4 mr-1" /> Registrar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : amostras.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma amostra registrada ainda.</p>
            {!readOnly && (
              <Button variant="link" size="sm" onClick={() => setOpenNew(true)} className="mt-1">
                Registrar a primeira amostra
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {amostras.map(a => {
            const cfg = statusConfig[a.status] ?? statusConfig.enviada;
            const isEditing = editing === a.id;
            return (
              <Card key={a.id} className="border shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{a.produto_nome}</p>
                        {a.produto_marca && <Badge variant="outline" className="text-[10px] h-5">{a.produto_marca}</Badge>}
                        <Badge className={cn("text-[10px] h-5", cfg.className)}>{cfg.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Quantidade: <span className="font-medium text-foreground">{Number(a.quantidade ?? 0).toLocaleString("pt-BR")}</span>
                      </p>
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        {!isEditing && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(a)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeletingId(a.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(a.data_envio + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                    {a.forma_envio && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {formaEnvioLabel[a.forma_envio] ?? a.forma_envio}
                      </span>
                    )}
                    {a.codigo_rastreio && (
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{a.codigo_rastreio}</span>
                    )}
                  </div>

                  {a.observacoes && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">{a.observacoes}</p>
                  )}

                  {a.feedback_cliente && !isEditing && (
                    <div className="flex items-start gap-1.5 text-xs bg-muted/40 rounded p-2">
                      <MessageSquare className="h-3.5 w-3.5 text-secondary mt-0.5 shrink-0" />
                      <p className="flex-1"><span className="font-medium">Feedback do cliente:</span> {a.feedback_cliente}</p>
                    </div>
                  )}

                  {isEditing && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Status</Label>
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Feedback do cliente</Label>
                        <Textarea
                          value={editFeedback}
                          onChange={(e) => setEditFeedback(e.target.value)}
                          rows={2}
                          placeholder="O que o cliente achou da amostra?"
                          className="text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          <X className="h-4 w-4 mr-1" /> Cancelar
                        </Button>
                        <Button size="sm" onClick={() => saveEdit(a.id)}>
                          <Check className="h-4 w-4 mr-1" /> Salvar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RegistrarAmostraDialog
        open={openNew}
        onOpenChange={setOpenNew}
        opportunityId={opportunityId}
        clienteId={clienteId}
        clienteNome={clienteNome}
        onCreated={refetch}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro de amostra?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente. O registro será removido do histórico.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
