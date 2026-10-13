const fmtBRL = (v: number | null | undefined) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR") : "—";

export interface PedidoPdfData {
  pedido: {
    id: string;
    numero?: string | null;
    created_at: string;
    status: string;
    subtotal: number;
    desconto: number;
    frete: number;
    valor_total: number;
    forma_pagamento: string | null;
    prazo_pagamento: string | null;
    transporte: string | null;
    observacoes: string | null;
    ordem_compra?: string | null;
    previsao_entrega?: string | null;
    parcelas_visivel_pdf?: boolean;
    parcelas_modo_pdf?: "datas" | "dias";
  };
  cliente: {
    nome_loja: string;
    nome_contato?: string | null;
    cnpj?: string | null;
    ie?: string | null;
    inscricao_estadual?: string | null;
    endereco?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
    telefone?: string | null;
    celular?: string | null;
    email?: string | null;
  };
  itens: Array<{
    referencia?: string | null;
    produto_nome?: string | null;
    produto_marca?: string | null;
    unidade_medida?: string | null;
    quantidade: number;
    preco_unitario: number;
    desconto_pct?: number;
    subtotal: number;
  }>;
  parcelas?: Array<{
    numero_parcela: number;
    total_parcelas: number;
    valor: number;
    vencimento: string;
  }>;
  vendedorNome?: string;
}

