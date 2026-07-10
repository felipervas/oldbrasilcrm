// Hook do carrinho de compras da loja (backend real via edge functions).
// Diferente do useCarrinho (orçamento local), este persiste no banco e é a
// fonte de verdade para o checkout.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Carrinho, ecomApi } from "@/lib/ecommerce/api";

const QUERY_KEY = ["ecom-carrinho"];

export function useEcomCarrinho() {
  const queryClient = useQueryClient();

  const { data: carrinho, isLoading } = useQuery<Carrinho>({
    queryKey: QUERY_KEY,
    queryFn: ecomApi.getCarrinho,
    staleTime: 30_000,
  });

  const atualizarCache = (novo: Carrinho) => {
    queryClient.setQueryData(QUERY_KEY, novo);
  };

  const onError = (e: Error) => toast.error(e.message);

  const adicionar = useMutation({
    mutationFn: ({ produtoId, quantidade = 1 }: { produtoId: string; quantidade?: number }) =>
      ecomApi.adicionarItem(produtoId, quantidade),
    onSuccess: (novo) => {
      atualizarCache(novo);
      toast.success("Produto adicionado ao carrinho");
    },
    onError,
  });

  const atualizar = useMutation({
    mutationFn: ({ produtoId, quantidade }: { produtoId: string; quantidade: number }) =>
      ecomApi.atualizarItem(produtoId, quantidade),
    onSuccess: atualizarCache,
    onError,
  });

  const remover = useMutation({
    mutationFn: (produtoId: string) => ecomApi.removerItem(produtoId),
    onSuccess: atualizarCache,
    onError,
  });

  const aplicarCupom = useMutation({
    mutationFn: (codigo: string) => ecomApi.aplicarCupom(codigo),
    onSuccess: (novo) => {
      atualizarCache(novo);
      toast.success("Cupom aplicado");
    },
    onError,
  });

  const removerCupom = useMutation({
    mutationFn: () => ecomApi.removerCupom(),
    onSuccess: atualizarCache,
    onError,
  });

  const limpar = useMutation({
    mutationFn: () => ecomApi.limparCarrinho(),
    onSuccess: atualizarCache,
    onError,
  });

  return {
    carrinho,
    isLoading,
    quantidadeItens: carrinho?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0,
    adicionar,
    atualizar,
    remover,
    aplicarCupom,
    removerCupom,
    limpar,
  };
}
