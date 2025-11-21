import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'gestor' | 'colaborador';

export const useUserRole = () => {
  const { roles, loading } = useAuth();

  const hasRole = (role: UserRole) => roles.includes(role);
  const isGestor = hasRole('gestor') || hasRole('admin');
  const isAdmin = hasRole('admin');

  return { 
    roles: roles as UserRole[], 
    loading, 
    hasRole, 
    isGestor, 
    isAdmin, 
    refresh: () => {} // Não precisa mais refresh manual
  };
};
