

## Correcao: Cliques Bloqueados no Dashboard do Gestor

### Problema Identificado

Os 4 cards de resumo no topo do Dashboard do Gestor (Faturamento, Pedidos, Saldo, Ticket Medio) possuem uma `div` com `absolute inset-0` para criar um efeito de gradiente decorativo. Essa div invisivel cobre toda a area dos cards e intercepta todos os eventos de clique, impedindo interacao com qualquer elemento da pagina (incluindo a sidebar para navegar de volta).

### Causa Raiz

```
<Card className="... overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br ..." />  <-- BLOQUEIA CLIQUES
```

A div com `position: absolute` e `inset: 0` cria uma camada que fica por cima de todo o conteudo do card. Como nao tem `pointer-events-none`, ela captura todos os eventos de mouse/touch, tornando impossivel clicar em qualquer coisa atras dela.

### Solucao

Adicionar `pointer-events-none` nas 4 divs decorativas de gradiente nos cards de resumo do `GestorDashboard.tsx`:

**Arquivo: `src/pages/GestorDashboard.tsx`**
- Linha 195: Adicionar `pointer-events-none` na div de gradiente do card "Faturamento Total"
- Linha 209: Adicionar `pointer-events-none` na div de gradiente do card "Total de Pedidos"
- Linha 223: Adicionar `pointer-events-none` na div de gradiente do card "Saldo Financeiro"
- Linha 239: Adicionar `pointer-events-none` na div de gradiente do card "Ticket Medio"

### Secao Tecnica

Mudanca em cada uma das 4 linhas:
```
// Antes:
<div className="absolute inset-0 bg-gradient-to-br from-chart-X/10 to-transparent" />

// Depois:
<div className="absolute inset-0 bg-gradient-to-br from-chart-X/10 to-transparent pointer-events-none" />
```

Isso garante que as divs decorativas nao interceptem eventos de mouse/touch, permitindo que os cliques passem para os elementos interativos por baixo (sidebar, tabs, botoes).

