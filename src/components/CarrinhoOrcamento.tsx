import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { useCarrinho } from '@/hooks/useCarrinho';
import { Separator } from '@/components/ui/separator';

export const CarrinhoOrcamento = () => {
  const { itens, removerItem, atualizarQuantidade, limparCarrinho, getTotal } = useCarrinho();
  const [open, setOpen] = useState(false);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Orçamento
          {itens.length > 0 && (
            <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {itens.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Orçamento</SheetTitle>
        </SheetHeader>

        {itens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Adicione produtos para criar um orçamento
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {itens.map((item) => (
                <div key={item.produto_id} className="space-y-2 pb-4 border-b">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.nome}</h4>
                      {item.marca && (
                        <p className="text-sm text-muted-foreground">{item.marca}</p>
                      )}
                      <p className="text-sm font-medium text-primary">
                        {formatPrice(item.preco_por_kg)}/kg
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removerItem(item.produto_id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => atualizarQuantidade(item.produto_id, item.quantidade_kg - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantidade_kg}
                      onChange={(e) =>
                        atualizarQuantidade(item.produto_id, parseFloat(e.target.value) || 0)
                      }
                      className="h-8 w-20 text-center"
                      min="0"
                      step="0.5"
                    />
                    <span className="text-sm text-muted-foreground">kg</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => atualizarQuantidade(item.produto_id, item.quantidade_kg + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <div className="ml-auto text-right">
                      <p className="font-semibold">
                        {formatPrice(item.preco_por_kg * item.quantidade_kg)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span>{formatPrice(getTotal())}</span>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button className="w-full" size="lg">
                  Gerar Pedido
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (confirm('Limpar todos os itens do orçamento?')) {
                      limparCarrinho();
                    }
                  }}
                >
                  Limpar Orçamento
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
