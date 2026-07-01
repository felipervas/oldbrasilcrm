import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Edit, Send, Printer, MessageCircle, Truck, X, FileDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { syncFeedbackFollowup } from "@/lib/feedbackEntrega";
import { WhatsAppSendDialog } from "@/components/WhatsAppSendDialog";
import { openWhatsApp as sendViaWhatsApp } from "@/lib/whatsapp";
import { useParcelas } from "@/hooks/useParcelas";
import { gerarPedidoPdf } from "@/lib/pedidoPdf";

const statusColors: Record<string, string> = {
  Rascunho: "bg-muted text-muted-foreground",
  Enviado: "bg-secondary/20 text-secondary",
  Confirmado: "bg-green-100 text-green-700",
};

type ItemComProduto = Tables<"itens_pedido"> & { produtos: { nome: string; codigo_sku: string | null; unidade: string } | null };

export default function PedidoDetalhe() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [pedido, setPedido] = useState<Tables<"pedidos"> | null>(null);
  const [cliente, setCliente] = useState<Tables<"clientes"> | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [vendedorProfile, setVendedorProfile] = useState<Tables<"profiles"> | null>(null);
  const [itens, setItens] = useState<ItemComProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [previsaoEntrega, setPrevisaoEntrega] = useState<string>("");
  const [savingPrevisao, setSavingPrevisao] = useState(false);
  const { parcelas, marcarPaga } = useParcelas(id);

  const handleDownloadPdf = () => {
    if (!pedido || !cliente) return;
    gerarPedidoPdf({
      pedido: {
        id: pedido.id,
        numero: pedido.numero,
        created_at: pedido.created_at,
        status: pedido.status as string,
        subtotal: Number(pedido.subtotal),
        desconto: Number(pedido.desconto),
        frete: Number(pedido.frete),
        valor_total: Number(pedido.valor_total),
        forma_pagamento: pedido.forma_pagamento,
        prazo_pagamento: pedido.prazo_pagamento,
        transporte: pedido.transporte,
        observacoes: pedido.observacoes,
        ordem_compra: (pedido as any).ordem_compra,
        previsao_entrega: (pedido as any).previsao_entrega,
        parcelas_visivel_pdf: (pedido as any).parcelas_visivel_pdf,
        parcelas_modo_pdf: (pedido as any).parcelas_modo_pdf,
      },
      cliente: {
        nome_loja: cliente.nome_loja,
        nome_contato: cliente.nome_contato,
        cnpj: cliente.cnpj,
        ie: cliente.ie || (cliente as any).inscricao_estadual,
        endereco: cliente.endereco,
        bairro: cliente.bairro,
        cidade: cliente.cidade,
        estado: cliente.estado,
        cep: cliente.cep,
        telefone: cliente.telefone,
        celular: cliente.celular,
        email: cliente.email,
      },
      itens: itens.map((i) => {
        const prod = Array.isArray(i.produtos) ? i.produtos[0] : i.produtos;
        return ({
        referencia: (i as any).referencia ?? prod?.codigo_sku ?? null,
        produto_nome: (i as any).produto_nome ?? prod?.nome,
        produto_marca: (i as any).produto_marca,
        unidade_medida: (i as any).unidade_medida ?? prod?.unidade,
        quantidade: Number(i.quantidade),
        preco_unitario: Number(i.preco_unitario),
        desconto_pct: Number((i as any).desconto_pct ?? 0),
        subtotal: Number(i.subtotal),
      });
      }),
      parcelas: parcelas.map((p) => ({
        numero_parcela: p.numero_parcela,
        total_parcelas: p.total_parcelas,
        valor: Number(p.valor),
        vencimento: p.vencimento,
      })),
      vendedorNome: vendedorProfile?.nome ?? profile?.nome,
    });
  };

  useEffect(() => {
    if (!user || !id) return;
    fetchAll();
  }, [user?.id, id]);

  const fetchAll = async () => {
    const { data: pedido } = await supabase.from("pedidos").select("*").eq("id", id!).maybeSingle();
    if (!pedido) { navigate("/pedidos"); return; }
    setPedido(pedido);
    setPrevisaoEntrega((pedido as any).previsao_entrega ?? "");

    const vendedorUserId = (pedido as any).vendedor_id || pedido.representante_id;
    const [clienteRes, itensRes, profileRes, vendedorRes] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", pedido.cliente_id).maybeSingle(),
      supabase.from("itens_pedido").select("*, produtos(nome, codigo_sku, unidade)").eq("pedido_id", id!),
      supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
      vendedorUserId
        ? supabase.from("profiles").select("*").eq("user_id", vendedorUserId).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
    setCliente(clienteRes.data);
    setItens((itensRes.data as ItemComProduto[]) ?? []);
    setProfile(profileRes.data);
    setVendedorProfile((vendedorRes as any).data ?? profileRes.data);
    setLoading(false);
  };

  const marcarEnviado = async () => {
    const { error } = await supabase.from("pedidos").update({ status: "Enviado" as any, enviado_at: new Date().toISOString() }).eq("id", id!);
    if (error) { toast.error("Erro ao marcar como enviado."); return; }
    try {
      const { salvarComissaoPedido } = await import("@/lib/comissoes");
      await salvarComissaoPedido(id!);
    } catch (e) { console.error(e); }
    toast.success("Pedido marcado como enviado!");
    fetchAll();
  };

  const openWhatsApp = () => {
    setWhatsAppOpen(true);
  };

  const sendWhatsApp = async () => {
    if (!pedido || !cliente || !whatsAppPhone.trim()) { toast.error("Informe o número."); return; }

    const num = whatsAppPhone.replace(/\D/g, "");
    const phoneWithCountry = num.startsWith("55") ? num : `55${num}`;

    const itensText = itens.map(i => {
      const prod = Array.isArray(i.produtos) ? i.produtos[0] : i.produtos;
      return `${prod?.codigo_sku || "—"} - ${prod?.nome} | ${Number(i.quantidade) || 0} × R$ ${Number(i.preco_unitario ?? 0).toFixed(2)} = R$ ${Number(i.subtotal ?? 0).toFixed(2)}`;
    }).join("\n");

    const qtdTotal = itens.reduce((a, i) => a + (Number(i.quantidade) || 0), 0);

    const msg =
      `*PEDIDO #${pedido.numero ?? pedido.id.slice(0, 8)}*\n` +
      `Data: ${new Date(pedido.created_at).toLocaleDateString("pt-BR")}\n` +
      `Cliente: ${cliente.nome_loja}\n\n` +
      `*Itens:*\n${itensText}\n\n` +
      `Qtd total: ${qtdTotal}\n` +
      `Subtotal: R$ ${Number(pedido.subtotal ?? 0).toFixed(2)}\n` +
      (Number(pedido.desconto) > 0 ? `Desconto: - R$ ${Number(pedido.desconto ?? 0).toFixed(2)}\n` : "") +
      (Number(pedido.frete) > 0 ? `Frete: + R$ ${Number(pedido.frete ?? 0).toFixed(2)}\n` : "") +
      `*Total: R$ ${Number(pedido.valor_total ?? 0).toFixed(2)}*\n\n` +
      (pedido.forma_pagamento ? `Pagamento: ${pedido.forma_pagamento}\n` : "") +
      (pedido.transporte ? `Transporte: ${pedido.transporte}\n` : "") +
      (pedido.observacoes ? `Obs: ${pedido.observacoes}\n` : "");

    sendViaWhatsApp(phoneWithCountry, msg);

    // Mark as enviado
    if (pedido.status === "Rascunho" || pedido.status === "Confirmado") {
      await supabase.from("pedidos").update({ status: "Enviado" as any, enviado_at: new Date().toISOString() }).eq("id", id!);
      toast.success("Pedido enviado via WhatsApp!");
      fetchAll();
    }
    setWhatsAppOpen(false);
  };

  const savePrevisao = async (clear = false) => {
    if (!pedido) return;
    const novaPrevisao = clear ? null : (previsaoEntrega || null);

    if (novaPrevisao) {
      const dataPedido = pedido.created_at.split("T")[0];
      if (novaPrevisao < dataPedido) {
        toast.error("A previsão de entrega não pode ser anterior à data do pedido.");
        return;
      }
    }

    setSavingPrevisao(true);
    const { followupId, error: fuError } = await syncFeedbackFollowup({
      pedidoId: pedido.id,
      representanteId: pedido.representante_id,
      clienteId: pedido.cliente_id,
      clienteNome: cliente?.nome_loja ?? "Cliente",
      previsao: novaPrevisao,
      feedbackFollowupId: (pedido as any).feedback_followup_id ?? null,
    });

    if (fuError) {
      toast.error("Erro ao agendar tarefa de feedback.");
      setSavingPrevisao(false);
      return;
    }

    const { error } = await supabase
      .from("pedidos")
      .update({
        previsao_entrega: novaPrevisao,
        feedback_followup_id: novaPrevisao ? followupId : null,
      } as any)
      .eq("id", pedido.id);

    setSavingPrevisao(false);
    if (error) { toast.error("Erro ao salvar previsão."); return; }

    toast.success(clear || !novaPrevisao ? "Previsão removida." : "Previsão salva e feedback agendado!");
    if (clear) setPrevisaoEntrega("");
    fetchAll();
  };

  const formatDateTime = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const qtdTotal = itens.reduce((a, i) => a + (Number(i.quantidade) || 0), 0);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!pedido || !cliente) return null;

  const initials = (profile?.empresa || profile?.nome || "R").slice(0, 2).toUpperCase();

  return (
    <>
      {/* Screen UI - hidden on print */}
      <div className="space-y-6 pb-8 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/pedidos")}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-2xl font-bold text-primary">Pedido</h1>
              <p className="text-muted-foreground text-sm">#{pedido.numero ?? pedido.id.slice(0, 8)}</p>
            </div>
          </div>
          <Badge className={statusColors[pedido.status]}>{pedido.status}</Badge>
        </div>

        <div className="flex gap-2 flex-wrap">
          {pedido.status === "Rascunho" && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/pedidos/${id}/edit`)}><Edit className="h-4 w-4 mr-1" /> Editar</Button>
          )}
          {pedido.status === "Rascunho" && (
            <Button variant="outline" size="sm" onClick={marcarEnviado}><Send className="h-4 w-4 mr-1" /> Marcar Enviado</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.open(`/pedidos/${id}/imprimir`, "_blank")}><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}><FileDown className="h-4 w-4 mr-1" /> Baixar PDF</Button>
          <Button size="sm" className="text-white bg-[#25D366] hover:bg-[#20bc5a]" onClick={openWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-1" /> Enviar confirmação por WhatsApp
          </Button>
        </div>

        {parcelas.length > 0 && (
          <div className="border rounded-lg p-4 bg-card space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileDown className="h-4 w-4 text-secondary" />
              Parcelas (Boleto) — {parcelas.length}
            </h3>
            <div className="space-y-1.5">
              {parcelas.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 pb-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {p.numero_parcela}/{p.total_parcelas}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Venc. {new Date(p.vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      R$ {Number(p.valor ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <Button
                      size="sm"
                      variant={p.status === "pago" ? "default" : "outline"}
                      className="h-7 text-[11px]"
                      onClick={() => marcarPaga(p.id, p.status !== "pago")}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {p.status === "pago" ? "Pago" : "Marcar pago"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {cliente && pedido && (
          <WhatsAppSendDialog
            open={whatsAppOpen}
            onOpenChange={setWhatsAppOpen}
            clienteId={cliente.id}
            clienteNome={cliente.nome_loja}
            clienteTelefone={cliente.telefone}
            clienteCelular={cliente.celular}
            defaultTemplateKey="confirmacao_pedido"
            templateKeys={["confirmacao_pedido", "lembrete_entrega"]}
            title="Enviar confirmação por WhatsApp"
            extraVars={{
              pedido_numero: pedido.numero ?? pedido.id.slice(0, 8),
              pedido_total: Number(pedido.valor_total ?? 0).toFixed(2).replace(".", ","),
              pedido_itens: itens.map(i => {
                const prod = Array.isArray(i.produtos) ? i.produtos[0] : i.produtos;
                return `${Number(i.quantidade) || 0}x ${prod?.nome ?? "—"}`;
              }).join(", "),
              entrega_data: (pedido as any).previsao_entrega
                ? new Date((pedido as any).previsao_entrega + "T00:00:00").toLocaleDateString("pt-BR")
                : "a combinar",
            }}
          />
        )}

        {/* Previsão de entrega — só para pedidos confirmados/enviados */}
        {(pedido.status === "Confirmado" || pedido.status === "Enviado") && (
          <div className="border rounded-lg p-4 bg-card space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-sm">Previsão de entrega</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Defina a data prevista para a entrega. Uma tarefa de feedback será criada automaticamente na sua agenda para confirmar a entrega com o cliente.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1 flex-1 min-w-[180px]">
                <Label htmlFor="previsao-entrega" className="text-xs">Data prevista</Label>
                <Input
                  id="previsao-entrega"
                  type="date"
                  value={previsaoEntrega}
                  min={pedido.created_at.split("T")[0]}
                  onChange={e => setPrevisaoEntrega(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={() => savePrevisao(false)} disabled={savingPrevisao || !previsaoEntrega}>
                Salvar
              </Button>
              {(pedido as any).previsao_entrega && (
                <Button size="sm" variant="outline" onClick={() => savePrevisao(true)} disabled={savingPrevisao}>
                  <X className="h-4 w-4 mr-1" /> Limpar
                </Button>
              )}
            </div>
            {(pedido as any).previsao_entrega && (pedido as any).feedback_followup_id && (
              <Badge variant="outline" className="border-amber-400/60 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 gap-1">
                <Truck className="h-3 w-3" />
                Feedback agendado para {new Date((pedido as any).previsao_entrega + "T00:00:00").toLocaleDateString("pt-BR")}
              </Badge>
            )}
          </div>
        )}

        {/* Preview card (screen only) */}
        <div className="border rounded-lg p-6 bg-card space-y-4 text-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-lg">{profile?.empresa || vendedorProfile?.nome || profile?.nome}</p>
              {profile?.endereco_empresa && <p className="text-muted-foreground text-xs">{profile.endereco_empresa}</p>}
              {profile?.telefone_empresa && <p className="text-muted-foreground text-xs">Tel: {profile.telefone_empresa}</p>}
            </div>
            <div className="text-right">
              {profile?.cnpj_empresa && <p className="text-muted-foreground text-xs">CNPJ: {profile.cnpj_empresa}</p>}
              {profile?.site_empresa && <p className="text-muted-foreground text-xs">{profile.site_empresa}</p>}
              <p className="text-muted-foreground text-xs">{vendedorProfile?.email || profile?.email}</p>
            </div>
          </div>

          <div className="text-center py-2">
            <p className="font-bold text-lg">PEDIDO: #{pedido.numero ?? pedido.id.slice(0, 8)}</p>
            <p className="text-xs text-muted-foreground">Criação: {formatDateTime(pedido.created_at)}</p>
          </div>

          <div className="border rounded p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <p><strong>Nome:</strong> {cliente.nome_contato || "—"}</p>
            <p><strong>Fantasia:</strong> {cliente.nome_loja}</p>
            <p><strong>CPF/CNPJ:</strong> {cliente.cnpj || "—"}</p>
            <p><strong>RG/IE:</strong> {cliente.ie || (cliente as any).inscricao_estadual || "—"}</p>
            <p><strong>Endereço:</strong> {cliente.endereco || "—"}</p>
            <p><strong>Bairro:</strong> {cliente.bairro || "—"}</p>
            <p><strong>Cidade-UF:</strong> {cliente.cidade || "—"}{cliente.estado ? `-${cliente.estado}` : ""}</p>
            <p><strong>CEP:</strong> {cliente.cep || "—"}</p>
            <p><strong>Telefone:</strong> {cliente.telefone || "—"}</p>
            <p><strong>Celular:</strong> {cliente.celular || "—"}</p>
            <p><strong>Email:</strong> {cliente.email || "—"}</p>
            <p><strong>Vendedor:</strong> {vendedorProfile?.nome || profile?.nome || "—"}</p>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 px-2">Ref.</th>
                <th className="text-left py-1 px-2">Descrição</th>
                <th className="text-center py-1 px-2">Quant.</th>
                <th className="text-right py-1 px-2">Valor unit.</th>
                <th className="text-right py-1 px-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.map(item => {
                const prod = Array.isArray(item.produtos) ? item.produtos[0] : item.produtos;
                const nome = (item as any).produto_nome || prod?.nome || "—";
                const ref = (item as any).referencia || prod?.codigo_sku || "—";
                const un = (item as any).unidade_medida || prod?.unidade || "un";
                const tabelaPreco = (item as any).tabela_preco as string | null | undefined;
                const tabelaLabel = tabelaPreco
                  ? ({ tabela_1: "Tabela 1", tabela_2: "Tabela 2", tabela_3: "Tabela 3", tabela_4: "Tabela 4", distribuidor: "Distribuidor" } as Record<string, string>)[tabelaPreco]
                  : null;
                return (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-1 px-2">{ref}</td>
                  <td className="py-1 px-2">
                    {nome}{(item as any).produto_marca ? ` · ${(item as any).produto_marca}` : ""}
                    {tabelaLabel && (
                      <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium align-middle">
                        {tabelaLabel}
                      </span>
                    )}
                  </td>
                  <td className="text-center py-1 px-2">{Number(item.quantidade) || 0} {un}</td>
                  <td className="text-right py-1 px-2">R$ {Number(item.preco_unitario ?? 0).toFixed(2)}</td>
                  <td className="text-right py-1 px-2">R$ {Number(item.subtotal ?? 0).toFixed(2)}</td>
                </tr>
                );
              })}
            </tbody>
          </table>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-border">
            <dl className="space-y-1">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Vendedor</dt><dd className="font-medium text-right">{vendedorProfile?.nome || "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Quantidade total</dt><dd className="font-medium text-right">{qtdTotal}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Forma de pagamento</dt><dd className="font-medium text-right">{pedido.forma_pagamento || "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Prazo</dt><dd className="font-medium text-right">{pedido.prazo_pagamento || "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Transporte</dt><dd className="font-medium text-right">{pedido.transporte || "—"}</dd></div>
              {(pedido as any).ordem_compra && (
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Ordem de Compra</dt><dd className="font-medium text-right">{(pedido as any).ordem_compra}</dd></div>
              )}
            </dl>
            <dl className="space-y-1 md:border-l md:border-border md:pl-4">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-medium tabular-nums text-right">R$ {Number(pedido.subtotal ?? 0).toFixed(2)}</dd></div>
              {Number(pedido.desconto) > 0 && (
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Desconto (−)</dt><dd className="font-medium tabular-nums text-right text-destructive">R$ {Number(pedido.desconto ?? 0).toFixed(2)}</dd></div>
              )}
              {Number(pedido.frete) > 0 && (
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Frete (+)</dt><dd className="font-medium tabular-nums text-right">R$ {Number(pedido.frete ?? 0).toFixed(2)}</dd></div>
              )}
              <div className="flex justify-between gap-3 border-t border-border pt-1 mt-1">
                <dt className="font-semibold text-sm">Total geral</dt>
                <dd className="font-bold text-sm tabular-nums text-right text-primary">R$ {Number(pedido.valor_total ?? 0).toFixed(2)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* ===== PRINT-ONLY LAYOUT ===== */}
      <div className="hidden print:block print-document">
        {/* Header */}
        <div className="print-header">
          <div className="print-header-left">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="print-logo" />
            ) : (
              <div className="print-initials">{initials}</div>
            )}
            <div>
              <p className="print-company-name">{profile?.empresa || profile?.nome || "Empresa"}</p>
              {profile?.endereco_empresa && <p>{profile.endereco_empresa}</p>}
              {profile?.telefone_empresa && <p>Tel: {profile.telefone_empresa}</p>}
            </div>
          </div>
          <div className="print-header-right">
            {profile?.cnpj_empresa && <p>CNPJ: {profile.cnpj_empresa}</p>}
            {profile?.site_empresa && <p>{profile.site_empresa}</p>}
            {(vendedorProfile?.email || profile?.email) && <p>{vendedorProfile?.email || profile?.email}</p>}
          </div>
        </div>

        {/* Title */}
        <div className="print-title">
          <p className="print-title-main">PEDIDO: #{pedido.numero ?? pedido.id.slice(0, 8)}</p>
          <p className="print-title-date">Criação: {formatDateTime(pedido.created_at)}</p>
        </div>

        {/* Client data */}
        <div className="print-section-title">Dados cadastrais:</div>
        <table className="print-client-table">
          <tbody>
            <tr><td><strong>Nome:</strong> {cliente.nome_contato || "—"}</td><td><strong>Fantasia:</strong> {cliente.nome_loja}</td></tr>
            <tr><td><strong>CPF/CNPJ:</strong> {cliente.cnpj || "—"}</td><td><strong>RG/IE:</strong> {cliente.ie || (cliente as any).inscricao_estadual || "—"}</td></tr>
            <tr><td><strong>Endereço:</strong> {cliente.endereco || "—"}</td><td><strong>Bairro:</strong> {cliente.bairro || "—"}</td></tr>
            <tr><td><strong>Cidade-UF:</strong> {cliente.cidade || "—"}{cliente.estado ? `-${cliente.estado}` : ""}</td><td><strong>CEP:</strong> {cliente.cep || "—"}</td></tr>
            <tr><td><strong>Telefone:</strong> {cliente.telefone || "—"}</td><td><strong>Celular:</strong> {cliente.celular || "—"}</td></tr>
            <tr><td><strong>Email:</strong> {cliente.email || "—"}</td><td><strong>Vendedor:</strong> {vendedorProfile?.nome || profile?.nome || "—"}</td></tr>
          </tbody>
        </table>

        {/* Observações */}
        <div className="print-section-title">Observações:</div>
        <div className="print-obs-box">
          {pedido.observacoes || "\u00A0"}
        </div>

        {/* Products table */}
        <table className="print-products-table">
          <thead>
            <tr>
              <th>Ref.</th>
              <th>Descrição</th>
              <th>Quant.</th>
              <th>Valor unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map(item => {
              const prod = Array.isArray(item.produtos) ? item.produtos[0] : item.produtos;
              const nome = (item as any).produto_nome || prod?.nome || "—";
              const ref = (item as any).referencia || prod?.codigo_sku || "—";
              const un = (item as any).unidade_medida || prod?.unidade || "un";
              return (
              <tr key={item.id}>
                <td>{ref}</td>
                <td>{nome}</td>
                <td className="text-center">{Number(item.quantidade) || 0} {un}</td>
                <td className="text-right">R$ {Number(item.preco_unitario ?? 0).toFixed(2)}</td>
                <td className="text-right">R$ {Number(item.subtotal ?? 0).toFixed(2)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer totals */}
        <div className="print-totals">
          <div className="print-totals-left">
            <p>Quantidade total: {qtdTotal}</p>
            <p>Forma de pagamento: {pedido.forma_pagamento || "—"}</p>
            <p>Prazo de pagamento: {pedido.prazo_pagamento || "—"}</p>
            <p>Transporte: {pedido.transporte || "—"}</p>
            <p>Pago: R$ 0,00</p>
          </div>
          <div className="print-totals-right">
            <p>Sub total: R$ {Number(pedido.subtotal ?? 0).toFixed(2)}</p>
            <p>Desconto/sub total(-): R$ {Number(pedido.desconto ?? 0).toFixed(2)}</p>
            <p>Frete(+): R$ {Number(pedido.frete ?? 0).toFixed(2)}</p>
            <p className="print-grand-total">Total geral: R$ {Number(pedido.valor_total ?? 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Document footer */}
        <div className="print-footer">
          Gerado no RepApp em {new Date().toLocaleString("pt-BR")} por {vendedorProfile?.nome || profile?.nome || "Representante"}
        </div>
      </div>

      {/* WhatsApp Dialog */}
      <Dialog open={whatsAppOpen} onOpenChange={setWhatsAppOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" style={{ color: "#25D366" }} />
              Enviar via WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Número do WhatsApp</Label>
              <Input
                value={whatsAppPhone}
                onChange={e => setWhatsAppPhone(e.target.value)}
                placeholder="11999999999"
              />
              <p className="text-xs text-muted-foreground">DDD + número (sem +55)</p>
            </div>
            <Button className="w-full text-white" style={{ backgroundColor: "#25D366" }} onClick={sendWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" /> Enviar e marcar como Enviado
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
