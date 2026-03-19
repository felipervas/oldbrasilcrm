

## Renomear App para "Cellos" + Acesso sem Senha + Dados Fictícios

### O que será feito

**1. Renomear "ACME" para "Cellos" em todo o projeto (~15 arquivos)**

Todos os textos "ACME Distribuidora", "ACME CRM", "ACME" serão trocados por "Cellos Distribuidora", "Cellos CRM", "Cellos". Arquivos afetados:

- `index.html` — titulo, meta tags, OG tags
- `src/pages/Login.tsx` — nome do sistema, area restrita
- `src/pages/LandingPage.tsx` — Helmet, schema.org
- `src/pages/loja/LojaHome.tsx` — hero section
- `src/components/layout/AppSidebar.tsx` — sidebar header
- `src/components/landing/LandingHeader.tsx` — alt logo
- `src/components/landing/LandingFooter.tsx` — copyright, email
- `src/components/landing/TestimonialsCarousel.tsx` — depoimentos
- `src/components/loja/LojaHeader.tsx` — alt logo
- `src/components/loja/LojaFooter.tsx` — copyright
- `src/components/loja/ModalAtendimentoExclusivo.tsx` — localStorage key
- `src/components/ImprimirPedido.tsx` — alt logo, dados empresa
- `src/lib/whatsapp.ts` — mensagens
- `supabase/functions/notificar-tarefas/index.ts` — email sender

Email fictício: `contato@cellosdistribuidora.com.br`

**2. Acesso sem senha (auto-confirm + login simplificado)**

- Ativar auto-confirm de email via `configure_auth`
- Modificar `src/pages/Login.tsx` para ter um botão "Entrar como Visitante" que faz signup/login automático com um email genérico (ex: `visitante@cellos.demo` / senha fixa `demo123456`)
- Isso permite entrar sem digitar nada

**3. Limpar dados reais do banco**

Executar operações de UPDATE no banco para substituir dados reais por fictícios:
- **Clientes**: trocar `nome_fantasia`, `razao_social`, `cnpj_cpf`, `telefone`, `email`, `endereco` por dados fictícios
- **Prospects**: trocar `nome_empresa`, `telefone`, `email`, `site`, `endereco`
- **Profiles**: trocar `nome`, `telefone`, `emails`
- **Pedidos**: trocar `observacoes`, `numero_pedido`

Isso será feito com queries SQL via insert tool, gerando nomes aleatórios tipo "Empresa Alpha 1", "Empresa Beta 2", etc.

---

### Seção Técnica

**Arquivos editados**: ~15 arquivos (substituição de string "ACME" → "Cellos")

**Operações no banco**: UPDATE em `clientes`, `prospects`, `profiles`, `pedidos` para anonimizar dados reais

**Auth**: Configurar auto-confirm + criar fluxo de login demo sem senha

**Nenhuma migration necessária** — apenas edição de código e dados existentes

