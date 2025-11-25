import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingUp, CheckSquare, BarChart3 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/hooks/useUserRole";

// Lazy load das abas para melhor performance
const ProspectsTab = lazy(() => import("./Prospects"));
const PerformanceVendasTab = lazy(() => import("./PerformanceVendas"));
const TarefasTab = lazy(() => import("./Tarefas"));
const GestorDashboardTab = lazy(() => import("./GestorDashboard"));

const TabSkeleton = () => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-8 w-64" />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <Skeleton className="h-96" />
  </div>
);

export default function VendasHub() {
  const { isGestor } = useUserRole();

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Hub de Vendas</h1>
        <p className="text-muted-foreground">
          Gestão completa de pipeline, performance e tarefas
        </p>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4">
          <TabsTrigger value="pipeline" className="gap-2">
            <Target className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="tarefas" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Tarefas
          </TabsTrigger>
          {isGestor && (
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <Suspense fallback={<TabSkeleton />}>
            <ProspectsTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Suspense fallback={<TabSkeleton />}>
            <PerformanceVendasTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="tarefas" className="space-y-4">
          <Suspense fallback={<TabSkeleton />}>
            <TarefasTab />
          </Suspense>
        </TabsContent>

        {isGestor && (
          <TabsContent value="dashboard" className="space-y-4">
            <Suspense fallback={<TabSkeleton />}>
              <GestorDashboardTab />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