export async function gerarPedidoPdf(data: PedidoPdfData) {
  const { pedido, cliente, itens, parcelas, vendedorNome } = data;
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 32;
  let y = margin;

  // ===== HEADER (Old Brasil placeholder) =====
  doc.setFillColor(30, 58, 95); // primary #1E3A5F
  doc.rect(0, 0, pageWidth, 70, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("OLD BRASIL", margin, 32);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Dalberto Vasconcellos Ltda", margin, 46);
  doc.text("Distribuição para Gelaterias e Sorveterias - SC/RS", margin, 58);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`PEDIDO #${(pedido.numero || pedido.id.slice(0, 8)).toUpperCase()}`, pageWidth - margin, 32, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(fmtDateTime(pedido.created_at), pageWidth - margin, 46, { align: "right" });
  const marcas = Array.from(
    new Set(
      (itens || [])
        .map((i) => (i.produto_marca || "").trim())
        .filter((m) => m.length > 0)
    )
  );
  if (marcas.length > 0) {
    doc.text(marcas.join(" • ").toUpperCase(), pageWidth - margin, 58, { align: "right" });
  }

  y = 90;
  doc.setTextColor(0, 0, 0);

  // ===== CLIENT BLOCK =====
  const blockX = margin;
  const blockW = pageWidth - margin * 2;
  const headerH = 22;
  const rowGap = 6;
  const lineH = 11;
  const labelOffset = 60;
  const colPad = 8;

  const col1 = blockX + colPad;
  const col2 = blockX + blockW / 2 + colPad;
  const colInnerW = blockW / 2 - colPad * 2;
  const valueW = colInnerW - labelOffset;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const wrap = (value: string) =>
    doc.splitTextToSize(value || "—", valueW) as string[];

  const rows = [
    { l1: "Loja", v1: wrap(cliente.nome_loja), l2: "Contato", v2: wrap(cliente.nome_contato || "—") },
    { l1: "CNPJ", v1: wrap(cliente.cnpj || "—"), l2: "IE", v2: wrap(cliente.inscricao_estadual || cliente.ie || "—") },
    {
      l1: "Endereço",
      v1: wrap(`${cliente.endereco || "—"}${cliente.bairro ? `, ${cliente.bairro}` : ""}`),
      l2: "CEP",
      v2: wrap(cliente.cep || "—"),
    },
    {
      l1: "Cidade",
      v1: wrap(`${cliente.cidade || "—"}${cliente.estado ? `/${cliente.estado}` : ""}`),
      l2: "Telefone",
      v2: wrap(cliente.celular || cliente.telefone || "—"),
    },
    { l1: "Email", v1: wrap(cliente.email || "—"), l2: "Vendedor", v2: wrap(vendedorNome || "—") },
  ];

  const rowHeights = rows.map((r) => Math.max(r.v1.length, r.v2.length) * lineH + rowGap);
  const contentH = rowHeights.reduce((a, b) => a + b, 0);
  const blockH = headerH + contentH + 8;

  doc.setFillColor(245, 245, 250);
  doc.rect(blockX, y, blockW, blockH, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 95);
  doc.text("DADOS DO CLIENTE", blockX + colPad, y + 14);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  let yc = y + headerH + lineH;
  rows.forEach((r, idx) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${r.l1}:`, col1, yc);
    doc.text(`${r.l2}:`, col2, yc);
    doc.setFont("helvetica", "normal");
    doc.text(r.v1, col1 + labelOffset, yc);
    doc.text(r.v2, col2 + labelOffset, yc);
    yc += rowHeights[idx];
  });

  y += blockH + 12;

  // ===== ITEMS TABLE =====
  autoTable(doc, {
    startY: y,
    head: [["Ref.", "Produto", "Marca", "Un.", "Qtd", "Vl. Unit.", "Desc%", "Subtotal"]],
    body: itens.map((it) => [
      it.referencia || "—",
      it.produto_nome || "—",
      it.produto_marca || "—",
      it.unidade_medida || "un",
      String(Number(it.quantidade)),
      fmtBRL(it.preco_unitario),
      `${Number(it.desconto_pct ?? 0).toFixed(1)}%`,
      fmtBRL(it.subtotal),
    ]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      4: { halign: "center" },
      5: { halign: "right" },
      6: { halign: "center" },
      7: { halign: "right" },
    },
    alternateRowStyles: { fillColor: [248, 248, 252] },
  });

  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 12;

  // ===== TOTALS =====
  const totalsX = pageWidth - margin - 200;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX, y); doc.text(fmtBRL(pedido.subtotal), pageWidth - margin, y, { align: "right" }); y += 14;
  if (Number(pedido.desconto) > 0) {
    doc.text("Desconto (-):", totalsX, y); doc.text(`- ${fmtBRL(pedido.desconto)}`, pageWidth - margin, y, { align: "right" }); y += 14;
  }
  if (Number(pedido.frete) > 0) {
    doc.text("Frete (+):", totalsX, y); doc.text(fmtBRL(pedido.frete), pageWidth - margin, y, { align: "right" }); y += 14;
  }
  doc.setDrawColor(30, 58, 95);
  doc.line(totalsX, y, pageWidth - margin, y); y += 14;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 95);
  doc.text("TOTAL:", totalsX, y);
  doc.text(fmtBRL(pedido.valor_total), pageWidth - margin, y, { align: "right" });
  y += 18;

  // ===== CONDITIONS =====
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Condições", margin, y); y += 12;
  doc.setFont("helvetica", "normal");
  doc.text(`Forma de pagamento: ${pedido.forma_pagamento || "—"}`, margin, y); y += 12;
  if (pedido.ordem_compra) { doc.text(`Ordem de Compra: ${pedido.ordem_compra}`, margin, y); y += 12; }
  if (pedido.prazo_pagamento) { doc.text(`Prazo: ${pedido.prazo_pagamento}`, margin, y); y += 12; }
  if (pedido.transporte) { doc.text(`Transporte: ${pedido.transporte}`, margin, y); y += 12; }
  if (pedido.previsao_entrega) { doc.text(`Previsão de entrega: ${fmtDate(pedido.previsao_entrega)}`, margin, y); y += 12; }

  // ===== PARCELAS BOLETO =====
  const mostrarParcelas = pedido.parcelas_visivel_pdf !== false;
  const modoParcelas = pedido.parcelas_modo_pdf === "dias" ? "dias" : "datas";
  if (mostrarParcelas && parcelas && parcelas.length > 0) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Parcelas (Boleto)", margin, y); y += 4;
    const baseMs = new Date(pedido.created_at).getTime();
    const diasPara = (iso: string) => {
      const v = new Date(iso + "T00:00:00").getTime();
      return Math.max(0, Math.round((v - baseMs) / (1000 * 60 * 60 * 24)));
    };
    autoTable(doc, {
      startY: y,
      head: [["Parcela", modoParcelas === "dias" ? "Dias" : "Vencimento", "Valor"]],
      body: parcelas.map((p) => [
        `${p.numero_parcela}/${p.total_parcelas}`,
        modoParcelas === "dias" ? String(diasPara(p.vencimento)) : fmtDate(p.vencimento),
        fmtBRL(p.valor),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [212, 168, 67], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { halign: "center" }, 1: { halign: "center" }, 2: { halign: "right" } },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ===== OBSERVATIONS =====
  if (pedido.observacoes) {
    doc.setFont("helvetica", "bold");
    doc.text("Observações", margin, y); y += 12;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(pedido.observacoes, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 12;
  }

  // ===== EMPRESAS FORNECEDORAS =====
  if (marcas.length > 0) {
    y += 10;
    const pageHeightCheck = doc.internal.pageSize.getHeight();
    if (y > pageHeightCheck - 60) { doc.addPage(); y = margin; }
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 95);
    doc.setFont("helvetica", "bold");
    doc.text("Empresas fornecedoras", margin, y); y += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text(marcas.join(" • "), margin, y);
  }

  // ===== FOOTER =====
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")} • Old Brasil • Dalberto Vasconcellos Ltda`,
    pageWidth / 2,
    pageHeight - 16,
    { align: "center" }
  );


  doc.save(`pedido-${pedido.numero || pedido.id.slice(0, 8)}.pdf`);
}
