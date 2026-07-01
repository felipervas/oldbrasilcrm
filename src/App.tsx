import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Index"));
const Pedidos = lazy(() => import("./pages/Pedidos"));
const PedidoForm = lazy(() => import("./pages/PedidoForm"));
const PedidoDetalhe = lazy(() => import("./pages/PedidoDetalhe"));
const PedidoImprimir = lazy(() => import("./pages/PedidoImprimir"));
const PedidoVoz = lazy(() => import("./pages/PedidoVoz"));
const Clientes = lazy(() => import("./pages/Clientes"));
const ClienteDetalhe = lazy(() => import("./pages/ClienteDetalhe"));
const Catalogo = lazy(() => import("./pages/Catalogo"));
const Perfil = lazy(() => import("./pages/Perfil"));
const WhatsAppTemplates = lazy(() => import("./pages/WhatsAppTemplates"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const OportunidadeForm = lazy(() => import("./pages/OportunidadeForm"));
const OportunidadeDetalhe = lazy(() => import("./pages/OportunidadeDetalhe"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const RelatorioSemanal = lazy(() => import("./pages/RelatorioSemanal"));
const GuardiaoFunil = lazy(() => import("./pages/GuardiaoFunil"));
const HoraRecomprar = lazy(() => import("./pages/HoraRecomprar"));
const ResumoDia = lazy(() => import("./pages/ResumoDia"));
const Agagel = lazy(() => import("./pages/Agagel"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Produtos = lazy(() => import("./pages/Produtos"));
const Equipe = lazy(() => import("./pages/Equipe"));
const Vendas = lazy(() => import("./pages/Vendas"));
const Playbook = lazy(() => import("./pages/Playbook"));
const Comissoes = lazy(() => import("./pages/Comissoes"));
const Importar = lazy(() => import("./pages/Importar"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min: não rebusca o mesmo dado a cada navegação
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false, // não recarregar tudo só por trocar de aba
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><AppLayout><Pipeline /></AppLayout></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><AppLayout><Agenda /></AppLayout></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute><AppLayout><Relatorios /></AppLayout></ProtectedRoute>} />
            <Route path="/relatorio-semanal" element={<ProtectedRoute><AppLayout><RelatorioSemanal /></AppLayout></ProtectedRoute>} />
            <Route path="/guardiao" element={<ProtectedRoute><AppLayout><GuardiaoFunil /></AppLayout></ProtectedRoute>} />
            <Route path="/recompra" element={<ProtectedRoute><AppLayout><HoraRecomprar /></AppLayout></ProtectedRoute>} />
            <Route path="/bom-dia" element={<ProtectedRoute><AppLayout><ResumoDia /></AppLayout></ProtectedRoute>} />
            <Route path="/agagel" element={<ProtectedRoute><AppLayout><Agagel /></AppLayout></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><AppLayout><Configuracoes /></AppLayout></ProtectedRoute>} />
            <Route path="/oportunidades/nova" element={<ProtectedRoute><AppLayout><OportunidadeForm /></AppLayout></ProtectedRoute>} />
            <Route path="/oportunidades/:id" element={<ProtectedRoute><AppLayout><OportunidadeDetalhe /></AppLayout></ProtectedRoute>} />
            <Route path="/oportunidades/:id/edit" element={<ProtectedRoute><AppLayout><OportunidadeForm /></AppLayout></ProtectedRoute>} />
            <Route path="/pedidos" element={<ProtectedRoute><AppLayout><Pedidos /></AppLayout></ProtectedRoute>} />
            <Route path="/pedidos/novo" element={<ProtectedRoute><AppLayout><PedidoForm /></AppLayout></ProtectedRoute>} />
            <Route path="/pedidos/voz" element={<ProtectedRoute><AppLayout><PedidoVoz /></AppLayout></ProtectedRoute>} />
            <Route path="/pedidos/:id" element={<ProtectedRoute><AppLayout><PedidoDetalhe /></AppLayout></ProtectedRoute>} />
            <Route path="/pedidos/:id/imprimir" element={<ProtectedRoute><PedidoImprimir /></ProtectedRoute>} />
            <Route path="/pedidos/:id/edit" element={<ProtectedRoute><AppLayout><PedidoForm /></AppLayout></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><AppLayout><Clientes /></AppLayout></ProtectedRoute>} />
            <Route path="/clientes/:id" element={<ProtectedRoute><AppLayout><ClienteDetalhe /></AppLayout></ProtectedRoute>} />
            <Route path="/catalogo" element={<ProtectedRoute><AppLayout><Catalogo /></AppLayout></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><AppLayout><Produtos /></AppLayout></ProtectedRoute>} />
            <Route path="/rotas" element={<Navigate to="/agenda" replace />} />
            <Route path="/equipe" element={<ProtectedRoute><AppLayout><Equipe /></AppLayout></ProtectedRoute>} />
            <Route path="/vendas" element={<ProtectedRoute><AppLayout><Vendas /></AppLayout></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><AppLayout><Perfil /></AppLayout></ProtectedRoute>} />
            <Route path="/perfil/whatsapp-templates" element={<ProtectedRoute><AppLayout><WhatsAppTemplates /></AppLayout></ProtectedRoute>} />
            <Route path="/playbook" element={<ProtectedRoute><AppLayout><Playbook /></AppLayout></ProtectedRoute>} />
            <Route path="/comissoes" element={<ProtectedRoute><AppLayout><Comissoes /></AppLayout></ProtectedRoute>} />
            <Route path="/importar" element={<ProtectedRoute><AppLayout><Importar /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
