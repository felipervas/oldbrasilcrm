// Ordem personalizada do menu, por usuário. Guardada no aparelho (localStorage) —
// não precisa mexer no Supabase. Cada pessoa da equipe monta a sua sequência.

export function getMenuOrder(userId?: string | null): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`menu_order_${userId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setMenuOrder(userId: string, order: string[]) {
  try {
    localStorage.setItem(`menu_order_${userId}`, JSON.stringify(order));
    // avisa o menu (AppLayout) pra atualizar na hora, sem recarregar a página
    window.dispatchEvent(new CustomEvent("menu-order-changed"));
  } catch {
    /* localStorage indisponível — ignora */
  }
}

/** Ordena a lista de itens conforme a ordem salva; itens sem posição vão para o fim. */
export function applyMenuOrder<T extends { url: string }>(items: T[], order: string[]): T[] {
  if (!order || order.length === 0) return items;
  const pos = (u: string) => {
    const i = order.indexOf(u);
    return i === -1 ? order.length + 1 : i;
  };
  return [...items].sort((a, b) => pos(a.url) - pos(b.url));
}
