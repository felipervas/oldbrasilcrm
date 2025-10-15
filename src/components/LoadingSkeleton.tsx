import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const TarefaSkeleton = () => (
  <Card className="shadow-card">
    <CardHeader>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2 mt-2" />
    </CardHeader>
    <CardContent>
      <div className="flex justify-between items-center">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const ClienteSkeleton = () => (
  <div className="border rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-9 w-9" />
    </div>
  </div>
);

export const ProdutoSkeleton = () => (
  <div className="border rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  </div>
);

export const PedidoSkeleton = () => (
  <div className="border rounded-lg p-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="space-y-2 text-right">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  </div>
);

export const ListLoadingSkeleton = ({ count = 5, type = 'tarefa' }: { count?: number; type?: 'tarefa' | 'cliente' | 'produto' | 'pedido' }) => {
  const SkeletonComponent = {
    tarefa: TarefaSkeleton,
    cliente: ClienteSkeleton,
    produto: ProdutoSkeleton,
    pedido: PedidoSkeleton,
  }[type];

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  );
};
