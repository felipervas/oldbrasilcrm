import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import AppLayout from "./components/layout/AppLayout";

// Lazy load para melhorar performance
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const Gestor = lazy(() => import("./pages/Gestor"));
const GestorDashboard = lazy(() => import("./pages/GestorDashboard"));
const ColaboradorPerfil = lazy(() => import("./pages/ColaboradorPerfil"));
const Interacoes = lazy(() => import("./pages/Interacoes"));
const Colaboradores = lazy(() => import("./pages/Colaboradores"));
const Produtos = lazy(() => import("./pages/Produtos"));
const Marcas = lazy(() => import("./pages/Marcas"));
const Catalogos = lazy(() => import("./pages/Catalogos"));
const Pedidos = lazy(() => import("./pages/Pedidos"));
const LancarPedido = lazy(() => import("./pages/LancarPedido"));
const EditarPedido = lazy(() => import("./pages/EditarPedido"));
const MarcaDetalhes = lazy(() => import("./pages/MarcaDetalhes"));
const EstoqueAmostras = lazy(() => import("./pages/EstoqueAmostras"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
            <Route path="/login" element={<Login />} />
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
            path="/gestor"
            element={
              <AppLayout>
                <Gestor />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
