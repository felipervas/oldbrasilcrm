import { useState } from "react";
import { useClienteProdutosHistorico } from "@/hooks/useClienteProdutosHistorico";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Clock, Phone } from "lucide-react";
import { ListLoadingSkeleton } from "@/components/LoadingSkeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClienteProdutosHistoricoProps {
  clienteId: string;
  clienteNome: string;
  onCreateTask?: (produtoNome: string, diasParado: number) => void;
}

export const ClienteProdutosHistorico = ({ clienteId, clienteNome, onCreateTask }: ClienteProdutosHistoricoProps) => {
  const [filtro, setFiltro] = useState<string>("todos");
  const { data: produtos, isLoading } = useClienteProdutosHistorico(clienteId);

  if (isLoading) {
    return <ListLoadingSkeleton />;
  }

  if (!produtos || produtos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum histórico de compra encontrado</p>
      </div>
    );
  }

  const produtosFiltrados = produtos.filter(p => {
    if (filtro === "todos") return true;
    return p.status === filtro;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'parado':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Parado
          </Badge>
        );
      case 'risco':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Risco
          </Badge>
        );
      case 'ativo':
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            Ativo
          </Badge>
        );
      default:
        return null;
    }
  };

  const contagemStatus = {
    todos: produtos.length,
    ativo: produtos.filter(p => p.status === 'ativo').length,
    risco: produtos.filter(p => p.status === 'risco').length,
    parado: produtos.filter(p => p.status === 'parado').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos ({contagemStatus.todos})</SelectItem>
            <SelectItem value="ativo">Ativos ({contagemStatus.ativo})</SelectItem>
            <SelectItem value="risco">Em Risco ({contagemStatus.risco})</SelectItem>
            <SelectItem value="parado">Parados ({contagemStatus.parado})</SelectItem>
          </SelectContent>
        </Select>

        {contagemStatus.parado > 0 && (
          <div className="text-sm text-muted-foreground">
            ⚠️ {contagemStatus.parado} produto{contagemStatus.parado > 1 ? 's' : ''} parado{contagemStatus.parado > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Pedidos</TableHead>
              <TableHead className="text-center">Primeira</TableHead>
              <TableHead className="text-center">Última</TableHead>
              <TableHead className="text-center">Dias</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtosFiltrados.map((produto) => (
              <TableRow key={produto.produto_id}>
                <TableCell className="font-medium">{produto.produto_nome}</TableCell>
                <TableCell className="text-center">{produto.total_quantidade.toFixed(0)}</TableCell>
                <TableCell className="text-center">{produto.total_pedidos}</TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {format(new Date(produto.primeira_compra), "dd/MM/yy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {format(new Date(produto.ultima_compra), "dd/MM/yy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-center">
                  <span className={produto.dias_desde_ultima_compra > 60 ? "text-destructive font-bold" : ""}>
                    {produto.dias_desde_ultima_compra}d
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(produto.status)}
                </TableCell>
                <TableCell className="text-center">
                  {(produto.status === 'parado' || produto.status === 'risco') && onCreateTask && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCreateTask(produto.produto_nome, produto.dias_desde_ultima_compra)}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Follow-up
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
