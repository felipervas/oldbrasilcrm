import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tent, UserPlus, MessageCircle, Trash2, Download, Search } from "lucide-react";
import { toast } from "sonner";

interface LeadAgagel {
  id: string;
  nome: string;
  whatsapp: string;
  cidade: string;
  obs: string;
  salvoPor: string; // quem cadastrou
  criado: string; // ISO
}

function soDigitos(s: string) {
  return s.replace(/\D/g, "");
}
function waLink(whatsapp: string) {
  const d = soDigitos(whatsapp);
  if (d.length < 8) return null;
  const num = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${num}`;
}
function fmtQuando(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function Agagel() {
  const { user } = useAuth();
  const chave = `agagel_leads_${user?.id ?? "anon"}`;

  const [leads, setLeads] = useState<LeadAgagel[]>([]);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cidade, setCidade] = useState("");
  const [obs, setObs] = useState("");
  const [busca, setBusca] = useState("");
  const [meuNome, setMeuNome] = useState("");
  const nomeRef = useRef<HTMLInputElement>(null);

  // carrega o que já foi capturado neste aparelho
  useEffect(() => {
    try {
      const raw = localStorage.getItem(chave);
      setLeads(raw ? (JSON.parse(raw) as LeadAgagel[]) : []);
    } catch {
      setLeads([]);
    }
  }, [chave]);

  // Nome de quem está logado — pra registrar quem salvou cada lead
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nome").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.nome) setMeuNome(data.nome); });
  }, [user?.id]);

  const persistir = (novos: LeadAgagel[]) => {
    setLeads(novos);
    try { localStorage.setItem(chave, JSON.stringify(novos)); } catch { /* ignora */ }
  };

  const salvar = () => {
    if (!nome.trim()) { toast.error("Coloque o nome."); nomeRef.current?.focus(); return; }
    if (soDigitos(whatsapp).length < 8) { toast.error("Coloque um WhatsApp válido."); return; }
    const lead: LeadAgagel = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nome: nome.trim(),
      whatsapp: whatsapp.trim(),
      cidade: cidade.trim(),
      obs: obs.trim(),
      salvoPor: meuNome || "—",
      criado: new Date().toISOString(),
    };
    persistir([lead, ...leads]);
    setNome(""); setWhatsapp(""); setCidade(""); setObs("");
    toast.success("Lead salvo!");
    nomeRef.current?.focus();
  };

  const remover = (id: string) => persistir(leads.filter((l) => l.id !== id));

  const exportarCSV = () => {
    if (leads.length === 0) return toast.error("Nenhum lead pra exportar.");
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Nome", "WhatsApp", "Cidade", "Observacoes", "Salvo por", "Quando"].map(esc).join(";");
    const linhas = leads.map((l) => [l.nome, l.whatsapp, l.cidade, l.obs, l.salvoPor, fmtQuando(l.criado)].map(esc).join(";"));
    const csv = "﻿" + [header, ...linhas].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-agagel-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado.");
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) => l.nome.toLowerCase().includes(q) || soDigitos(l.whatsapp).includes(soDigitos(q)) || (l.cidade || "").toLowerCase().includes(q) || l.obs.toLowerCase().includes(q));
  }, [leads, busca]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-neu-sm">
          <Tent className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AGAGEL — Captura de leads</h1>
          <p className="text-sm text-muted-foreground">Cadastro rápido na feira. Salva no aparelho (funciona sem internet).</p>
        </div>
      </div>

      {/* Formulário rápido */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ag-nome">Nome</Label>
            <Input id="ag-nome" ref={nomeRef} value={nome} onChange={(e) => setNome(e.target.value)}
              placeholder="Nome da pessoa ou da loja" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ag-wpp">WhatsApp</Label>
            <Input id="ag-wpp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(47) 99999-9999" inputMode="tel" autoComplete="off"
              onKeyDown={(e) => { if (e.key === "Enter") salvar(); }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ag-cidade">Cidade</Label>
            <Input id="ag-cidade" value={cidade} onChange={(e) => setCidade(e.target.value)}
              placeholder="Cidade do cliente" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ag-obs">Observações (opcional)</Label>
            <Textarea id="ag-obs" value={obs} onChange={(e) => setObs(e.target.value)}
              placeholder="Ex.: gelateria em BC, quer testar pistache, ligar semana que vem" rows={2} />
          </div>
          <Button onClick={salvar} className="w-full h-11 text-base">
            <UserPlus className="h-5 w-5 mr-2" /> Salvar lead
          </Button>
        </CardContent>
      </Card>

      {/* Lista de capturados */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">Capturados ({leads.length})</h2>
        <Button variant="outline" size="sm" onClick={exportarCSV}>
          <Download className="h-4 w-4 mr-1.5" /> Exportar CSV
        </Button>
      </div>

      {leads.length > 0 && (
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, WhatsApp ou observação" className="pl-9" />
        </div>
      )}

      {filtrados.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          {leads.length === 0 ? "Nenhum lead ainda. Cadastre o primeiro aí em cima. 👆" : "Nada encontrado na busca."}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map((l) => {
            const wa = waLink(l.whatsapp);
            return (
              <Card key={l.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{l.nome}</p>
                      <p className="text-xs text-muted-foreground">{l.whatsapp}{l.cidade ? ` · ${l.cidade}` : ""} · {fmtQuando(l.criado)}</p>
                      {l.obs && <p className="text-sm text-foreground mt-1">{l.obs}</p>}
                      {l.salvoPor && l.salvoPor !== "—" && <p className="text-[11px] text-muted-foreground mt-1">Salvo por {l.salvoPor}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {wa && (
                        <Button variant="outline" size="icon" aria-label="Abrir WhatsApp" onClick={() => window.open(wa, "_blank")}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="icon" aria-label="Remover" onClick={() => remover(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
