import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Square, Loader2, ArrowLeft, Trash2, Plus, Search, RotateCcw, X, Check } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const FORMAS_PAGAMENTO = ["À vista", "30 dias", "60 dias", "90 dias", "30-60-90 dias"];
const TRANSPORTES = ["CIF", "FOB"];

interface ParsedItem {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  matched: boolean;
}

interface UnmatchedItem {
  raw: string;
  quantidade: number;
  unidade: string;
}

type Phase = "recording" | "transcribing" | "confirming";

export default function PedidoVoz() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("recording");
  const [clientes, setClientes] = useState<Tables<"clientes">[]>([]);
  const [produtos, setProdutos] = useState<Tables<"produtos">[]>([]);
  const [loading, setLoading] = useState(true);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transcription
  const [transcription, setTranscription] = useState("");

  // Parsed order
  const [clienteId, setClienteId] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [itens, setItens] = useState<ParsedItem[]>([]);
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedItem[]>([]);
  const [produtoSearch, setProdutoSearch] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [prazoPagamento, setPrazoPagamento] = useState("");
  const [transporte, setTransporte] = useState("");
  const [descontoTipo, setDescontoTipo] = useState<"R$" | "%">("R$");
  const [descontoValor, setDescontoValor] = useState(0);
  const [frete, setFrete] = useState(0);
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("clientes").select("*").order("nome_loja"),
      supabase.from("produtos").select("*").eq("ativo", true).order("nome"),
    ]).then(([c, p]) => {
      setClientes(c.data ?? []);
      setProdutos(p.data ?? []);
      setLoading(false);
    });
  }, [user?.id]);

  // Detect best mime type
  const getMimeType = () => {
    if (typeof MediaRecorder === "undefined") return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    if (MediaRecorder.isTypeSupported("audio/mpeg")) return "audio/mpeg";
    return "audio/webm";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        handleTranscribe(blob, ext);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    const duration = recordingTime;
    if (mediaRecorderRef.current?.state === "recording") {
      if (duration < 1) {
        // Too short — discard
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = () => {
          mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
        };
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        toast.warning("Gravação muito curta. Segure o botão por pelo menos 1 segundo.");
        return;
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleTranscribe = async (blob: Blob, ext: string) => {
    setPhase("transcribing");
    const formData = new FormData();
    formData.append("audio", blob, `audio.${ext}`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Usuário não autenticado");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${res.status}`);
      }

      const data = await res.json();
      const text = data?.text;
      if (!text) throw new Error("Nenhum texto transcrito");

      setTranscription(text);
      parseTranscription(text);
      setPhase("confirming");
    } catch (e: any) {
      toast.error("Erro na transcrição: " + (e.message || "Tente novamente"));
      setPhase("recording");
    }
  };

  const parseTranscription = (text: string) => {
    // Match client
    const lower = text.toLowerCase();
    const matchedCliente = clientes.find(c =>
      lower.includes(c.nome_loja.toLowerCase()) ||
      (c.nome_contato && lower.includes(c.nome_contato.toLowerCase()))
    );
    if (matchedCliente) setClienteId(matchedCliente.id);

    // Extract quantities with regex
    const qtyRegex = /(\d+[\.,]?\d*)\s*(kg|quilos?|caixas?|cx|unidades?|un|litros?|lt)/gi;
    const matches: { quantidade: number; unidade: string; context: string }[] = [];
    let match;
    while ((match = qtyRegex.exec(text)) !== null) {
      const qty = parseFloat(match[1].replace(",", "."));
      const unit = normalizeUnit(match[2]);
      // Get surrounding context for product matching
      const start = Math.max(0, match.index - 40);
      const end = Math.min(text.length, match.index + match[0].length + 40);
      const context = text.slice(start, end).toLowerCase();
      matches.push({ quantidade: qty, unidade: unit, context });
    }

    const matched: ParsedItem[] = [];
    const unmatched: UnmatchedItem[] = [];

    for (const m of matches) {
      const produto = produtos.find(p =>
        m.context.includes(p.nome.toLowerCase()) ||
        (p.codigo_sku && m.context.includes(p.codigo_sku.toLowerCase()))
      );
      if (produto) {
        if (!matched.find(i => i.produto_id === produto.id)) {
          matched.push({
            produto_id: produto.id,
            nome: produto.nome,
            quantidade: m.quantidade,
            preco_unitario: Number(produto.preco) || 0,
            matched: true,
          });
        }
      } else {
        unmatched.push({ raw: m.context.trim(), quantidade: m.quantidade, unidade: m.unidade });
      }
    }

    setItens(matched);
    setUnmatchedItems(unmatched);
  };

  const normalizeUnit = (u: string): string => {
    const l = u.toLowerCase();
    if (l.startsWith("quilo") || l === "kg") return "kg";
    if (l.startsWith("caixa") || l === "cx") return "cx";
    if (l.startsWith("unidade") || l === "un") return "un";
    if (l.startsWith("litro") || l === "lt") return "lt";
    return "un";
  };

  const addProduto = (p: Tables<"produtos">) => {
    if (itens.find(i => i.produto_id === p.id)) { toast.error("Produto já adicionado."); return; }
    setItens([...itens, { produto_id: p.id, nome: p.nome, quantidade: 1, preco_unitario: Number(p.preco) || 0, matched: true }]);
    setProdutoSearch("");
  };

  const updateQtd = (idx: number, qtd: number) => {
    const updated = [...itens];
    updated[idx].quantidade = Math.max(1, qtd);
    setItens(updated);
  };

  const removeItem = (idx: number) => setItens(itens.filter((_, i) => i !== idx));
  const removeUnmatched = (idx: number) => setUnmatchedItems(unmatchedItems.filter((_, i) => i !== idx));

  const resolveUnmatched = (idx: number, produto: Tables<"produtos">, quantidade: number) => {
    if (!itens.find(i => i.produto_id === produto.id)) {
      setItens([...itens, { produto_id: produto.id, nome: produto.nome, quantidade, preco_unitario: Number(produto.preco) || 0, matched: true }]);
    }
    removeUnmatched(idx);
  };

  const subtotal = itens.reduce((a, i) => a + i.quantidade * i.preco_unitario, 0);
  const descontoCalc = descontoTipo === "%" ? subtotal * (descontoValor / 100) : descontoValor;
  const valorTotal = Math.max(0, subtotal - descontoCalc + frete);

  const filteredClientes = useMemo(() => {
    if (!clienteSearch.trim()) return [];
    const q = clienteSearch.toLowerCase();
    return clientes.filter(c => c.nome_loja.toLowerCase().includes(q) || c.cidade?.toLowerCase().includes(q)).slice(0, 8);
  }, [clientes, clienteSearch]);

  const filteredProdutos = useMemo(() => {
    if (!produtoSearch.trim()) return [];
    const q = produtoSearch.toLowerCase();
    return produtos.filter(p => p.nome.toLowerCase().includes(q) || p.codigo_sku?.toLowerCase().includes(q)).slice(0, 8);
  }, [produtos, produtoSearch]);

  const selectedCliente = clientes.find(c => c.id === clienteId);

  const savingRef = useRef(false); // trava síncrona contra clique/toque duplo
  const handleSave = async () => {
    if (savingRef.current) return;
    if (!clienteId) { toast.error("Selecione um cliente."); return; }
    if (itens.length === 0) { toast.error("Adicione pelo menos um item."); return; }
    savingRef.current = true;
    setSaving(true);

    let pedido: any = null;
    try {
      const { data, error } = await supabase.from("pedidos").insert({
        representante_id: user!.id,
        vendedor_id: user!.id,
        cliente_id: clienteId,
        subtotal,
        desconto: descontoCalc,
        frete,
        valor_total: valorTotal,
        qtd_itens: itens.length,
        transporte: transporte || null,
        forma_pagamento: formaPagamento || null,
        prazo_pagamento: prazoPagamento || null,
        observacoes: observacoes || null,
        status: "Rascunho" as any,
      }).select().single();
      if (error || !data) throw new Error("Não foi possível criar o pedido.");
      pedido = data;

      const { error: itensErr } = await supabase.from("itens_pedido").insert(
        itens.map(i => ({
          pedido_id: pedido.id,
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          subtotal: i.quantidade * i.preco_unitario,
        }))
      );
      if (itensErr) {
        await supabase.from("pedidos").delete().eq("id", pedido.id); // desfaz cabeçalho órfão
        throw new Error("Os itens não foram salvos. O pedido não foi criado — tente de novo.");
      }
    } catch (e: any) {
      savingRef.current = false;
      setSaving(false);
      toast.error(e?.message || "Sem conexão — o pedido não foi salvo. Tente de novo.");
      return;
    }

    toast.success(`Pedido #${pedido.id.slice(0, 8)} criado com sucesso!`);
    navigate(`/pedidos/${pedido.id}`);
  };

  const handleRegravar = () => {
    setPhase("recording");
    setTranscription("");
    setClienteId("");
    setItens([]);
    setUnmatchedItems([]);
    setFormaPagamento("");
    setTransporte("");
    setDescontoValor(0);
    setFrete(0);
    setObservacoes("");
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  // === RECORDING PHASE ===
  if (phase === "recording") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pedidos")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-primary">Pedido por Voz</h1>
            <p className="text-muted-foreground text-sm">Pressione e segure para gravar</p>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-red-500/20 animate-ping" />
            </div>
          )}
          <button
            className="relative z-10 flex items-center justify-center rounded-full shadow-xl transition-all active:scale-95"
            style={{
              width: 72, height: 72,
              backgroundColor: isRecording ? "#EF4444" : "#D4A843",
            }}
            onPointerDown={(e) => { e.preventDefault(); startRecording(); }}
            onPointerUp={stopRecording}
            onPointerLeave={() => { if (isRecording) stopRecording(); }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {isRecording ? <Square className="h-8 w-8 text-white" /> : <Mic className="h-8 w-8 text-white" />}
          </button>
        </div>

        {isRecording && (
          <div className="text-center space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-500 font-semibold text-lg">{formatTime(recordingTime)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Gravando... solte para parar</p>
            {/* Sound wave animation */}
            <div className="flex items-center justify-center gap-1 h-8">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-400 rounded-full"
                  style={{
                    height: `${12 + Math.random() * 20}px`,
                    animation: `pulse 0.5s ease-in-out ${i * 0.05}s infinite alternate`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {!isRecording && (
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Diga o nome do cliente, os produtos e quantidades.<br />
            Ex: "10 kg de chocolate para a Loja Silva"
          </p>
        )}
      </div>
    );
  }

  // === TRANSCRIBING PHASE ===
  if (phase === "transcribing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground">Transcrevendo...</p>
        <p className="text-sm text-muted-foreground">Aguarde enquanto processamos seu áudio</p>
      </div>
    );
  }

  // === CONFIRMING PHASE ===
  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pedidos")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-primary">Confirmar Pedido</h1>
          <p className="text-muted-foreground text-sm">Revise os dados antes de salvar</p>
        </div>
      </div>

      {/* Card 1 — Transcription */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-base font-semibold">O que você disse:</Label>
            <Button variant="outline" size="sm" onClick={handleRegravar}><RotateCcw className="h-4 w-4 mr-1" /> Regravar</Button>
          </div>
          <p className="text-sm italic text-muted-foreground">{transcription}</p>
        </CardContent>
      </Card>

      {/* Card 2 — Parsed */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <Label className="text-base font-semibold">O que entendemos:</Label>

          {/* Cliente */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cliente</Label>
            {selectedCliente ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-700">{selectedCliente.nome_loja}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setClienteId("")}>Trocar</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} className="pl-9" />
                </div>
                {filteredClientes.length > 0 && (
                  <div className="border rounded-md max-h-32 overflow-y-auto">
                    {filteredClientes.map(c => (
                      <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm" onClick={() => { setClienteId(c.id); setClienteSearch(""); }}>
                        {c.nome_loja}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Produtos identificados */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Produtos</Label>
            {itens.length === 0 && <p className="text-xs text-muted-foreground">Nenhum produto identificado</p>}
            {itens.map((item, i) => (
              <div key={item.produto_id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.nome}</p>
                  <p className="text-xs text-muted-foreground">R$ {item.preco_unitario.toFixed(2)} × {item.quantidade} = R$ {(item.preco_unitario * item.quantidade).toFixed(2)}</p>
                </div>
                <Input type="number" min={1} value={item.quantidade} onChange={e => updateQtd(i, Number(e.target.value))} className="w-20 h-8" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}

            {/* Add manual */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="+ Adicionar produto..." value={produtoSearch} onChange={e => setProdutoSearch(e.target.value)} className="pl-9" />
            </div>
            {filteredProdutos.length > 0 && (
              <div className="border rounded-md max-h-32 overflow-y-auto">
                {filteredProdutos.map(p => (
                  <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between" onClick={() => addProduto(p)}>
                    <span>{p.nome}</span>
                    <span className="text-muted-foreground">R$ {(Number(p.preco) || 0).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Unmatched items */}
          {unmatchedItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-amber-700">Itens não identificados</Label>
              {unmatchedItems.map((item, idx) => (
                <UnmatchedItemCard
                  key={idx}
                  item={item}
                  produtos={produtos}
                  onResolve={(p) => resolveUnmatched(idx, p, item.quantidade)}
                  onRemove={() => removeUnmatched(idx)}
                />
              ))}
            </div>
          )}

          {/* Conditions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transporte</Label>
              <Select value={transporte} onValueChange={setTransporte}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{TRANSPORTES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desconto</Label>
              <div className="flex gap-1">
                <Input type="number" min={0} value={descontoValor} onChange={e => setDescontoValor(Number(e.target.value))} className="flex-1" />
                <Button variant="outline" size="sm" className="w-12" onClick={() => setDescontoTipo(descontoTipo === "R$" ? "%" : "R$")}>{descontoTipo}</Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Frete (R$)</Label>
              <Input type="number" min={0} value={frete} onChange={e => setFrete(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prazo de Pagamento</Label>
            <Input value={prazoPagamento} onChange={e => setPrazoPagamento(e.target.value)} placeholder="Ex: 30/60/90 dias" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-2 text-sm">
          <Label className="text-base font-semibold">Resumo</Label>
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Desconto {descontoTipo === "%" ? `(${descontoValor}%)` : ""}</span><span>- R$ {descontoCalc.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>+ R$ {frete.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold border-t border-border pt-2 text-lg" style={{ color: "#16a34a" }}>
            <span>Total</span><span>R$ {valorTotal.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => navigate("/pedidos")} disabled={saving}>
          <X className="h-4 w-4 mr-2" /> Cancelar
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          Confirmar e Salvar
        </Button>
      </div>
    </div>
  );
}

// Sub-component for unmatched items
function UnmatchedItemCard({
  item, produtos, onResolve, onRemove,
}: {
  item: UnmatchedItem;
  produtos: Tables<"produtos">[];
  onResolve: (p: Tables<"produtos">) => void;
  onRemove: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return produtos.filter(p => p.nome.toLowerCase().includes(q) || p.codigo_sku?.toLowerCase().includes(q)).slice(0, 5);
  }, [produtos, search]);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-amber-800">"{item.raw}" — {item.quantidade} {item.unidade}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}><X className="h-4 w-4" /></Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input placeholder="Buscar produto correto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
      </div>
      {filtered.length > 0 && (
        <div className="border rounded max-h-24 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} className="w-full text-left px-2 py-1 hover:bg-muted text-xs" onClick={() => onResolve(p)}>
              {p.nome} — R$ {(Number(p.preco) || 0).toFixed(2)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
