import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MeuPerfil = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const redirectToProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: "Não autenticado",
            description: "Faça login para acessar seu perfil",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        navigate(`/colaborador/${user.id}`);
      } catch (error) {
        console.error("Erro ao redirecionar:", error);
        navigate("/");
      }
    };

    redirectToProfile();
  }, [navigate, toast]);

  return (
    <div className="flex-1 p-8">
      <p className="text-muted-foreground">Carregando seu perfil...</p>
    </div>
  );
};

export default MeuPerfil;
