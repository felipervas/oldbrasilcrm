import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, Save, CheckCircle, Truck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { syncFeedbackFollowup } from "@/lib/feedbackEntrega";
import { ClienteCombobox, type ClienteOption } from "@/components/ClienteCombobox";
import { ProdutoCombobox, type ProdutoOption } from "@/components/ProdutoCombobox";
import { VendedorSelect } from "@/components/VendedorSelect";
import { ParcelasBoletoCard, type ParcelaInput } from "@/components/ParcelasBoletoCard";
import { useParcelas } from "@/hooks/useParcelas";

const FORMAS_PAGAMENTO = ["À vista", "Boleto", "Cartão", "Pix"];
const TRANSPORTES = ["CIF", "FOB"];

const TABELAS_GENCAU = [
  { key: "tabela_1", label: "Tabela 1" },
  { key: "tabela_2", label: "Tabela 2" },
  { key: "tabela_3", label: "Tabela 3" },
  { key: "tabela_4", label: "Tabela 4" },
  { key: "distribuidor", label: "Distribuidor" },
] as const;
type TabelaPrecoKey = typeof TABELAS_GENCAU[number]["key"];
const isGencauMarca = (m: string | null | undefined) => (m ?? "").toLowerCase() === "gencau";

interface ItemPedido {
  produto_id: string;
  nome: string;
  marca: string | null;
  unidade: string | null;
  preco_tabela: number;
  preco_unitario: number; // praticado (após negociação, antes do desconto %)
  desconto_pct: number; // 0-100
  quantidade: number;
  tabela_preco?: TabelaPrecoKey | null;
  precos_gencau?: Partial<Record<TabelaPrecoKey, number>>;
}

