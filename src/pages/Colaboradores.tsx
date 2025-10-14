import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Users, Calendar, CheckSquare, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Colaboradores = () => {
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const email = user.email?.toLowerCase() || "";
    const hasAccess = email === "felipervas@gmail.com" || email.endsWith("@oldvasconcellos.com");
    
    if (!hasAccess) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setCanEdit(hasAccess);
    loadColaboradores();
  };

  const loadColaboradores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *,
        tarefas:tarefas(count)
      `)
      .order("nome");

    if (error) {
      toast({ title: "Erro ao carregar colaboradores", variant: "destructive" });
    } else {
      setColaboradores(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAccess();
  }, []);

  const getTarefasCount = (colaborador: any) => {
    return colaborador.tarefas?.[0]?.count || 0;
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Colaboradores
            </h1>
            <p className="text-muted-foreground">
              Gerencie a equipe e suas tarefas
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : (
        <>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Equipe
              </CardTitle>
              <CardDescription>
                {canEdit && <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Acesso de administrador</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {colaboradores.map((colab) => (
                  <div key={colab.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{colab.nome}</h3>
                        {colab.perfil && (
                          <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded mt-1 inline-block">
                            {colab.perfil}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {colab.telefone && (
                      <p className="text-sm text-muted-foreground mb-2">
                        📱 {colab.telefone}
                      </p>
                    )}
                    
                    {colab.equipe && (
                      <p className="text-sm text-muted-foreground mb-2">
                        👥 {colab.equipe}
                      </p>
                    )}

                    <div className="flex gap-4 mt-4 pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        <span>{getTarefasCount(colab)} tarefas</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Colaboradores;