import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import AppLayout from "./components/layout/AppLayout";
import { LojaHeader } from "./components/loja/LojaHeader";
import { LojaFooter } from "./components/loja/LojaFooter";
import { WhatsAppButton } from "./components/loja/WhatsAppButton";

// Lazy load para melhorar performance
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const GestorDashboard = lazy(() => import("./pages/GestorDashboard"));
const ColaboradorPerfil = lazy(() => import("./pages/ColaboradorPerfil"));
const MeuPerfil = lazy(() => import("./pages/MeuPerfil"));
const Interacoes = lazy(() => import("./pages/Interacoes"));
const Colaboradores = lazy(() => import("./pages/Colaboradores"));
const Produtos = lazy(() => import("./pages/Produtos"));
const Marcas = lazy(() => import("./pages/Marcas"));
const Catalogos = lazy(() => import("./pages/Catalogos"));
const Receitas = lazy(() => import("./pages/Receitas"));
const Pedidos = lazy(() => import("./pages/Pedidos"));
const LancarPedido = lazy(() => import("./pages/LancarPedido"));
const EditarPedido = lazy(() => import("./pages/EditarPedido"));
const MarcaDetalhes = lazy(() => import("./pages/MarcaDetalhes"));
const EstoqueAmostras = lazy(() => import("./pages/EstoqueAmostras"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Páginas Públicas da Loja
const LojaHome = lazy(() => import("./pages/loja/LojaHome"));
const ProdutoDetalhes = lazy(() => import("./pages/loja/ProdutoDetalhes"));
const LojaMarcas = lazy(() => import("./pages/loja/LojaMarcas"));
const MarcaProdutos = lazy(() => import("./pages/loja/MarcaProdutos"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos - cache agressivo
      gcTime: 30 * 60 * 1000, // 30 minutos
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Rota de Login */}
            <Route path="/login" element={<Login />} />

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

            {/* Rotas Autenticadas */}
          <Route
            path="/"
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
            path="/interacoes"
            element={
              <AppLayout>
                <Interacoes />
              </AppLayout>
            }
          />
          <Route
            path="/colaboradores"
            element={
              <AppLayout>
                <Colaboradores />
              </AppLayout>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
