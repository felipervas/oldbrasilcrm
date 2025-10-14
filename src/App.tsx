import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Tarefas from "./pages/Tarefas";
import Interacoes from "./pages/Interacoes";
import Colaboradores from "./pages/Colaboradores";
import Produtos from "./pages/Produtos";
import Marcas from "./pages/Marcas";
import Catalogos from "./pages/Catalogos";
import Pedidos from "./pages/Pedidos";
import LancarPedido from "./pages/LancarPedido";
import EstoqueAmostras from "./pages/EstoqueAmostras";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            path="/estoque-amostras"
            element={
              <AppLayout>
                <EstoqueAmostras />
              </AppLayout>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
