import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ItemCarrinho {
  produto_id: string;
  nome: string;
  preco_por_kg: number;
  quantidade_kg: number;
  marca?: string;
}

interface CarrinhoState {
  itens: ItemCarrinho[];
  adicionarItem: (item: ItemCarrinho) => void;
  removerItem: (produto_id: string) => void;
  atualizarQuantidade: (produto_id: string, quantidade_kg: number) => void;
  limparCarrinho: () => void;
  getTotal: () => number;
}

export const useCarrinho = create<CarrinhoState>()(
  persist(
    (set, get) => ({
      itens: [],
      
      adicionarItem: (item) => {
        const itens = get().itens;
        const existente = itens.find(i => i.produto_id === item.produto_id);
        
        if (existente) {
          set({
            itens: itens.map(i =>
              i.produto_id === item.produto_id
                ? { ...i, quantidade_kg: i.quantidade_kg + item.quantidade_kg }
                : i
            ),
          });
        } else {
          set({ itens: [...itens, item] });
        }
      },
      
      removerItem: (produto_id) => {
        set({ itens: get().itens.filter(i => i.produto_id !== produto_id) });
      },
      
      atualizarQuantidade: (produto_id, quantidade_kg) => {
        if (quantidade_kg <= 0) {
          get().removerItem(produto_id);
        } else {
          set({
            itens: get().itens.map(i =>
              i.produto_id === produto_id ? { ...i, quantidade_kg } : i
            ),
          });
        }
      },
      
      limparCarrinho: () => {
        set({ itens: [] });
      },
      
      getTotal: () => {
        return get().itens.reduce(
          (total, item) => total + item.preco_por_kg * item.quantidade_kg,
          0
        );
      },
    }),
    {
      name: 'carrinho-orcamento',
    }
  )
);
