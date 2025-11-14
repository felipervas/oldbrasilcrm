import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import AppLayout from "./components/layout/AppLayout";
import { LojaHeader } from "./components/loja/LojaHeader";
import { LojaFooter } from "./components/loja/LojaFooter";
import { WhatsAppButton } from "./components/loja/WhatsAppButton";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";

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

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
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
            path="/tarefas"
            element={
              <AppLayout>
                <Tarefas />
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
            path="/performance-vendas"
            element={
              <AppLayout>
                <PerformanceVendas />
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
      </BrowserRouter>
    </TooltipProvider>
);

export default App;
