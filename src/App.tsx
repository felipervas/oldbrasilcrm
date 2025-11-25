import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, Component, ReactNode } from "react";
import AppLayout from "./components/layout/AppLayout";
import { LojaHeader } from "./components/loja/LojaHeader";
import { LojaFooter } from "./components/loja/LojaFooter";
import { WhatsAppButton } from "./components/loja/WhatsAppButton";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

// Lazy load para melhorar performance
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const GestorDashboard = lazy(() => import("./pages/GestorDashboard"));
const ColaboradorPerfil = lazy(() => import("./pages/ColaboradorPerfil"));
const MeuPerfil = lazy(() => import("./pages/MeuPerfil"));
const Administracao = lazy(() => import("./pages/Administracao"));
const Produtos = lazy(() => import("./pages/Produtos"));
const Marcas = lazy(() => import("./pages/Marcas"));
const Catalogos = lazy(() => import("./pages/Catalogos"));
const TabelasPrecos = lazy(() => import("./pages/TabelasPrecos"));
const Receitas = lazy(() => import("./pages/Receitas"));
const Pedidos = lazy(() => import("./pages/Pedidos"));
const LancarPedido = lazy(() => import("./pages/LancarPedido"));
const EditarPedido = lazy(() => import("./pages/EditarPedido"));
const MarcaDetalhes = lazy(() => import("./pages/MarcaDetalhes"));
const EstoqueAmostras = lazy(() => import("./pages/EstoqueAmostras"));
const GerenciarLoja = lazy(() => import("./pages/GerenciarLoja"));
const GerenciarEquipe = lazy(() => import("./pages/GerenciarEquipe"));
const Prospects = lazy(() => import("./pages/Prospects"));
const ColaboradorRelatorioDiario = lazy(() => import("./pages/ColaboradorRelatorioDiario"));
const RotasPlanejar = lazy(() => import("./pages/RotasPlanejar"));
const PerformanceVendas = lazy(() => import("./pages/PerformanceVendas"));
const LeadsLoja = lazy(() => import("./pages/LeadsLoja"));
const VendasHub = lazy(() => import("./pages/VendasHub"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Páginas Públicas da Loja
const LojaHome = lazy(() => import("./pages/loja/LojaHome"));
const ProdutoDetalhes = lazy(() => import("./pages/loja/ProdutoDetalhes"));
const LojaMarcas = lazy(() => import("./pages/loja/LojaMarcas"));
const MarcaProdutos = lazy(() => import("./pages/loja/MarcaProdutos"));
const LojaCatalogos = lazy(() => import("./pages/loja/LojaCatalogos"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Error Boundary para capturar erros de carregamento
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    (async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((reg) => reg.unregister()));
        }

        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }
      } catch (error) {
        console.warn("Erro ao limpar cache no reload forçado:", error);
      } finally {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {
          // alguns modos privativos não permitem
        }

        window.location.reload();
      }
    })();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Erro ao carregar a aplicação
              </h1>
              <p className="text-muted-foreground">
                Detectamos um problema ao carregar a página. Isso pode ser causado por cache desatualizado.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={this.handleReload}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recarregar sem cache
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Se o problema persistir, tente limpar o cache do navegador manualmente
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Rota de Login */}
            <Route path="/login" element={<Login />} />

            {/* Rota Principal - Loja Pública */}
            <Route
              path="/"
              element={
                <div className="min-h-screen flex flex-col">
                  <LojaHeader />
                  <main className="flex-1">
                    <LojaHome />
                  </main>
                  <LojaFooter />
                  <WhatsAppButton />
                </div>
              }
            />
            
            {/* Rotas Públicas da Loja */}
            <Route
              path="/loja"
              element={
                <div className="min-h-screen flex flex-col">
                  <LojaHeader />
                  <main className="flex-1">
                    <LojaHome />
                  </main>
                  <LojaFooter />
                  <WhatsAppButton />
                </div>
              }
            />
            <Route
              path="/loja/produto/:id"
              element={
                <div className="min-h-screen flex flex-col">
                  <LojaHeader />
                  <main className="flex-1">
                    <ProdutoDetalhes />
                  </main>
                  <LojaFooter />
                  <WhatsAppButton />
                </div>
              }
            />
            <Route
              path="/loja/marcas"
              element={
                <div className="min-h-screen flex flex-col">
                  <LojaHeader />
                  <main className="flex-1">
                    <LojaMarcas />
                  </main>
                  <LojaFooter />
                  <WhatsAppButton />
                </div>
              }
            />
            <Route
              path="/loja/marca/:slug"
              element={
                <div className="min-h-screen flex flex-col">
                  <LojaHeader />
                  <main className="flex-1">
                    <MarcaProdutos />
                  </main>
                  <LojaFooter />
                  <WhatsAppButton />
                </div>
              }
            />
            <Route
              path="/loja/catalogos"
              element={
                <div className="min-h-screen flex flex-col">
                  <LojaHeader />
                  <main className="flex-1">
                    <LojaCatalogos />
                  </main>
                  <LojaFooter />
                  <WhatsAppButton />
                </div>
              }
            />

            {/* Rotas Autenticadas - CRM */}
          <Route
            path="/crm"
            element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            }
          />
          <Route
            path="/clientes"
            element={
              <AppLayout>
                <Clientes />
              </AppLayout>
            }
          />
          <Route
            path="/prospects"
            element={
              <AppLayout>
                <VendasHub />
              </AppLayout>
            }
          />
          <Route
            path="/tarefas"
            element={
              <AppLayout>
                <VendasHub />
              </AppLayout>
            }
          />
          <Route
            path="/performance-vendas"
            element={
              <AppLayout>
                <VendasHub />
              </AppLayout>
            }
          />
          <Route
            path="/vendas"
            element={
              <AppLayout>
                <VendasHub />
              </AppLayout>
            }
          />
          <Route
            path="/administracao"
            element={
              <ProtectedAdminRoute>
                <Administracao />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/produtos"
            element={
              <AppLayout>
                <Produtos />
              </AppLayout>
            }
          />
          <Route
            path="/marcas"
            element={
              <AppLayout>
                <Marcas />
              </AppLayout>
            }
          />
          <Route
            path="/marcas/:id"
            element={
              <AppLayout>
                <MarcaDetalhes />
              </AppLayout>
            }
          />
          <Route
            path="/catalogos"
            element={
              <AppLayout>
                <Catalogos />
              </AppLayout>
            }
          />
          <Route
            path="/tabelas-precos"
            element={
              <AppLayout>
                <TabelasPrecos />
              </AppLayout>
            }
          />
          <Route
            path="/receitas"
            element={
              <AppLayout>
                <Receitas />
              </AppLayout>
            }
          />
          <Route
            path="/pedidos"
            element={
              <AppLayout>
                <Pedidos />
              </AppLayout>
            }
          />
          <Route
            path="/lancar-pedido"
            element={
              <AppLayout>
                <LancarPedido />
              </AppLayout>
            }
          />
          <Route
            path="/pedidos/:id/editar"
            element={
              <AppLayout>
                <EditarPedido />
              </AppLayout>
            }
          />
          <Route
            path="/estoque-amostras"
            element={
              <AppLayout>
                <EstoqueAmostras />
              </AppLayout>
            }
          />
          <Route
            path="/gestor/dashboard"
            element={
              <AppLayout>
                <GestorDashboard />
              </AppLayout>
            }
          />
          <Route
            path="/gestor/dashboard"
            element={
              <AppLayout>
                <GestorDashboard />
              </AppLayout>
            }
          />
          <Route
            path="/colaborador/:id"
            element={
              <AppLayout>
                <ColaboradorPerfil />
              </AppLayout>
            }
          />
          <Route
            path="/meu-perfil"
            element={
              <AppLayout>
                <MeuPerfil />
              </AppLayout>
            }
          />
          <Route
            path="/gerenciar-loja"
            element={
              <ProtectedAdminRoute>
                <GerenciarLoja />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/gerenciar-equipe"
            element={
              <ProtectedAdminRoute>
                <GerenciarEquipe />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/prospects"
            element={
              <AppLayout>
                <Prospects />
              </AppLayout>
            }
          />
          <Route
            path="/meu-dia"
            element={
              <AppLayout>
                <ColaboradorRelatorioDiario />
              </AppLayout>
            }
          />
          <Route
            path="/rotas/planejar"
            element={
              <AppLayout>
                <RotasPlanejar />
              </AppLayout>
            }
          />
          <Route
            path="/leads-loja"
            element={
              <AppLayout>
                <LeadsLoja />
              </AppLayout>
            }
          />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
