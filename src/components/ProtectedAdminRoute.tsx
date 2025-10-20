import { Navigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { ListLoadingSkeleton } from '@/components/LoadingSkeleton';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { data: isAdmin, isLoading } = useIsAdmin();
  
  if (isLoading) {
    return <ListLoadingSkeleton />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/crm" replace />;
  }
  
  return <>{children}</>;
};
