import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, CheckSquare } from "lucide-react";

const Tarefas = () => {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Tarefas
            </h1>
            <p className="text-muted-foreground">
              Organize suas visitas e ligações
            </p>
          </div>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Kanban de Tarefas
          </CardTitle>
          <CardDescription>
            Visualize e gerencie suas tarefas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhuma tarefa pendente</p>
            <p className="text-sm mb-4">Crie tarefas para organizar suas atividades</p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Tarefa
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tarefas;
