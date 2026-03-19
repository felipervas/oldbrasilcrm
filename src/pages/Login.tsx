import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Store, UserCheck } from "lucide-react";
import oldLogo from "@/assets/old-brasil-logo.png";

const DEMO_EMAIL = "visitante@cellos.demo";
const DEMO_PASSWORD = "demo123456";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        title: "Erro ao entrar",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    } else if (data.session) {
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 100);
    }
  };

  const handleVisitorLogin = async () => {
    setIsLoading(true);

    // Try login first
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (loginData?.session) {
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 100);
      return;
    }

    // If login fails, create the account
    const { error: signUpError } = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      options: {
        data: { nome: "Visitante Demo" },
      },
    });

    if (signUpError) {
      toast({
        title: "Erro ao entrar",
        description: signUpError.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Login after signup
    const { data: loginData2, error: loginError2 } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (loginError2) {
      toast({
        title: "Erro ao entrar",
        description: loginError2.message,
        variant: "destructive",
      });
      setIsLoading(false);
    } else if (loginData2?.session) {
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 100);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="absolute top-4 right-4">
          <Button
            variant="outline"
            onClick={() => navigate('/loja')}
            className="gap-2"
          >
            <Store className="h-4 w-4" />
            Voltar para a Loja
          </Button>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <img src={oldLogo} alt="Cellos Distribuidora" className="h-20 w-auto" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Cellos CRM
          </h1>
          <p className="text-muted-foreground">
            Sistema de Gestão de Representação
          </p>
        </div>

        <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                🔒 Área Restrita - Equipe Cellos
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Este sistema é de uso exclusivo para membros autorizados da equipe Cellos. 
                Apenas colaboradores cadastrados podem acessar.
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>Bem-vindo</CardTitle>
            <CardDescription>
              Entre com sua conta ou acesse como visitante
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Visitor quick access */}
            <Button
              onClick={handleVisitorLogin}
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              size="lg"
            >
              <UserCheck className="h-5 w-5" />
              {isLoading ? "Entrando..." : "Entrar como Visitante"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou entre com credenciais</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" variant="outline" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
