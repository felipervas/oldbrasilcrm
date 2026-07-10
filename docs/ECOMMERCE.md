# Motor de E-commerce (estilo NuvemShop)

Backend completo de loja virtual construído sobre o Supabase do projeto:
carrinho persistente, cupons, cálculo de frete (Correios / Melhor Envio /
tabela própria), checkout com revalidação de preços no servidor, pagamentos
via Mercado Pago (PIX, cartão e boleto) e consulta de pedido/rastreio.

## Arquitetura

```
React (Vite)  ──►  Edge Functions (Deno)  ──►  Postgres (Supabase)
   │                    │
   │                    ├─ ecom-carrinho     carrinho por session_token
   │                    ├─ ecom-frete        cotação Correios/ME/tabela
   │                    ├─ ecom-checkout     pedido + Mercado Pago
   │                    ├─ ecom-webhook-mercadopago  confirma pagamento
   │                    └─ ecom-rastreio     consulta pública de pedido
   │
   └─ src/lib/ecommerce/api.ts + src/hooks/useEcomCarrinho.tsx
```

Importante: **nenhum valor vindo do navegador é usado para cobrança**. O
checkout recalcula preço de cada item, desconto de cupom e frete no servidor.

## Tabelas criadas (`supabase/migrations/20260710120000_ecommerce_core.sql`)

| Tabela | Papel |
|---|---|
| `ecom_config` | configuração da loja (CEP de origem, frete grátis acima de X, prazo de postagem, liga/desliga checkout) |
| `ecom_clientes` / `ecom_enderecos` | clientes da loja (suporta guest checkout por e-mail) |
| `ecom_carrinhos` / `ecom_carrinho_itens` | carrinho persistente por `session_token` (visitante anônimo) |
| `ecom_cupons` | cupons: percentual, valor fixo ou frete grátis, com validade/limites |
| `ecom_frete_regras` | tabela de frete de contingência por faixa de CEP |
| `ecom_pedidos` / `ecom_pedido_itens` / `ecom_pedido_eventos` | pedidos com numeração própria (#1001+), snapshot de preços e histórico |
| `ecom_pagamentos` | transações do Mercado Pago |

Campos novos em `produtos`: `preco_promocional`, `controlar_estoque`,
`altura_cm`, `largura_cm`, `comprimento_cm`. O estoque usa o `saldo_estoque`
que já existia; a baixa acontece quando o pagamento é aprovado.

## Segredos a configurar (Supabase → Edge Functions → Secrets)

| Secret | Obrigatório? | Para quê |
|---|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | Sim, para cobrar de verdade | Checkout Pro (PIX/cartão/boleto). Crie em mercadopago.com.br/developers |
| `ECOM_STORE_URL` | Recomendado | URL pública da loja (ex.: `https://projetovidaserena.com.br`) para retorno pós-pagamento |
| `MELHORENVIO_TOKEN` | Opcional | Cotação real de frete (Correios + transportadoras) sem contrato próprio |
| `CORREIOS_USUARIO`, `CORREIOS_CODIGO_ACESSO`, `CORREIOS_CARTAO_POSTAGEM` | Opcional | Contrato próprio dos Correios (API CWS) |

Cascata do frete: Melhor Envio → API Correios → tabela `ecom_frete_regras`.
Sem nenhuma credencial a loja segue funcionando com a tabela local
(valores iniciais de exemplo — ajuste!).

## Fluxo de compra

1. `ecom-carrinho {action:'add'}` — cria o carrinho e devolve `session_token`
   (o front guarda em `localStorage`, já implementado em `src/lib/ecommerce/api.ts`).
2. `ecom-frete {cep_destino}` — devolve opções `[{servico, nome, valor, prazo_dias}]`.
3. `ecom-checkout {cliente, endereco, frete_servico}` — valida tudo de novo,
   cria o pedido e devolve `init_point` (URL do Mercado Pago). Redirecione o
   cliente para lá.
4. Mercado Pago chama `ecom-webhook-mercadopago` → pedido vira `pago`,
   estoque é baixado, evento registrado. Estorno/cancelamento devolve estoque.
5. Cliente acompanha com `ecom-rastreio {numero, email}`.

Status do pedido: `aguardando_pagamento → pago → em_separacao → enviado →
entregue` (+ `cancelado` / `reembolsado`). A equipe atualiza status e
`codigo_rastreio` pelo painel (RLS já permite para admin/gestor).

## Uso no front

```tsx
import { useEcomCarrinho } from "@/hooks/useEcomCarrinho";
import { ecomApi } from "@/lib/ecommerce/api";

const { carrinho, adicionar, quantidadeItens } = useEcomCarrinho();
adicionar.mutate({ produtoId, quantidade: 2 });

const { opcoes } = await ecomApi.calcularFrete("01310-100");
const resultado = await ecomApi.checkout({ cliente, endereco, frete_servico: opcoes[0].servico });
if (resultado.init_point) window.location.href = resultado.init_point;
```

## O que falta (frontend)

- Páginas: carrinho, checkout (dados + frete + resumo), confirmação
  (`/pedido/:numero`, que é a URL de retorno do Mercado Pago) e "meus pedidos".
- Tela administrativa de pedidos da loja (listar `ecom_pedidos`, mudar status,
  lançar código de rastreio) e de cupons — o backend e as permissões já suportam.
- E-mails transacionais (pedido criado/pago/enviado) — sugerido: Resend numa
  edge function disparada por eventos.
