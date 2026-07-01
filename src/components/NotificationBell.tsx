import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  titulo: string;
  mensagem: string | null;
  tipo: string;
  lida: boolean;
  created_at: string;
  cliente_id: string | null;
  opportunity_id: string | null;
  metadata: any;
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetch = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Notification[]) ?? []);
  };

  useEffect(() => {
    fetch();
    if (!user) return;
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const naoLidas = items.filter((n) => !n.lida).length;

  const marcarLida = async (id: string) => {
    await supabase.from("notifications").update({ lida: true }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  };

  const marcarTodasLidas = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ lida: true }).eq("user_id", user.id).eq("lida", false);
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const removeOne = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClick = (n: Notification) => {
    if (!n.lida) marcarLida(n.id);
    setOpen(false);
    if (n.opportunity_id) navigate(`/oportunidades/${n.opportunity_id}`);
    else if (n.cliente_id) navigate(`/clientes/${n.cliente_id}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {naoLidas > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={marcarTodasLidas}>
              <Check className="h-3 w-3 mr-1" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 flex items-start gap-2 hover:bg-muted/40 transition-colors cursor-pointer ${!n.lida ? "bg-primary/5" : ""}`}
                  onClick={() => handleClick(n)}
                >
                  <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!n.lida ? "bg-primary" : "bg-transparent"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{n.titulo}</p>
                    {n.mensagem && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => { e.stopPropagation(); removeOne(n.id); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
