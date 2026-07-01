import { ReactNode, useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import { useRascunhosCount } from "@/hooks/useRascunhosCount";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, ShoppingCart, Users, BookOpen, User, LogOut, IceCreamCone, Kanban,
  Calendar, BarChart2, Search, Package, UsersRound, ShieldCheck, Shield, TrendingUp, Menu, MoreHorizontal,
  BookMarked, Coins, Upload, MessageCircle, CalendarRange, RefreshCw, Sun, Tent, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMenuOrder, applyMenuOrder } from "@/lib/menuOrder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/NotificationBell";

export const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pipeline", url: "/pipeline", icon: Kanban },
  { title: "Agenda & Rotas", url: "/agenda", icon: Calendar },
  { title: "Pedidos", url: "/pedidos", icon: ShoppingCart },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "AGAGEL", url: "/agagel", icon: Tent },
  { title: "Catálogo", url: "/catalogo", icon: BookOpen },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Perfil", url: "/perfil", icon: User },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export const adminItems = [
  { title: "Vendas", url: "/vendas", icon: TrendingUp },
  { title: "Relatórios", url: "/relatorios", icon: BarChart2 },
  { title: "Relatório Semanal", url: "/relatorio-semanal", icon: CalendarRange },
  { title: "Guardião do Funil", url: "/guardiao", icon: ShieldCheck },
  { title: "Hora de Recomprar", url: "/recompra", icon: RefreshCw },
  { title: "Bom-dia (Resumo)", url: "/bom-dia", icon: Sun },
  { title: "Playbook", url: "/playbook", icon: BookMarked },
  { title: "Comissões", url: "/comissoes", icon: Coins },
  { title: "Importar", url: "/importar", icon: Upload },
  { title: "WhatsApp Templates", url: "/perfil/whatsapp-templates", icon: MessageCircle },
];

export const equipeItem = { title: "Equipe", url: "/equipe", icon: UsersRound };

interface SearchResult {
  id: string;
  nome_loja: string;
  cidade: string | null;
  cnpj: string | null;
}

interface GlobalSearchProps {
  className?: string;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  searchResults: SearchResult[];
  selectResult: (id: string) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  searchContainerRef: React.RefObject<HTMLDivElement>;
}

const GlobalSearch = ({
  className = "",
  searchQuery,
  setSearchQuery,
  searchOpen,
  setSearchOpen,
  searchResults,
  selectResult,
  searchRef,
  searchContainerRef,
}: GlobalSearchProps) => (
  <div ref={searchContainerRef} className={cn("relative", className)}>
    <div
      className="flex items-center gap-2 cursor-pointer"
      onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchRef}
          placeholder="Buscar cliente... (Ctrl+K)"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
          onFocus={() => setSearchOpen(true)}
          className="pl-10 h-9 text-sm bg-sidebar-accent/30 border-sidebar-border"
        />
      </div>
    </div>
    {searchOpen && searchResults.length > 0 && (
      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
        {searchResults.map(r => (
          <button
            key={r.id}
            onClick={() => selectResult(r.id)}
            className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
          >
            <p className="text-sm font-medium text-foreground">{r.nome_loja}</p>
            <p className="text-xs text-muted-foreground">{r.cidade ?? ""}{r.cnpj ? ` · ${r.cnpj}` : ""}</p>
          </button>
        ))}
      </div>
    )}
  </div>
);

const ContentLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const { isAdminOrGestor, isAdmin, isSecretaria } = useUserRole();
  const [overdueCount, setOverdueCount] = useState(0);
  const [pipelineOverdue, setPipelineOverdue] = useState(0);
  const { count: rascunhosCount } = useRascunhosCount();
  const [profileName, setProfileName] = useState("");
  const [, bumpMenuOrder] = useState(0); // força re-render quando a ordem do menu muda

  // Global search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fetch profile name
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nome").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setProfileName(data.nome); });
  }, [user?.id]);

  // Ordem do menu personalizada — atualiza na hora quando muda em Configurações
  useEffect(() => {
    const h = () => bumpMenuOrder((v) => v + 1);
    window.addEventListener("menu-order-changed", h);
    return () => window.removeEventListener("menu-order-changed", h);
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      supabase.from("followups").select("id", { count: "exact", head: true })
        .eq("status", "pendente").lt("due_date", today),
      supabase.from("opportunities").select("id", { count: "exact", head: true })
        .eq("status", "open").lt("expected_close_date", today),
    ]).then(([fuRes, oppRes]) => {
      setOverdueCount(fuRes.count ?? 0);
      setPipelineOverdue(oppRes.count ?? 0);
    });
  }, [pathname]);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Click outside to close search
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Search clients
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    // Escape special Postgres LIKE characters
    const safe = q.replace(/[%_\\]/g, "\\$&");
    const { data } = await supabase
      .from("clientes")
      .select("id, nome_loja, cidade, cnpj")
      .or(`nome_loja.ilike.%${safe}%,cidade.ilike.%${safe}%,cnpj.ilike.%${safe}%`)
      .limit(5);
    setSearchResults(data ?? []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, doSearch]);

  const selectResult = (id: string) => {
    navigate(`/clientes/${id}`);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const getBadge = (url: string) => {
    if (url === "/agenda" && overdueCount > 0) return overdueCount;
    if (url === "/pipeline" && pipelineOverdue > 0) return pipelineOverdue;
    if (url === "/pedidos" && rascunhosCount > 0) return rascunhosCount;
    return 0;
  };

  const allItems = [...navItems, ...(isAdminOrGestor ? adminItems : []), ...((isAdminOrGestor || isSecretaria) ? [equipeItem] : [])];
  const orderedItems = applyMenuOrder(allItems, getMenuOrder(user?.id));
  const isActive = (url: string) => pathname === url;

  const searchProps = {
    searchQuery,
    setSearchQuery,
    searchOpen,
    setSearchOpen,
    searchResults,
    selectResult,
    searchRef,
    searchContainerRef,
  };

  if (isMobile) {
    const bottomNav = [
      { title: "Início", url: "/", icon: LayoutDashboard },
      { title: "Pipeline", url: "/pipeline", icon: Kanban },
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "Agenda", url: "/agenda", icon: Calendar },
    ];
    const moreItems = orderedItems.filter(i => !bottomNav.find(b => b.url === i.url));

    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-md">
          <div className="flex items-center px-2 h-14 gap-1">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 min-h-[44px] min-w-[44px] shrink-0">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
                <SheetHeader className="px-4 h-14 border-b border-sidebar-border flex flex-row items-center gap-2 space-y-0">
                  <IceCreamCone className="h-6 w-6 text-sidebar-primary" />
                  <SheetTitle className="font-bold text-lg text-sidebar-foreground">Cellos CRM</SheetTitle>
                </SheetHeader>
                <nav className="px-2 py-3 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 3.5rem - 6rem)" }}>
                  {orderedItems.map(item => {
                    const badge = getBadge(item.url);
                    return (
                      <Link
                        key={item.url}
                        to={item.url}
                        className={cn(
                          "relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-sm font-medium min-h-[48px]",
                          isActive(item.url)
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {badge > 0 && (
                          <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">{badge}</span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
                <div className="absolute bottom-0 left-0 right-0 px-3 py-3 border-t border-sidebar-border bg-sidebar">
                  <div className="flex items-center gap-3 px-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold text-sidebar-primary shrink-0">
                      {profileName ? profileName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{profileName || "Usuário"}</p>
                      <div className="flex items-center gap-1">
                        {isAdminOrGestor ? (
                          <><ShieldCheck className="h-3 w-3 text-sidebar-primary" /><span className="text-[10px] text-sidebar-foreground/60">Admin</span></>
                        ) : (
                          <><Shield className="h-3 w-3 text-sidebar-foreground/50" /><span className="text-[10px] text-sidebar-foreground/60">Vendedor</span></>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all w-full min-h-[44px]"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sair</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <IceCreamCone className="h-6 w-6 text-secondary shrink-0" />
              <span className="font-bold text-base truncate">Cellos CRM</span>
            </div>
            <div className="text-primary-foreground"><NotificationBell /></div>
          </div>
          <div className="px-3 pb-3">
            <GlobalSearch {...searchProps} />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto pb-24 px-3 py-4">
          <Suspense fallback={<ContentLoader />}>{children}</Suspense>
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center h-16">
            {bottomNav.map((item) => {
              const badge = getBadge(item.url);
              return (
                <Link
                  key={item.url}
                  to={item.url}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg transition-colors text-[11px] min-h-[52px] justify-center flex-1",
                    isActive(item.url)
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive(item.url) && "text-primary")} />
                  <span>{item.title}</span>
                  {badge > 0 && (
                    <span className="absolute top-1 right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">{badge}</span>
                  )}
                </Link>
              );
            })}
            {moreItems.length > 0 && (
              <Sheet>
                <SheetTrigger asChild>
                  <button className="relative flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg transition-colors text-[11px] min-h-[52px] justify-center flex-1 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-5 w-5" />
                    <span>Mais</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[80vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Mais opções</SheetTitle>
                  </SheetHeader>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {moreItems.map(item => {
                      const badge = getBadge(item.url);
                      return (
                        <Link
                          key={item.url}
                          to={item.url}
                          className={cn(
                            "relative flex flex-col items-center gap-1 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors min-h-[80px] justify-center",
                            isActive(item.url) && "bg-primary/10 border-primary/30"
                          )}
                        >
                          <item.icon className={cn("h-6 w-6", isActive(item.url) ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-[11px] font-medium text-foreground text-center leading-tight">{item.title}</span>
                          {badge > 0 && (
                            <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">{badge}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </nav>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="flex items-center justify-between gap-3 px-6 h-16 border-b border-sidebar-border">
          <div className="flex items-center gap-3 min-w-0">
            <IceCreamCone className="h-7 w-7 text-sidebar-primary shrink-0" />
            <span className="font-bold text-xl truncate">Cellos CRM</span>
          </div>
          <NotificationBell />
        </div>

        {/* Search in sidebar */}
        <div className="px-3 pt-4 pb-2">
          <GlobalSearch {...searchProps} />
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {orderedItems.map((item) => {
            const badge = getBadge(item.url);
            return (
              <Link
                key={item.url}
                to={item.url}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium min-h-[44px]",
                  isActive(item.url)
                    ? "bg-sidebar text-primary shadow-neu-inset"
                    : "text-sidebar-foreground/70 hover:text-foreground hover:shadow-neu-sm"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
                {badge > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
          {/* User info */}
          <div className="flex items-center gap-3 px-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold text-sidebar-primary">
              {profileName ? profileName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profileName || "Usuário"}</p>
              <div className="flex items-center gap-1">
                {isAdminOrGestor ? (
                  <><ShieldCheck className="h-3 w-3 text-sidebar-primary" /><span className="text-[10px] text-sidebar-foreground/60">Admin</span></>
                ) : (
                  <><Shield className="h-3 w-3 text-sidebar-foreground/50" /><span className="text-[10px] text-sidebar-foreground/60">Vendedor</span></>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all w-full min-h-[44px]"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <Suspense fallback={<ContentLoader />}>{children}</Suspense>
      </main>
    </div>
  );
}
