import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Package,
  Tag,
  FileText,
  Briefcase,
  LogOut,
  ShoppingCart,
  Boxes,
  BarChart3,
  User,
  ShoppingBag,
  Store,
  Shield,
  Target,
  CalendarDays,
  Route,
  Menu,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIsMobile } from "@/hooks/use-mobile";
import oldLogo from "@/assets/old-brasil-logo.png";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const defaultMenuItems = [
  { id: "dashboard", title: "Dashboard", url: "/crm", icon: LayoutDashboard },
  { id: "meu-dia", title: "Meu Dia", url: "/meu-dia", icon: CalendarDays },
  { id: "meu-perfil", title: "Meu Perfil", url: "/meu-perfil", icon: User },
  { id: "loja-online", title: "Ver Loja Online", url: "/", icon: ShoppingBag },
  { id: "clientes", title: "Clientes", url: "/clientes", icon: Users },
  { id: "prospects", title: "Pipeline de Leads", url: "/prospects", icon: Target },
  { id: "tarefas", title: "Tarefas", url: "/tarefas", icon: CheckSquare },
  { id: "performance", title: "Performance Vendas", url: "/performance-vendas", icon: BarChart3 },
  
  { id: "produtos", title: "Produtos", url: "/produtos", icon: Package },
  { id: "marcas", title: "Marcas", url: "/marcas", icon: Tag },
  { id: "catalogos", title: "Catálogos", url: "/catalogos", icon: FileText },
  { id: "tabelas-precos", title: "Tabelas de Preços", url: "/tabelas-precos", icon: FileText },
  { id: "receitas", title: "Receitas", url: "/receitas", icon: FileText },
  { id: "pedidos", title: "Pedidos", url: "/pedidos", icon: ShoppingCart },
  { id: "lancar-pedido", title: "Lançar Pedido", url: "/lancar-pedido", icon: Briefcase },
  { id: "estoque", title: "Estoque & Amostras", url: "/estoque-amostras", icon: Boxes },
  { id: "gestor-dashboard", title: "Dashboard Gestor", url: "/gestor/dashboard", icon: BarChart3, restricted: true },
];

function SortableMenuItem({ item, open, onNavigate }: { item: typeof defaultMenuItems[0]; open: boolean; onNavigate?: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative overflow-hidden rounded-lg mb-1 px-2 py-2 transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-crm-hover"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`h-5 w-5 transition-colors ${
                    isActive
                      ? "text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground"
                  }`}
                />
                {open && (
                  <span
                    className={`font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? "text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80 group-hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    {item.title}
                  </span>
                )}
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </div>
  );
}

