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

function SortableMenuItem({ item, showText }: { item: typeof defaultMenuItems[0]; showText: boolean }) {
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
            className={({ isActive }) =>
              `group relative overflow-hidden rounded-xl mb-1 transition-all duration-300 hover:bg-white/10 hover:shadow-lg ${
                isActive
                  ? "bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(217_91%_60%)] shadow-xl text-white"
                  : "text-white/70"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(262_83%_58%)]/20 to-[hsl(217_91%_60%)]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <item.icon className={`h-4 w-4 transition-colors ${isActive ? "text-white scale-110" : "text-white/70 group-hover:text-white group-hover:scale-110"}`} />
                
                {showText && (
                  <span className={`font-medium transition-colors ${isActive ? "text-white" : "text-white/70 group-hover:text-white"}`}>
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
  
  // No mobile, sempre mostrar texto quando aberto
  const showText = isMobile ? true : open;
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
      className={`relative overflow-hidden bg-gradient-to-b from-[hsl(262_90%_15%)] to-[hsl(217_91%_20%)] border-r border-white/10 ${isMobile ? "w-[280px]" : (open ? "w-64" : "w-16")}`}
      collapsible={isMobile ? "offcanvas" : "icon"}>
      {/* Background Pattern Sutil */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(262_83%_58%)] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[hsl(217_91%_60%)] rounded-full blur-3xl" />
      </div>
      
      <SidebarHeader className="relative z-10 p-6 border-b border-white/10">
        {open && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={oldLogo} alt="OLD Brasil" className="h-10 w-auto" />
              {/* Glow Effect */}
              <div className="absolute -inset-2 bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(217_91%_60%)] rounded-full blur opacity-40" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-black text-lg text-white whitespace-nowrap animate-fade-in">
                OLD BRASIL
              </h2>
              <p className="text-xs text-white/70 animate-fade-in">
                CRM Profissional
              </p>
            </div>
          </div>
        )}
        {!open && !isMobile && (
          <div className="flex items-center justify-center mx-auto relative">
            <img src={oldLogo} alt="OLD" className="h-8 w-auto" />
            <div className="absolute -inset-2 bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(217_91%_60%)] rounded-full blur opacity-40" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="relative z-10 px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/70 text-xs font-semibold uppercase tracking-wider">Menu Principal</SidebarGroupLabel>
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
                    <SortableMenuItem key={item.id} item={item} showText={showText} />
                  ))}
                </SidebarMenu>
              </SortableContext>
            </DndContext>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu Admin - Não ordenável */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-white/70 text-xs font-semibold uppercase tracking-wider">Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="group relative overflow-hidden rounded-xl mb-1 transition-all duration-300 hover:bg-white/10 hover:shadow-lg data-[active=true]:bg-gradient-to-r data-[active=true]:from-[hsl(262_83%_58%)] data-[active=true]:to-[hsl(217_91%_60%)] data-[active=true]:shadow-xl">
                    <NavLink to={gerenciarLojaItem.url}>
                      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(262_83%_58%)]/20 to-[hsl(217_91%_60%)]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <gerenciarLojaItem.icon className="h-4 w-4 text-white/70 group-hover:text-white transition-colors" />
                      {showText && <span className="text-white/70 group-hover:text-white font-medium transition-colors">{gerenciarLojaItem.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="group relative overflow-hidden rounded-xl mb-1 transition-all duration-300 hover:bg-white/10 hover:shadow-lg data-[active=true]:bg-gradient-to-r data-[active=true]:from-[hsl(262_83%_58%)] data-[active=true]:to-[hsl(217_91%_60%)] data-[active=true]:shadow-xl">
                    <NavLink to="/gerenciar-equipe">
                      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(262_83%_58%)]/20 to-[hsl(217_91%_60%)]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Users className="h-4 w-4 text-white/70 group-hover:text-white transition-colors" />
                      {showText && <span className="text-white/70 group-hover:text-white font-medium transition-colors">Gerenciar Equipe</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="group relative overflow-hidden rounded-xl mb-1 transition-all duration-300 hover:bg-white/10 hover:shadow-lg data-[active=true]:bg-gradient-to-r data-[active=true]:from-[hsl(262_83%_58%)] data-[active=true]:to-[hsl(217_91%_60%)] data-[active=true]:shadow-xl">
                    <NavLink to="/administracao">
                      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(262_83%_58%)]/20 to-[hsl(217_91%_60%)]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Shield className="h-4 w-4 text-white/70 group-hover:text-white transition-colors" />
                      {showText && <span className="text-white/70 group-hover:text-white font-medium transition-colors">Administração</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="relative z-10 p-4 border-t border-white/10 bg-white/5 backdrop-blur-sm">
        <Button
          variant="ghost"
          className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {showText && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>

      <div className="absolute top-4 -right-3">
        <SidebarTrigger />
      </div>
    </Sidebar>
  );
}
