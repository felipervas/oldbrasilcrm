import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";

const Interacoes = () => {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Interações
            </h1>
            <p className="text-muted-foreground">
              Histórico de visitas e ligações
            </p>
          </div>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Registrar Interação
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Timeline de Interações
          </CardTitle>
          <CardDescription>
            Todas as interações com clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhuma interação registrada</p>
            <p className="text-sm mb-4">Comece registrando suas visitas e ligações</p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Registrar Agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Interacoes;
