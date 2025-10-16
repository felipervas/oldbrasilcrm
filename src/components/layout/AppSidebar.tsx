import { NavLink, useNavigate } from "react-router-dom";
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
  MessageSquare,
  Package,
  Tag,
  FileText,
  Briefcase,
  LogOut,
  ShoppingCart,
  Boxes,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  { id: "dashboard", title: "Dashboard", url: "/", icon: LayoutDashboard },
  { id: "clientes", title: "Clientes", url: "/clientes", icon: Users },
  { id: "tarefas", title: "Tarefas", url: "/tarefas", icon: CheckSquare },
  { id: "interacoes", title: "Interações", url: "/interacoes", icon: MessageSquare },
  { id: "colaboradores", title: "Equipe", url: "/colaboradores", icon: Users },
  { id: "produtos", title: "Produtos", url: "/produtos", icon: Package },
  { id: "marcas", title: "Marcas", url: "/marcas", icon: Tag },
  { id: "catalogos", title: "Catálogos", url: "/catalogos", icon: FileText },
  { id: "pedidos", title: "Pedidos", url: "/pedidos", icon: ShoppingCart },
  { id: "lancar-pedido", title: "Lançar Pedido", url: "/lancar-pedido", icon: Briefcase },
  { id: "estoque", title: "Estoque & Amostras", url: "/estoque-amostras", icon: Boxes },
  { id: "gestor", title: "Gestor", url: "/gestor", icon: DollarSign, restricted: true },
];

function SortableMenuItem({ item, open }: { item: typeof defaultMenuItems[0]; open: boolean }) {
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
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "hover:bg-sidebar-accent/50"
            }
          >
            <item.icon className="h-4 w-4" />
            {open && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </div>
  );
}

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState(defaultMenuItems);
  const [canViewFinanceiro, setCanViewFinanceiro] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    checkFinanceiroAccess();
    loadMenuOrder();
  }, []);

  const checkFinanceiroAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao buscar roles:', error);
        return;
      }

      const hasGestorRole = roles?.some(r => r.role === 'gestor' || r.role === 'admin');
      setCanViewFinanceiro(hasGestorRole);
    } catch (error) {
      console.error('Erro ao verificar acesso financeiro:', error);
    }
  };

  const loadMenuOrder = () => {
    const saved = localStorage.getItem('menuOrder');
    if (saved) {
      const savedIds = JSON.parse(saved);
      const orderedItems = savedIds
        .map((id: string) => defaultMenuItems.find(item => item.id === id))
        .filter(Boolean);
      setMenuItems(orderedItems as typeof defaultMenuItems);
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

  return (
    <Sidebar className={open ? "w-64" : "w-16"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {open && (
          <div className="flex items-center gap-3">
            <img src={oldLogo} alt="OLD Brasil" className="h-10 w-auto" />
            <div>
              <h2 className="font-bold text-sidebar-foreground text-lg">OLD CRM</h2>
              <p className="text-xs text-sidebar-foreground/60">Gestão Comercial</p>
            </div>
          </div>
        )}
        {!open && (
          <div className="flex items-center justify-center mx-auto">
            <img src={oldLogo} alt="OLD" className="h-8 w-auto" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
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
                    <SortableMenuItem key={item.id} item={item} open={open} />
                  ))}
                </SidebarMenu>
              </SortableContext>
            </DndContext>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {open && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>

      <div className="absolute top-4 -right-3">
        <SidebarTrigger />
      </div>
    </Sidebar>
  );
}
