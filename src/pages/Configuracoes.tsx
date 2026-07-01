import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { navItems, adminItems, equipeItem } from "@/components/AppLayout";
import { getMenuOrder, setMenuOrder, applyMenuOrder } from "@/lib/menuOrder";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type MenuItem = { title: string; url: string; icon: any };

export default function Configuracoes() {
  const { user } = useAuth();
  const { isAdminOrGestor, isSecretaria } = useUserRole();

  const visiveis: MenuItem[] = useMemo(
    () => [
      ...navItems,
      ...(isAdminOrGestor ? adminItems : []),
      ...((isAdminOrGestor || isSecretaria) ? [equipeItem] : []),
    ],
    [isAdminOrGestor, isSecretaria]
  );

  const [ordem, setOrdem] = useState<MenuItem[]>(() => applyMenuOrder(visiveis, getMenuOrder(user?.id)));

  const salvar = (novos: MenuItem[]) => {
    setOrdem(novos);
    if (user?.id) setMenuOrder(user.id, novos.map((i) => i.url));
  };

  const mover = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= ordem.length) return;
    const novos = [...ordem];
    [novos[idx], novos[j]] = [novos[j], novos[idx]];
    salvar(novos);
  };

  const restaurar = () => {
    setOrdem(visiveis);
    if (user?.id) setMenuOrder(user.id, []); // limpa -> menu volta ao padrão
    toast.success("Ordem padrão restaurada.");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-neu-sm">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Monte a ordem do seu menu. Vale só pra você, neste aparelho.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-foreground">Ordem do menu</h2>
            <Button variant="outline" size="sm" onClick={restaurar}>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Padrão
            </Button>
          </div>
          <div className="space-y-2">
            {ordem.map((item, idx) => (
              <div key={item.url} className="flex items-center gap-3 p-2.5 rounded-xl shadow-neu-inset bg-background">
                <span className="text-xs text-muted-foreground w-5 text-center">{idx + 1}</span>
                <item.icon className="h-5 w-5 text-primary shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground truncate">{item.title}</span>
                <Button variant="outline" size="icon" aria-label="Subir" disabled={idx === 0} onClick={() => mover(idx, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Descer" disabled={idx === ordem.length - 1} onClick={() => mover(idx, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">As setas mudam a ordem na hora — já aparece no menu do lado. 👍</p>
        </CardContent>
      </Card>
    </div>
  );
}
