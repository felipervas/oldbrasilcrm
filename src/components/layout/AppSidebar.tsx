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
  SidebarHeader,
  SidebarFooter,
  useSidebar,
  SidebarMenuAction,
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
  Shield,
  Target,
  CalendarDays,
  GripVertical,
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
import { cn } from "@/lib/utils";

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

interface MenuItem {
  id: string;
  title: string;
  url: string;
  icon: any;
  restricted?: boolean;
}

const SortableMenuItem = ({ item, open }: { item: MenuItem; open: boolean }) => {
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
    <SidebarMenuItem ref={setNodeRef} style={style}>
      <SidebarMenuButton asChild>
        <NavLink 
          to={item.url} 
          end
          className={({ isActive }) => 
            `hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
              isActive ? 'bg-sidebar-accent text-sidebar-primary' : ''
            }`
          }
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          {open && <span className="ml-3 font-medium">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
      {open && (
        <SidebarMenuAction {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </SidebarMenuAction>
      )}
    </SidebarMenuItem>
  );
};

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { open, setOpen, isMobile } = useSidebar();
  const isAdmin = useIsAdmin();
  const [sortedMenuItems, setSortedMenuItems] = useState<MenuItem[]>([]);
  const [hasFinanceAccess, setHasFinanceAccess] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    checkFinanceAccess();
    loadMenuOrder();
  }, []);

  const checkFinanceAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('perfil')
      .eq('id', user.id)
      .single();

    setHasFinanceAccess(profile?.perfil === 'admin');
  };

  const loadMenuOrder = () => {
    const savedOrder = localStorage.getItem('menuOrder');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        const ordered = orderIds
          .map((id: string) => defaultMenuItems.find(item => item.id === id))
          .filter(Boolean) as MenuItem[];
        
        const newItems = defaultMenuItems.filter(
          item => !orderIds.includes(item.id)
        );
        
        setSortedMenuItems([...ordered, ...newItems]);
      } catch {
        setSortedMenuItems(defaultMenuItems);
      }
    } else {
      setSortedMenuItems(defaultMenuItems);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSortedMenuItems((items) => {
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
        description: "Não foi possível fazer logout. Tente novamente.",
        variant: "destructive",
      });
    } else {
      navigate("/login");
    }
  };

  const handleNavClick = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <Sidebar
      side="left"
      variant="sidebar"
      collapsible="icon"
      className={cn(
        "border-r border-sidebar-border bg-sidebar-background transition-all duration-300",
        "w-16 data-[state=expanded]:w-64"
      )}
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={oldLogo} alt="OLD BRASIL" className="h-8 w-auto flex-shrink-0" />
          {open && (
            <div className="flex flex-col">
              <span className="font-bold text-sm text-white">OLD BRASIL</span>
              <span className="text-xs text-slate-400">CRM</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 uppercase text-xs font-semibold">
            {open ? "Menu Principal" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedMenuItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <SidebarMenu>
                  {sortedMenuItems.map((item) => (
                    <div key={item.id} onClick={handleNavClick}>
                      <SortableMenuItem item={item} open={open} />
                    </div>
                  ))}
                </SidebarMenu>
              </SortableContext>
            </DndContext>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || hasFinanceAccess) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-400 uppercase text-xs font-semibold">
              {open ? "Gestão" : ""}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem onClick={handleNavClick}>
                  <SidebarMenuButton asChild>
                    <NavLink to="/gerenciar-equipe" className={({ isActive }) => `hover:bg-sidebar-accent ${isActive ? 'bg-sidebar-accent text-sidebar-primary' : ''}`}>
                      <Users className="h-5 w-5 flex-shrink-0" />
                      {open && <span className="ml-3 font-medium">Gerenciar Equipe</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-400 uppercase text-xs font-semibold">
              {open ? "Admin" : ""}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem onClick={handleNavClick}>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" className={({ isActive }) => `hover:bg-sidebar-accent ${isActive ? 'bg-sidebar-accent text-sidebar-primary' : ''}`}>
                      <Shield className="h-5 w-5 flex-shrink-0" />
                      {open && <span className="ml-3 font-medium">Administração</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {open && <span className="ml-3 font-medium">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
