
## Plano de Varredura e Otimizacao Geral

### Problema Principal: "Leads nao atualizam"

A investigacao revelou que os dados existem no banco (45 prospects, 1 lead da loja). O problema esta em:
- A view `prospects_with_last_interaction` funciona corretamente
- O hook `useProspectsOptimized` tem `staleTime: 3 minutos` mas `refetchOnMount` esta desabilitado globalmente no `queryClient.ts` (`refetchOnMount: false`), fazendo com que ao navegar entre abas os dados nunca sejam recarregados
- O `queryClient.ts` global tem configuracoes muito agressivas que impedem atualizacao: `refetchOnWindowFocus: false` + `refetchOnMount: false`

### Fase 1: Corrigir Atualizacao de Dados (Critico)

**Arquivo: `src/lib/queryClient.ts`**
- Mudar `refetchOnMount: false` para `refetchOnMount: true` - isso garante que ao navegar para uma pagina, dados obsoletos sejam revalidados
- Manter `staleTime` para evitar requests duplicados em sequencia rapida
- Isso resolve o problema de "leads nao atualizam" globalmente

**Arquivo: `src/hooks/useProspectsOptimized.tsx`**
- Adicionar `refetchOnMount: 'always'` para forcar revalidacao ao abrir o pipeline
- Remover `limit(200)` que pode estar escondendo prospects - usar paginacao no frontend

### Fase 2: Responsividade do LancarPedido

**Arquivo: `src/pages/LancarPedido.tsx`**
- Linha 665: `grid-cols-2` -> `grid-cols-1 sm:grid-cols-2` (Cliente + Responsavel)
- Linha 720: `grid-cols-2` -> `grid-cols-1 sm:grid-cols-2` (Dados do cliente)
- Linha 787: `grid-cols-2` -> `grid-cols-1 sm:grid-cols-2` (Numero + Data)
- Linha 807: `grid-cols-2` -> `grid-cols-1 sm:grid-cols-2` (Frete)
- Linha 830: `grid-cols-4` -> `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (Pagamento)
- Linha 873: `grid-cols-2` -> `grid-cols-1 sm:grid-cols-2` (Entrega)

### Fase 3: Migrar Dados Manuais para React Query no LancarPedido

**Arquivo: `src/pages/LancarPedido.tsx`**
- Atualmente `loadClientes()`, `loadProdutos()`, `loadColaboradores()` usam `useState` + `useEffect` manual
- Migrar para `useQuery` com cache, eliminando chamadas duplicadas ao navegar entre paginas
- Isso melhora performance e evita "tela branca" ao voltar para a pagina

### Fase 4: Melhorias de UX no Pipeline (Prospects)

**Arquivo: `src/pages/Prospects.tsx`**
- Linha 97-113: `useEffect` que carrega colaboradores e usuario manual -> usar `useAuth()` para user ID e `useQuery` para colaboradores
- Adicionar indicador de "carregando" quando a query esta em background refetch
- Mostrar contagem total de leads no header

### Fase 5: Sidebar - Leads da Loja no Menu

**Arquivo: `src/components/layout/AppSidebar.tsx`**
- O item "Leads da Loja" nao aparece no menu lateral (a rota `/leads-loja` existe mas nao esta no menu)
- Adicionar ao `defaultMenuItems` com icone `MessageCircle` ou `ShoppingBag`

### Fase 6: Pedidos - Carregar Mais que 20

**Arquivo: `src/pages/Pedidos.tsx`**
- Atualmente limitado a 20 pedidos (`.limit(20)`)
- Adicionar paginacao ou botao "Carregar mais"
- Adicionar filtro por status (pendente, entregue, cancelado)

### Resumo de Arquivos

| Arquivo | Mudanca |
|---------|---------|
| `src/lib/queryClient.ts` | Corrigir `refetchOnMount` para `true` |
| `src/hooks/useProspectsOptimized.tsx` | Adicionar `refetchOnMount: 'always'` |
| `src/pages/LancarPedido.tsx` | 6 grids responsivos + migrar para React Query |
| `src/pages/Prospects.tsx` | Usar useAuth, indicador loading |
| `src/components/layout/AppSidebar.tsx` | Adicionar "Leads da Loja" ao menu |
| `src/pages/Pedidos.tsx` | Paginacao + filtro status |

### Secao Tecnica

- **Causa raiz "nao atualiza"**: `refetchOnMount: false` no queryClient global impede recarregamento ao navegar entre paginas. Os dados ficam em cache e nunca sao revalidados ate o staleTime expirar (5-10 min)
- **Solucao**: `refetchOnMount: true` (padrao do React Query) revalida dados stale ao montar o componente, mantendo cache para transicoes rapidas
- **Responsive grids**: Todos os `grid-cols-N` sem prefixo `sm:` causam layout quebrado no mobile
- **React Query migration**: Substitui `useState`+`useEffect` manual por queries com cache automatico, loading states, e error handling
