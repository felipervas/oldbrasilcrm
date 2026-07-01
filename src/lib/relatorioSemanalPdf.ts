const fmtBRL = (v: number | null | undefined) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export interface RelatorioSemanalRow {
  representante: string;
  pedidos: number;
  faturamento: number;
  ticketMedio: number;
  variacao: number | null;
}

export interface RelatorioSemanalData {
  periodoLabel: string;
  rows: RelatorioSemanalRow[];
  totalFaturamento: number;
  totalPedidos: number;
}

export async function gerarRelatorioSemanalPdf(data: RelatorioSemanalData) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 32;

  // ===== HEADER =====
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("OLD BRASIL", margin, 28);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Semanal de Vendas", margin, 46);
  doc.setFontSize(9);
  doc.text(`Semana: ${data.periodoLabel}`, pageWidth - margin, 28, { align: "right" });
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth - margin, 44, { align: "right" });

  doc.setTextColor(0, 0, 0);

  // ===== TABELA POR REPRESENTANTE =====
  autoTable(doc, {
    startY: 84,
    head: [["Representante", "Pedidos", "Faturamento", "Ticket médio", "vs. sem. anterior"]],
    body: data.rows.map((r) => [
      r.representante,
      String(r.pedidos),
      fmtBRL(r.faturamento),
      fmtBRL(r.ticketMedio),
      r.variacao == null ? "—" : `${r.variacao > 0 ? "+" : ""}${r.variacao.toFixed(0)}%`,
    ]),
    foot: [["TOTAL", String(data.totalPedidos), fmtBRL(data.totalFaturamento), "", ""]],
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [240, 240, 245], textColor: [30, 58, 95], fontStyle: "bold" },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "center" },
    },
    alternateRowStyles: { fillColor: [248, 248, 252] },
  });

  // ===== RODAPÉ =====
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Old Brasil • Dalberto Vasconcellos Ltda • Relatório gerado pelo sistema",
    pageWidth / 2,
    pageHeight - 16,
    { align: "center" }
  );

  doc.save(`relatorio-semanal-${data.periodoLabel.replace(/[^0-9]/g, "-")}.pdf`);
}