export default function PedidoForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const [id, setId] = useState<string | undefined>(paramId);
  const isEdit = !!id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);

  const [vendedorId, setVendedorId] = useState("");
  const [cliente, setCliente] = useState<ClienteOption | null>(null);
  const [itens, setItens] = useState<ItemPedido[]>([]);

  // Desconto geral: % ou valor (mutuamente exclusivos)
  const [descGeralPct, setDescGeralPct] = useState(0);
  const [descGeralValor, setDescGeralValor] = useState(0);
  const [freteValor, setFreteValor] = useState(0);

  const [transporte, setTransporte] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [prazoPagamento, setPrazoPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ordemCompra, setOrdemCompra] = useState("");
  const [previsaoEntrega, setPrevisaoEntrega] = useState("");
  const [parcelas, setParcelas] = useState<ParcelaInput[]>([]);
  const [parcelasVisivelPdf, setParcelasVisivelPdf] = useState(true);
  const [parcelasModoPdf, setParcelasModoPdf] = useState<"datas" | "dias">("datas");
  const { parcelas: parcelasDb, replaceAll: replaceParcelas } = useParcelas(isEdit ? id : null);

  // Pré-selecionar o cliente vindo por link (?cliente=ID) ao criar um pedido novo
  useEffect(() => {
    const cid = searchParams.get("cliente");
    if (isEdit || !cid) return;
    supabase
      .from("clientes")
      .select("id, nome_loja, cidade, cnpj, celular, data_ultima_compra")
      .eq("id", cid)
      .maybeSingle()
      .then(({ data }) => { if (data) setCliente(data as ClienteOption); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (parcelasDb.length > 0) {
      setParcelas(parcelasDb.map((p) => ({
        numero_parcela: p.numero_parcela,
        total_parcelas: p.total_parcelas,
        valor: Number(p.valor),
        vencimento: p.vencimento,
      })));
    }
  }, [parcelasDb]);

  // Auto-save de rascunho (debounce 3s) — garante que pedido não se perca se fechar a aba
  const isAutoSaving = useRef(false);
  const savingRef = useRef(false); // trava p/ não duplicar pedido (duplo clique / autosave durante o salvar)
  useEffect(() => {
    if (loading || saving) return;
    if (!user) return;
    if (!cliente || itens.length === 0) return;
    const t = setTimeout(async () => {
      if (isAutoSaving.current || savingRef.current) return;
      isAutoSaving.current = true;
      try {
        const repId = vendedorId || user.id;
        const header: any = {
          representante_id: repId,
          vendedor_id: repId,
          cliente_id: cliente.id,
          cliente_nome: cliente.nome_loja,
          subtotal: subtotalItens,
          desconto: totalDescontoItens + descGeralCalc,
          desconto_geral_pct: descGeralPct || 0,
          desconto_geral_valor: descGeralPct > 0 ? 0 : descGeralValor,
          frete: freteValor,
          frete_valor: freteValor,
          valor_total: valorTotal,
          qtd_itens: itens.length,
          transporte: transporte || null,
          forma_pagamento: formaPagamento || null,
          prazo_pagamento: prazoPagamento || null,
          observacoes: observacoes || null,
          ordem_compra: ordemCompra || null,
          previsao_entrega: previsaoEntrega || null,
          parcelas_visivel_pdf: parcelasVisivelPdf,
          parcelas_modo_pdf: parcelasModoPdf,
          status: "Rascunho",
        };
        let currentId = id;
        if (currentId) {
          await supabase.from("pedidos").update(header).eq("id", currentId);
        } else {
          const { data, error } = await supabase.from("pedidos").insert(header).select("id").maybeSingle();
          if (!error && data) {
            currentId = data.id;
            setId(data.id);
            window.history.replaceState(null, "", `/pedidos/${data.id}/edit`);
          }
        }
        // Persistir itens do rascunho para não "sumirem" ao recarregar
        let itensOk = true;
        if (currentId) {
          const itensInsert = itens.map((i) => {
            const precoPraticado = i.preco_unitario * (1 - i.desconto_pct / 100);
            return {
              pedido_id: currentId!,
              produto_id: i.produto_id,
              produto_nome: i.nome,
              produto_marca: i.marca,
              unidade_medida: i.unidade,
              quantidade: i.quantidade,
              preco_unitario: i.preco_unitario,
              preco_tabela: i.preco_tabela,
              preco_praticado: precoPraticado,
              desconto_pct: i.desconto_pct,
              subtotal: i.quantidade * precoPraticado,
              tabela_preco: i.tabela_preco ?? null,
            };
          });
          if (itensInsert.length > 0) {
            // Insere os novos ANTES de apagar os antigos: o rascunho nunca fica vazio.
            const { data: novos, error: insErr } = await supabase
              .from("itens_pedido").insert(itensInsert).select("id");
            if (insErr || !novos || novos.length === 0) {
              itensOk = false;
            } else {
              const novosIds = novos.map((r: any) => r.id);
              await supabase.from("itens_pedido").delete()
                .eq("pedido_id", currentId)
                .not("id", "in", `(${novosIds.join(",")})`);
            }
          }
          // Persistir as parcelas do boleto também no rascunho — assim o prazo de
          // pagamento não some quando o pedido entra em rascunho pelo auto-save.
          if (itensOk && formaPagamento === "Boleto" && parcelas.length > 0) {
            await replaceParcelas(currentId, parcelas);
          }
        }
        // Só carimba "Rascunho salvo" se os itens realmente entraram.
        if (itensOk) setAutoSavedAt(new Date());
      } finally {
        isAutoSaving.current = false;
      }
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, itens, descGeralPct, descGeralValor, freteValor, transporte, formaPagamento, prazoPagamento, observacoes, ordemCompra, previsaoEntrega, vendedorId, parcelasVisivelPdf, parcelasModoPdf, parcelas]);

  useEffect(() => {
    if (!user) return;
    if (!isEdit) { setLoading(false); return; }
    fetchPedido();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id]);

  const fetchPedido = async () => {
    const { data: pedido } = await supabase.from("pedidos").select("*").eq("id", id).maybeSingle();
    if (!pedido) {
      toast.error("Pedido não encontrado.");
      navigate("/pedidos");
      return;
    }
    if (pedido.status === "Enviado") {
      toast.error("Pedido enviado não pode ser editado.");
      navigate(`/pedidos/${id}`);
      return;
    }
    if (pedido.vendedor_id) setVendedorId(pedido.vendedor_id);
    setDescGeralPct(Number((pedido as any).desconto_geral_pct ?? 0));
    setDescGeralValor(Number((pedido as any).desconto_geral_valor ?? 0));
    setFreteValor(Number((pedido as any).frete_valor ?? pedido.frete ?? 0));
    setTransporte(pedido.transporte ?? "");
    setFormaPagamento(pedido.forma_pagamento ?? "");
    setPrazoPagamento(pedido.prazo_pagamento ?? "");
    setObservacoes(pedido.observacoes ?? "");
    setOrdemCompra(((pedido as any).ordem_compra) ?? "");
    setPrevisaoEntrega((pedido as any).previsao_entrega ?? "");
    setParcelasVisivelPdf((pedido as any).parcelas_visivel_pdf ?? true);
    setParcelasModoPdf(((pedido as any).parcelas_modo_pdf as "datas" | "dias") ?? "datas");

    // Cliente
    const { data: cli } = await supabase
      .from("clientes")
      .select("id, nome_loja, cidade, cnpj, celular, data_ultima_compra")
      .eq("id", pedido.cliente_id)
      .maybeSingle();
    if (cli) setCliente(cli);

    const { data: itensData } = await supabase
      .from("itens_pedido")
      .select("*, produtos(nome, marca, unidade)")
      .eq("pedido_id", id);

    if (itensData) {
      const baseItens: ItemPedido[] = itensData.map((it: any) => ({
        produto_id: it.produto_id,
        nome: it.produto_nome ?? it.produtos?.nome ?? "",
        marca: it.produto_marca ?? it.produtos?.marca ?? null,
        unidade: it.unidade_medida ?? it.produtos?.unidade ?? null,
        preco_tabela: Number(it.preco_tabela ?? it.preco_unitario),
        preco_unitario: Number(it.preco_unitario),
        desconto_pct: Number(it.desconto_pct ?? 0),
        quantidade: Number(it.quantidade),
        tabela_preco: (it.tabela_preco as TabelaPrecoKey | null) ?? null,
      }));
      // Carregar precos Gencau para itens da marca
      const gencauIds = baseItens.filter(i => isGencauMarca(i.marca)).map(i => i.produto_id);
      if (gencauIds.length) {
        const { data: precos } = await supabase
          .from("produto_precos")
          .select("produto_id, tipo_tabela, preco")
          .in("produto_id", gencauIds);
        const map: Record<string, Partial<Record<TabelaPrecoKey, number>>> = {};
        (precos ?? []).forEach((r: any) => {
          map[r.produto_id] ??= {};
          map[r.produto_id][r.tipo_tabela as TabelaPrecoKey] = Number(r.preco);
        });
        baseItens.forEach(i => { if (isGencauMarca(i.marca)) i.precos_gencau = map[i.produto_id] ?? {}; });
      }
      setItens(baseItens);
    }
    setLoading(false);
  };

  const addProduto = async (p: ProdutoOption) => {
    if (itens.find(i => i.produto_id === p.id)) {
      toast.error("Produto já adicionado.");
      return;
    }
    const novo: ItemPedido = {
      produto_id: p.id,
      nome: p.nome,
      marca: p.marca,
      unidade: p.unidade,
      preco_tabela: p.preco,
      preco_unitario: p.preco,
      desconto_pct: 0,
      quantidade: 1,
      tabela_preco: null,
    };
    if (isGencauMarca(p.marca)) {
      const { data: precos } = await supabase
        .from("produto_precos")
        .select("tipo_tabela, preco")
        .eq("produto_id", p.id);
      const map: Partial<Record<TabelaPrecoKey, number>> = {};
      (precos ?? []).forEach((r: any) => { map[r.tipo_tabela as TabelaPrecoKey] = Number(r.preco); });
      novo.precos_gencau = map;
      novo.preco_tabela = 0;
      novo.preco_unitario = 0;
    }
    setItens(prev => [...prev, novo]);
  };

  const updateItem = (idx: number, patch: Partial<ItemPedido>) => {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const removeItem = (idx: number) => setItens(itens.filter((_, i) => i !== idx));

  // Cálculos
  const subtotalItens = useMemo(
    () => itens.reduce((acc, i) => acc + i.preco_unitario * i.quantidade, 0),
    [itens]
  );
  const totalDescontoItens = useMemo(
    () => itens.reduce((acc, i) => acc + i.preco_unitario * i.quantidade * (i.desconto_pct / 100), 0),
    [itens]
  );
  const subtotalLiquido = subtotalItens - totalDescontoItens;

  const descGeralCalc = useMemo(() => {
    if (descGeralPct > 0) return subtotalLiquido * (descGeralPct / 100);
    return descGeralValor;
  }, [descGeralPct, descGeralValor, subtotalLiquido]);

  const valorTotal = Math.max(0, subtotalLiquido - descGeralCalc + freteValor);

  const descontoMedioPct = subtotalItens > 0
    ? ((totalDescontoItens + descGeralCalc) / subtotalItens) * 100
    : 0;

  const handleSave = async (status: "Rascunho" | "Confirmado") => {
    if (savingRef.current) return; // já está salvando — evita salvar/duplicar duas vezes
    if (!cliente) { toast.error("Selecione um cliente."); return; }
    if (itens.length === 0) { toast.error("Adicione pelo menos um item."); return; }
    if (itens.some(i => i.quantidade <= 0)) { toast.error("Quantidade deve ser maior que 0."); return; }
    if (formaPagamento === "Boleto") {
      if (parcelas.length === 0) { toast.error("Gere as parcelas do boleto antes de salvar."); return; }
      const soma = parcelas.reduce((a, p) => a + Number(p.valor || 0), 0);
      if (Math.abs(soma - valorTotal) > 0.05) {
        toast.error("Soma das parcelas difere do total do pedido.");
        return;
      }
    }

    savingRef.current = true;
    setSaving(true);
    const repId = vendedorId || user!.id;
    const pedidoData: any = {
      representante_id: repId,
      vendedor_id: repId,
      cliente_id: cliente.id,
      cliente_nome: cliente.nome_loja,
      subtotal: subtotalItens,
      desconto: totalDescontoItens + descGeralCalc,
      desconto_geral_pct: descGeralPct || 0,
      desconto_geral_valor: descGeralPct > 0 ? 0 : descGeralValor,
      frete: freteValor,
      frete_valor: freteValor,
      valor_total: valorTotal,
      qtd_itens: itens.length,
      transporte: transporte || null,
      forma_pagamento: formaPagamento || null,
      prazo_pagamento: prazoPagamento || null,
      observacoes: observacoes || null,
      ordem_compra: ordemCompra || null,
      status,
      previsao_entrega: previsaoEntrega || null,
      parcelas_visivel_pdf: parcelasVisivelPdf,
      parcelas_modo_pdf: parcelasModoPdf,
    };

    let pedidoId = id;

    try {
      // 1) Cabeçalho — usa o id atual (que o auto-save pode já ter criado) para
      // ATUALIZAR em vez de inserir de novo: é o que evita pedido/itens duplicados.
      if (id) {
        const { error } = await supabase.from("pedidos").update(pedidoData).eq("id", id);
        if (error) throw new Error("Não foi possível salvar o pedido.");
      } else {
        const { data, error } = await supabase.from("pedidos").insert(pedidoData).select("id").maybeSingle();
        if (error || !data) throw new Error("Não foi possível criar o pedido.");
        pedidoId = data.id;
        setId(data.id); // registra o id: se um auto-save atrasar, ele atualiza (não duplica)
      }

      // 2) Itens — referências de TODOS os produtos numa consulta só
      const produtoIds = itens.map((i) => i.produto_id);
      const { data: prodRows } = await supabase
        .from("produtos")
        .select("id, codigo_sku, referencia")
        .in("id", produtoIds);
      const refMap = new Map<string, string | null>();
      (prodRows ?? []).forEach((p: any) => { refMap.set(p.id, p.referencia || p.codigo_sku || null); });

      const itensInsert = itens.map((i) => {
        const precoPraticado = i.preco_unitario * (1 - i.desconto_pct / 100);
        return {
          pedido_id: pedidoId!,
          produto_id: i.produto_id,
          produto_nome: i.nome,
          produto_marca: i.marca,
          unidade_medida: i.unidade,
          referencia: refMap.get(i.produto_id) ?? null,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          preco_tabela: i.preco_tabela,
          preco_praticado: precoPraticado,
          desconto_pct: i.desconto_pct,
          subtotal: i.quantidade * precoPraticado,
          tabela_preco: i.tabela_preco ?? null,
        };
      });

      // Insere os NOVOS itens ANTES de apagar os antigos. Assim, se a gravação dos
      // itens falhar, o pedido NUNCA fica salvo vazio (nem ao criar, nem ao editar).
      const { data: novosItens, error: itensErr } = await supabase
        .from("itens_pedido").insert(itensInsert).select("id");
      if (itensErr || !novosItens || novosItens.length === 0) {
        if (!id && pedidoId) await supabase.from("pedidos").delete().eq("id", pedidoId); // desfaz cabeçalho órfão
        throw new Error("Os itens do pedido não foram salvos. Tente de novo.");
      }
      if (id) {
        // edição: remove os itens antigos (tudo que não acabou de ser inserido)
        const novosIds = novosItens.map((r: any) => r.id);
        await supabase.from("itens_pedido").delete().eq("pedido_id", id).not("id", "in", `(${novosIds.join(",")})`);
      }

      // 3) Parcelas (boleto)
      if (pedidoId) {
        if (formaPagamento === "Boleto" && parcelas.length > 0) {
          await replaceParcelas(pedidoId, parcelas);
        } else {
          await supabase.from("pedido_parcelas").delete().eq("pedido_id", pedidoId);
        }
      }

      // 4) Feedback follow-up (secundário)
      if (status === "Confirmado" && previsaoEntrega && pedidoId) {
        const { data: pedidoAtual } = await supabase
          .from("pedidos")
          .select("feedback_followup_id")
          .eq("id", pedidoId)
          .maybeSingle();
        const { followupId } = await syncFeedbackFollowup({
          pedidoId,
          representanteId: repId,
          clienteId: cliente.id,
          clienteNome: cliente.nome_loja,
          previsao: previsaoEntrega,
          feedbackFollowupId: (pedidoAtual as any)?.feedback_followup_id ?? null,
        });
        if (followupId) {
          await supabase
            .from("pedidos")
            .update({ feedback_followup_id: followupId } as any)
            .eq("id", pedidoId);
        }
      }

      // 5) Comissão (secundária — não impede o pedido de ser salvo)
      if (status === "Confirmado" && pedidoId) {
        try {
          const { salvarComissaoPedido } = await import("@/lib/comissoes");
          await salvarComissaoPedido(pedidoId);
        } catch (e) {
          console.error("Erro ao calcular comissão:", e);
          toast.warning("Pedido salvo, mas a comissão não foi calculada.");
        }
      }

      toast.success(status === "Rascunho" ? "Rascunho salvo!" : "Pedido confirmado!");
      navigate(`/pedidos/${pedidoId}`);
    } catch (e: any) {
      toast.error(e?.message || "Houve um erro ao salvar. Confira a conexão e tente de novo.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pedidos")}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary">{isEdit ? "Editar Pedido" : "Novo Pedido"}</h1>
          <p className="text-muted-foreground text-sm">
            Preencha os dados do pedido
            {autoSavedAt && (
              <span className="ml-2 text-emerald-700 text-xs">
                · Rascunho salvo {autoSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Vendedor responsável pelo pedido */}
      <VendedorSelect value={vendedorId} onChange={setVendedorId} label="Vendedor do pedido" alwaysShow />

      {/* Cliente */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <Label className="text-base font-semibold">Cliente *</Label>
          <ClienteCombobox value={cliente} onChange={setCliente} />
        </CardContent>
      </Card>

      {/* Itens */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <Label className="text-base font-semibold">Produtos *</Label>
          <ProdutoCombobox onPick={addProduto} />

          {itens.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto adicionado</p>
          )}

          {itens.map((item, i) => {
            const subtotalLinha = item.quantidade * item.preco_unitario * (1 - item.desconto_pct / 100);
            const desabovasMedia = item.desconto_pct > 15;
            const gencau = isGencauMarca(item.marca);
            return (
              <div key={item.produto_id} className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.nome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[item.marca, item.unidade].filter(Boolean).join(" · ")}
                      {" · Tabela R$ "}
                      {item.preco_tabela.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeItem(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {gencau && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Tabela (interno)</Label>
                    <Select
                      value={item.tabela_preco ?? ""}
                      onValueChange={(v) => {
                        const key = v as TabelaPrecoKey;
                        const preco = item.precos_gencau?.[key] ?? 0;
                        updateItem(i, { tabela_preco: key, preco_tabela: preco, preco_unitario: preco });
                      }}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
                      <SelectContent>
                        {TABELAS_GENCAU.map(t => (
                          <SelectItem key={t.key} value={t.key}>
                            {t.label} {item.precos_gencau?.[t.key] != null ? `· R$ ${item.precos_gencau[t.key]!.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Qtd</Label>
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={item.quantidade}
                      onChange={e => updateItem(i, { quantidade: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Preço unit (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      inputMode="decimal"
                      value={item.preco_unitario}
                      onChange={e => updateItem(i, { preco_unitario: Math.max(0, Number(e.target.value) || 0) })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Desc %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      inputMode="decimal"
                      value={item.desconto_pct || ""}
                      onChange={e => updateItem(i, { desconto_pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                      className={`h-9 ${desabovasMedia ? "border-secondary text-secondary font-semibold" : ""}`}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-xs text-muted-foreground">Subtotal linha</span>
                  <span className="font-semibold text-foreground">
                    R$ {subtotalLinha.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {formaPagamento === "Boleto" && (
        <>
          <ParcelasBoletoCard
            total={valorTotal}
            value={parcelas}
            onChange={setParcelas}
          />
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="parcelas-visivel"
                  checked={parcelasVisivelPdf}
                  onCheckedChange={(c) => setParcelasVisivelPdf(c === true)}
                />
                <Label htmlFor="parcelas-visivel" className="text-sm font-medium cursor-pointer">
                  Mostrar parcelas no PDF do pedido
                </Label>
              </div>
              {parcelasVisivelPdf && (
                <div className="space-y-2 pl-6">
                  <Label className="text-xs text-muted-foreground">Como mostrar as parcelas</Label>
                  <RadioGroup
                    value={parcelasModoPdf}
                    onValueChange={(v) => setParcelasModoPdf(v as "datas" | "dias")}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="datas" id="parc-datas" />
                      <Label htmlFor="parc-datas" className="text-sm cursor-pointer font-normal">
                        Datas exatas de vencimento
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="dias" id="parc-dias" />
                      <Label htmlFor="parc-dias" className="text-sm cursor-pointer font-normal">
                        Apenas dias (ex: 28/35/42), sem mostrar a data
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Condições */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <Label className="text-base font-semibold">Condições</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transporte</Label>
              <Select value={transporte} onValueChange={setTransporte}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{TRANSPORTES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prazo de Pagamento</Label>
            <Input value={prazoPagamento} onChange={e => setPrazoPagamento(e.target.value)} placeholder="Ex: 30/60/90 dias" className="min-h-[44px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Truck className="h-3.5 w-3.5 text-amber-600" />
              Previsão de entrega (opcional)
            </Label>
            <Input
              type="date"
              value={previsaoEntrega}
              onChange={e => setPrevisaoEntrega(e.target.value)}
              className="min-h-[44px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Ao confirmar o pedido, uma tarefa de feedback será criada na sua agenda para esta data.
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ordem de Compra (OC do cliente)</Label>
            <Input
              value={ordemCompra}
              onChange={e => setOrdemCompra(e.target.value)}
              placeholder="Ex: OC-12345"
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Desconto geral + frete */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <Label className="text-base font-semibold">Ajustes finais</Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Desc geral (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.5"
                inputMode="decimal"
                value={descGeralPct || ""}
                disabled={descGeralValor > 0}
                onChange={e => {
                  const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                  setDescGeralPct(v);
                  if (v > 0) setDescGeralValor(0);
                }}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desc geral (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={descGeralValor || ""}
                disabled={descGeralPct > 0}
                onChange={e => {
                  const v = Math.max(0, Number(e.target.value) || 0);
                  setDescGeralValor(v);
                  if (v > 0) setDescGeralPct(0);
                }}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Frete (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={freteValor || ""}
                onChange={e => setFreteValor(Math.max(0, Number(e.target.value) || 0))}
                className="min-h-[44px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="p-4 space-y-2 text-sm">
          <Label className="text-base font-semibold">Resumo</Label>
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {subtotalItens.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">(-) Desconto itens</span><span className="text-destructive">- R$ {totalDescontoItens.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">(-) Desconto geral</span><span className="text-destructive">- R$ {descGeralCalc.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">(+) Frete</span><span>+ R$ {freteValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between font-bold text-foreground border-t border-border pt-2 text-base">
            <span>Total Final</span><span className="text-secondary">R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          {descontoMedioPct > 0 && (
            <div className={`flex justify-between text-xs pt-1 ${descontoMedioPct > 15 ? "text-secondary font-semibold" : "text-muted-foreground"}`}>
              <span>Desconto médio</span>
              <span>{descontoMedioPct.toFixed(1)}%{descontoMedioPct > 15 ? " ⚠️" : ""}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 min-h-[48px]" onClick={() => handleSave("Rascunho")} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> Salvar Rascunho
        </Button>
        <Button className="flex-1 min-h-[48px]" onClick={() => handleSave("Confirmado")} disabled={saving}>
          <CheckCircle className="h-4 w-4 mr-2" /> Confirmar Pedido
        </Button>
      </div>
    </div>
  );
}
