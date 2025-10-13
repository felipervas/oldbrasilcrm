import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Interacoes = () => {
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const { toast } = useToast();

  const loadInteracoes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("interacoes")
      .select("*, clientes(nome_fantasia)")
      .eq("usuario_id", user.id)
      .order("data_hora", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar interações", variant: "destructive" });
    } else {
      setInteracoes(data || []);
    }
  };

  useEffect(() => {
    loadInteracoes();
  }, []);

  const getResultadoBadge = (resultado: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      concluida: { color: "bg-green-500 text-white", text: "Concluída" },
      nao_concluida: { color: "bg-red-500 text-white", text: "Não Concluída" },
      remarcada: { color: "bg-orange-500 text-white", text: "Remarcada" },
    };
    return badges[resultado] || { color: "bg-muted", text: resultado };
  };

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
          {interacoes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma interação registrada</p>
              <p className="text-sm">As interações são registradas automaticamente quando você executa tarefas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interacoes.map((interacao) => (
                <div key={interacao.id} className="border-l-4 border-primary pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{interacao.clientes?.nome_fantasia}</h3>
                      <div className="flex gap-2 mt-1 text-xs">
                        <span className="px-2 py-1 bg-secondary rounded">{interacao.tipo}</span>
                        <span className={`px-2 py-1 rounded ${getResultadoBadge(interacao.resultado).color}`}>
                          {getResultadoBadge(interacao.resultado).text}
                        </span>
                      </div>
                      {interacao.motivo && (
                        <p className="text-sm text-muted-foreground mt-2">Motivo: {interacao.motivo}</p>
                      )}
                      {interacao.comentario && (
                        <p className="text-sm mt-2">{interacao.comentario}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(interacao.data_hora).toLocaleDateString('pt-BR')} {new Date(interacao.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Interacoes;
