import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Printer, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Item = Tables<"itens_pedido"> & { produtos: { nome: string; codigo_sku: string | null; unidade: string } | null };
type Parcela = Tables<"pedido_parcelas">;

const fmtBRL = (v: number) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR");

export default function PedidoImprimir() {
  const { id } = useParams();
  const [pedido, setPedido] = useState<Tables<"pedidos"> | null>(null);
  const [cliente, setCliente] = useState<Tables<"clientes"> | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const { data: p } = await supabase.from("pedidos").select("*").eq("id", id).maybeSingle();
      if (!active) return;
      if (!p) { setLoading(false); return; }
      setPedido(p);

      const [{ data: c }, { data: it }, { data: pa }, { data: prof }] = await Promise.all([
        supabase.from("clientes").select("*").eq("id", p.cliente_id).maybeSingle(),
        supabase.from("itens_pedido").select("*, produtos(nome, codigo_sku, unidade)").eq("pedido_id", id),
        supabase.from("pedido_parcelas").select("*").eq("pedido_id", id).order("numero_parcela"),
        supabase.from("profiles").select("*").eq("user_id", p.representante_id).maybeSingle(),
      ]);
      if (!active) return;
      setCliente(c);
      setItens((it as Item[]) ?? []);
      setParcelas((pa as Parcela[]) ?? []);
      setProfile(prof);
      setLoading(false);

      // Auto print após render
      setTimeout(() => { if (active) window.print(); }, 600);
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Carregando…</div>;
  }
  if (!pedido || !cliente) {
    return <div className="p-8">Pedido não encontrado.</div>;
  }

  const qtdTotal = itens.reduce((a, i) => a + (Number(i.quantidade) || 0), 0);
  const numero = pedido.numero || pedido.id.slice(0, 8).toUpperCase();

  const getProd = (it: Item) =>
    Array.isArray(it.produtos) ? it.produtos[0] : it.produtos;
  const getNome = (it: Item) =>
    (it as any).produto_nome || getProd(it)?.nome || "—";
  const getRef = (it: Item) =>
    (it as any).referencia || getProd(it)?.codigo_sku || "—";
  const getUnidade = (it: Item) =>
    (it as any).unidade_medida || getProd(it)?.unidade || "un";

  return (
    <div className="bg-white min-h-screen text-black print:bg-white">
      {/* Toolbar — visível só na tela */}
      <div className="print:hidden sticky top-0 z-50 flex items-center justify-between gap-2 px-6 py-3 bg-slate-100 border-b border-slate-300 shadow-sm">
        <div className="text-sm font-semibold text-slate-700">
          Pré-visualização de impressão — Pedido #{numero}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-700 text-white text-sm font-medium hover:bg-blue-800"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button
            onClick={() => window.close()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white text-slate-700 text-sm font-medium border border-slate-300 hover:bg-slate-50"
          >
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      </div>

      {/* DOCUMENTO */}
      <div className="mx-auto max-w-[210mm] p-8 print:p-6 text-[11px] leading-snug">
        {/* HEADER */}
        <div className="border border-slate-300 rounded-md p-4 flex items-start gap-4">
          <div className="shrink-0">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="h-20 w-20 object-contain" />
            ) : (
              <div className="h-20 w-20 rounded bg-gradient-to-br from-yellow-200 to-pink-200 flex items-center justify-center text-xs font-bold text-slate-700">
                LOGO
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base">
              {profile?.empresa || profile?.nome || "Empresa"}
            </p>
            {profile?.endereco_empresa && (
              <p className="text-slate-700">{profile.endereco_empresa}</p>
            )}
            {profile?.telefone_empresa && (
              <p className="text-slate-700">Fones: {profile.telefone_empresa}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            {profile?.cnpj_empresa && (
              <p className="text-slate-700">
                <span className="font-semibold">CPF/CNPJ:</span> {profile.cnpj_empresa}
              </p>
            )}
            {profile?.site_empresa && (
              <p className="text-slate-700">{profile.site_empresa}</p>
            )}
            {profile?.email && <p className="text-slate-700">{profile.email}</p>}
          </div>
        </div>

        {/* TÍTULO */}
        <div className="text-center py-3">
          <p className="font-bold text-2xl">Pedido: {numero} -</p>
          <p className="text-slate-700">Criação: {fmtDateTime(pedido.created_at)}</p>
        </div>

        {/* DADOS CADASTRAIS */}
        <div className="border border-slate-300 rounded-md">
          <div className="text-center font-bold py-1.5 border-b border-slate-300 bg-slate-50">
            Dados cadastrais:
          </div>
          <table className="w-full text-[11px] table-fixed">
            <tbody>
              <Row a="Nome" av={cliente.nome_contato || cliente.nome_loja} b="Fantasia" bv={cliente.nome_loja} />
              <Row a="CPF/CNPJ" av={cliente.cnpj || "—"} b="RG/IE" bv={cliente.ie || (cliente as any).inscricao_estadual || "—"} />
              <Row a="Endereco" av={cliente.endereco || "—"} b="Bairro" bv={cliente.bairro || "—"} />
              <Row a="Cidade" av={`${cliente.cidade || "—"}${cliente.estado ? ` - ${cliente.estado}` : ""}`} b="CEP" bv={cliente.cep || "—"} />
              <Row a="Telefone" av={cliente.telefone || "—"} b="Celular" bv={cliente.celular || "—"} />
              <Row a="Email" av={cliente.email || "—"} b="Vendedor" bv={profile?.nome || "—"} />
            </tbody>
          </table>
        </div>

        {/* OBSERVAÇÕES */}
        <div className="border border-slate-300 rounded-md mt-3">
          <div className="text-center font-bold py-1.5 border-b border-slate-300 bg-slate-50">
            Observações:
          </div>
          <div className="px-4 py-3 min-h-[60px] whitespace-pre-wrap">
            {pedido.observacoes || "\u00A0"}
          </div>
        </div>

        {/* PRODUTOS */}
        <table className="w-full mt-3 border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-400">
              <th className="text-left py-2 px-2 font-bold">Ref.</th>
              <th className="text-left py-2 px-2 font-bold">Descrição</th>
              <th className="text-right py-2 px-2 font-bold">Quant.</th>
              <th className="text-right py-2 px-2 font-bold">Valor unit.</th>
              <th className="text-right py-2 px-2 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((it, i) => (
              <tr key={it.id} className={i % 2 === 0 ? "bg-slate-50" : ""}>
                <td className="py-1.5 px-2">{getRef(it)}</td>
                <td className="py-1.5 px-2">
                  {getNome(it)}
                  {(it as any).produto_marca && (
                    <span className="text-slate-500"> · {(it as any).produto_marca}</span>
                  )}
                </td>
                <td className="text-right py-1.5 px-2">
                  {(Number(it.quantidade) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 3 })} {getUnidade(it)}
                </td>
                <td className="text-right py-1.5 px-2">
                  {(Number(it.preco_unitario) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </td>
                <td className="text-right py-1.5 px-2">
                  {(Number(it.subtotal) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTAIS */}
        <div className="border border-slate-300 rounded-md mt-3 grid grid-cols-2">
          <div className="p-3 space-y-1 border-r border-slate-300">
            <p><span className="font-bold">Quantidade total:</span> {qtdTotal.toFixed(2)}</p>
            <p><span className="font-bold">Forma de pagamento:</span> {pedido.forma_pagamento || "—"}</p>
            <p><span className="font-bold">Prazo de pagamento:</span> {pedido.prazo_pagamento || "—"}</p>
            <p><span className="font-bold">Transporte:</span> {pedido.transporte || "—"}</p>
            {(pedido as any).ordem_compra && (
              <p><span className="font-bold">Ordem de Compra:</span> {(pedido as any).ordem_compra}</p>
            )}
            <p><span className="font-bold">Pago:</span> {fmtBRL(0)}</p>
          </div>
          <div className="p-3 space-y-1 text-right">
            <p><span className="font-bold">Sub total:</span> {fmtBRL(Number(pedido.subtotal) || 0)}</p>
            <p><span className="font-bold">Desconto/sub total(-):</span> {fmtBRL(Number(pedido.desconto) || 0)}</p>
            <p><span className="font-bold">Frete(+):</span> {fmtBRL(Number(pedido.frete) || 0)}</p>
            <p className="text-base pt-1 border-t border-slate-300 mt-1">
              <span className="font-bold">Total geral:</span>{" "}
              <span className="font-bold">{fmtBRL(Number(pedido.valor_total) || 0)}</span>
            </p>
          </div>
        </div>

        {/* PARCELAS BOLETO */}
        {parcelas.length > 0 && (
          <div className="border border-slate-300 rounded-md mt-3">
            <div className="text-center font-bold py-1.5 border-b border-slate-300 bg-slate-50">
              Parcelas (Boleto)
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="text-left py-1.5 px-3 font-bold">Parcela</th>
                  <th className="text-left py-1.5 px-3 font-bold">Vencimento</th>
                  <th className="text-right py-1.5 px-3 font-bold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {parcelas.map((p) => (
                  <tr key={p.id} className="border-b border-slate-200 last:border-0">
                    <td className="py-1.5 px-3">{p.numero_parcela}/{p.total_parcelas}</td>
                    <td className="py-1.5 px-3">{fmtDate(p.vencimento)}</td>
                    <td className="text-right py-1.5 px-3">{fmtBRL(Number(p.valor) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-center text-[10px] text-slate-500">
          Documento gerado em {new Date().toLocaleString("pt-BR")}
        </div>
      </div>
    </div>
  );
}

function Row({ a, av, b, bv }: { a: string; av: string; b: string; bv: string }) {
  return (
    <tr className="border-b border-slate-200 last:border-0 align-top">
      <td className="py-1.5 px-3 font-bold w-[110px] whitespace-nowrap">{a}:</td>
      <td className="py-1.5 px-3 break-words" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{av}</td>
      <td className="py-1.5 px-3 font-bold w-[100px] whitespace-nowrap">{b}:</td>
      <td className="py-1.5 px-3 break-words" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{bv}</td>
    </tr>
  );
}
