

## Plano de Otimizacao Geral do Site

### Fase 1: Performance e Carregamento

**1.1 Otimizar `index.html`**
- Remover o script inline de limpeza de service workers (duplicado - ja existe no `main.tsx`)
- Isso elimina um blocking script que atrasa o carregamento inicial

**1.2 Otimizar `vite.config.ts`**
- Adicionar build splitting manual para separar vendor chunks grandes (react, supabase, recharts, framer-motion, dnd-kit)
- Isso reduz o bundle principal e melhora cache de dependencias

**1.3 Remover arquivo `lazy-routes.tsx` nao utilizado**
- O arquivo `src/pages/lazy-routes.tsx` define lazy imports duplicados que ja estao em `App.tsx`
- Remover para evitar confusao

### Fase 2: Rotas Duplicadas no App.tsx

**2.1 Corrigir rotas duplicadas**
- Rota `/gestor/dashboard` esta definida 2 vezes (linhas 386-394)
- Rota `/prospects` esta definida 2 vezes (linhas 260-266 e 428-434, sendo a segunda nunca alcancada porque a primeira usa VendasHub)
- Remover as duplicatas

**2.2 Criar componente LojaLayout reutilizavel**
- As 5 rotas da loja publica (`/`, `/loja`, `/loja/produto/:id`, etc.) repetem a mesma estrutura com LojaHeader, LojaFooter e WhatsAppButton
- Extrair para um componente `LojaLayout` que elimina duplicacao

### Fase 3: Responsividade Mobile (Grids sem breakpoints)

**3.1 `Clientes.tsx` - Formularios**
- Mudar todos os `grid-cols-2 gap-4` para `grid-cols-1 sm:grid-cols-2 gap-4` nos formularios de novo cliente e edicao
- Mudar `grid-cols-3 gap-4` para `grid-cols-1 sm:grid-cols-3 gap-4`
- Mudar `grid-cols-5` das TabsList para scroll horizontal (5 tabs nao cabem no mobile)

**3.2 `Clientes.tsx` - Lista**
- Botoes de acao do cliente (editar, whatsapp, excluir) devem ter touch targets maiores no mobile

**3.3 `Pedidos.tsx` - Layout**
- Os botoes de acao (imprimir, editar, excluir) ficam apertados no mobile
- Mudar layout para empilhar verticalmente no mobile

### Fase 4: Sidebar Melhorado

**4.1 `AppSidebar.tsx`**
- Sidebar ja tem `collapsible="none"` no desktop, mas poderia beneficiar de `collapsible="icon"` para dar mais espaco ao conteudo
- O SidebarTrigger posicionado com `absolute top-4 -right-3` pode ficar cortado - melhorar posicionamento

### Fase 5: Queries e Cache

**5.1 `Pedidos.tsx` - Migrar para React Query**
- A pagina de Pedidos usa `useState` + `useEffect` manual para carregar dados
- Migrar para `useQuery` com cache, como ja feito em outras paginas (Dashboard, Clientes)
- Isso evita recarregamentos desnecessarios e melhora a experiencia

**5.2 `Clientes.tsx` - Verificacao de perfil**
- `checkUserProfile` faz uma query separada toda vez que a pagina carrega
- Usar o `useAuth()` que ja existe no contexto (tem `isAdmin` e `roles`)

**5.3 `Pedidos.tsx` - Verificacao de permissao**
- Mesmo problema: `verificarPermissao()` faz query manual
- Substituir por `useAuth()` do contexto

### Fase 6: UX e Micro-melhorias

**6.1 Dashboard - Cards de "Meu Dia" e "Proximas Tarefas"**
- Atualmente mostram apenas "Nenhuma atividade" sem dados reais
- Conectar com as queries de tarefas e eventos do dia para exibir dados reais

**6.2 VendasHub - TabsList responsiva**
- `grid-cols-3 md:grid-cols-4` pode ficar apertado no mobile
- Mudar para scroll horizontal como ja feito no GestorDashboard

**6.3 Loja publica - LojaHome hero**
- A secao hero ja esta boa, mas os CTAs poderiam ter touch targets maiores no mobile

### Resumo de Arquivos Afetados

| Arquivo | Mudancas |
|---------|----------|
| `index.html` | Remover script duplicado de SW |
| `vite.config.ts` | Adicionar manual chunks |
| `src/App.tsx` | Remover rotas duplicadas, criar LojaLayout |
| `src/pages/Clientes.tsx` | Grids responsivos, usar useAuth |
| `src/pages/Pedidos.tsx` | Migrar para React Query, grids responsivos, usar useAuth |
| `src/pages/VendasHub.tsx` | TabsList responsiva |
| `src/pages/Dashboard.tsx` | Conectar cards com dados reais |
| `src/pages/lazy-routes.tsx` | Remover (nao utilizado) |

### Secao Tecnica

- **Build splitting**: Separar `react`, `react-dom`, `@supabase`, `recharts`, `framer-motion`, `@dnd-kit` em chunks separados para melhor cache
- **React Query migration**: Usar `useQuery` com `staleTime: 5min` e `gcTime: 30min` no padrao do projeto
- **Responsive breakpoints**: Seguir padrao `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3+`
- **Auth context reuse**: Eliminar queries manuais a `profiles` usando `useAuth()` que ja carrega roles