export function AppSidebar() {
  const { open, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { toast } = useToast();
  const { data: isAdmin } = useIsAdmin();
  const [menuItems, setMenuItems] = useState(defaultMenuItems);
  const [canViewFinanceiro, setCanViewFinanceiro] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    checkFinanceiroAccess();
    loadMenuOrder();
    
    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkFinanceiroAccess();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auto-minimizar sidebar ao navegar (apenas no mobile)
  useEffect(() => {
    if (isMobile && open && setOpen) {
      setOpen(false);
    }
  }, [location.pathname, isMobile]);

  const checkFinanceiroAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCanViewFinanceiro(false);
        setUserRoles([]);
        return;
      }

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao buscar roles:', error);
        setCanViewFinanceiro(false);
        setUserRoles([]);
        return;
      }

      const rolesList = roles?.map(r => r.role) || [];
      setUserRoles(rolesList);
      
      const hasGestorRole = rolesList.some(r => r === 'gestor' || r === 'admin');
      setCanViewFinanceiro(hasGestorRole);
      
      console.log('Roles carregados:', rolesList, 'Pode ver financeiro:', hasGestorRole);
    } catch (error) {
      console.error('Erro ao verificar acesso financeiro:', error);
      setCanViewFinanceiro(false);
      setUserRoles([]);
    }
  };

  const loadMenuOrder = () => {
    const saved = localStorage.getItem('menuOrder');
    if (saved) {
      const savedIds = JSON.parse(saved);
      
      // Mesclar itens salvos com novos itens padrão
      const orderedItems = savedIds
        .map((id: string) => defaultMenuItems.find(item => item.id === id))
        .filter(Boolean);
      
      // Adicionar novos itens que não estão na ordem salva
      const newItems = defaultMenuItems.filter(
        item => !savedIds.includes(item.id)
      );
      
      setMenuItems([...orderedItems, ...newItems] as typeof defaultMenuItems);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMenuItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('menuOrder', JSON.stringify(newOrder.map(item => item.id)));
        return newOrder;
      });
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/login");
    }
  };

  const handleNavClick = () => {
    if (isMobile && open) {
      setOpen(false);
    }
  };

  const visibleMenuItems = menuItems.filter(item => 
    !item.restricted || (item.restricted && canViewFinanceiro)
  );

  // Item extra para admins (não faz parte da lista ordenável)
  const gerenciarLojaItem = {
    id: 'gerenciar-loja',
    title: 'Gerenciar Loja',
    url: '/gerenciar-loja',
    icon: Store,
  };

  return (
    <Sidebar 
      className="h-screen sticky top-0 w-20 data-[state=expanded]:w-72 transition-all duration-300 bg-gradient-to-b from-crm-sidebar-from to-crm-sidebar-to border-r border-sidebar-border text-sidebar-foreground shadow-xl"
      collapsible="icon"
    >
      {/* 🎯 BOTÃO SUPER VISÍVEL PARA ABRIR/FECHAR */}
      <div className="sticky top-0 z-20 bg-sidebar border-b border-sidebar-border">
        <SidebarTrigger className="w-full h-14 flex items-center justify-center hover:bg-sidebar-accent transition-colors group">
          <div className="flex items-center gap-3">
            {open ? (
              <>
                <ChevronLeft className="h-6 w-6 text-sidebar-foreground group-hover:text-sidebar-accent-foreground transition-colors" />
                <span className="text-sm font-medium text-sidebar-foreground group-hover:text-sidebar-accent-foreground">
                  Fechar Menu
                </span>
              </>
            ) : (
              <Menu className="h-7 w-7 text-sidebar-foreground group-hover:text-sidebar-accent-foreground animate-pulse" />
            )}
          </div>
        </SidebarTrigger>
      </div>
      
      <SidebarHeader className="relative z-10 p-4 border-b border-sidebar-border bg-sidebar">
        {open ? (
          <div className="flex items-center gap-3">
            <img src={oldLogo} alt="OLD Brasil" className="h-12 w-auto" />
            <div className="overflow-hidden">
              <h2 className="font-bold text-xl text-white whitespace-nowrap">
                OLD BRASIL
              </h2>
              <p className="text-xs text-slate-400">
                CRM Profissional
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <img src={oldLogo} alt="OLD" className="h-10 w-auto animate-pulse" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className={`relative z-10 ${open ? 'px-3' : 'px-2'}`}>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
            Menu principal
            {open && (
              <span className="text-[10px] text-sidebar-foreground/50 normal-case">
                Arraste para reordenar
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={visibleMenuItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <SidebarMenu>
                  {visibleMenuItems.map((item) => (
                    <SortableMenuItem key={item.id} item={item} open={open} onNavigate={handleNavClick} />
                  ))}
                </SidebarMenu>
              </SortableContext>
            </DndContext>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu Admin - Não ordenável */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs font-semibold uppercase tracking-wider">Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={gerenciarLojaItem.url}
                      className={({ isActive }) =>
                        `group relative overflow-hidden rounded-lg mb-1 px-2 py-2 transition-all duration-200 ${
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-crm-hover"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <gerenciarLojaItem.icon className="h-5 w-5 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground transition-colors" />
                      {open && (
                        <span className="font-medium transition-colors whitespace-nowrap">
                          {gerenciarLojaItem.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/gerenciar-equipe"
                      className={({ isActive }) =>
                        `group relative overflow-hidden rounded-lg mb-1 px-2 py-2 transition-all duration-200 ${
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-crm-hover"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <Users className="h-5 w-5 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground transition-colors" />
                      {open && (
                        <span className="font-medium transition-colors whitespace-nowrap">
                          Gerenciar Equipe
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/administracao"
                      className={({ isActive }) =>
                        `group relative overflow-hidden rounded-lg mb-1 px-2 py-2 transition-all duration-200 ${
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-crm-hover"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <Shield className="h-5 w-5 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground transition-colors" />
                      {open && (
                        <span className="font-medium transition-colors whitespace-nowrap">
                          Administração
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="relative z-10 p-4 border-t border-sidebar-border bg-sidebar/80">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {open && <span className="ml-2 whitespace-nowrap">Sair</span>}
        </Button>
      </SidebarFooter>

      <div className="absolute top-4 -right-3">
        <SidebarTrigger />
      </div>
    </Sidebar>
  );
}
