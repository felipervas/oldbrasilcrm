import { lazy } from 'react';

// Lazy loading das páginas para code splitting
export const Dashboard = lazy(() => import('./Dashboard'));
export const Clientes = lazy(() => import('./Clientes'));
export const Produtos = lazy(() => import('./Produtos'));
export const Pedidos = lazy(() => import('./Pedidos'));
export const Prospects = lazy(() => import('./Prospects'));
export const Tarefas = lazy(() => import('./Tarefas'));
export const GestorDashboard = lazy(() => import('./GestorDashboard'));
export const PerformanceVendas = lazy(() => import('./PerformanceVendas'));
export const Catalogos = lazy(() => import('./Catalogos'));
export const Marcas = lazy(() => import('./Marcas'));
export const MarcaDetalhes = lazy(() => import('./MarcaDetalhes'));
export const TabelasPrecos = lazy(() => import('./TabelasPrecos'));
export const Receitas = lazy(() => import('./Receitas'));
export const EstoqueAmostras = lazy(() => import('./EstoqueAmostras'));
export const GerenciarEquipe = lazy(() => import('./GerenciarEquipe'));
export const Administracao = lazy(() => import('./Administracao'));
export const ColaboradorPerfil = lazy(() => import('./ColaboradorPerfil'));
export const ColaboradorRelatorioDiario = lazy(() => import('./ColaboradorRelatorioDiario'));
export const RotasPlanejar = lazy(() => import('./RotasPlanejar'));
export const LancarPedido = lazy(() => import('./LancarPedido'));
export const EditarPedido = lazy(() => import('./EditarPedido'));
export const MeuPerfil = lazy(() => import('./MeuPerfil'));
export const GerenciarLoja = lazy(() => import('./GerenciarLoja'));
export const LeadsLoja = lazy(() => import('./LeadsLoja'));
