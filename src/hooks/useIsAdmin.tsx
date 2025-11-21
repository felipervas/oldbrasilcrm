import { useAuth } from '@/contexts/AuthContext';

export const useIsAdmin = () => {
  const { isAdmin, loading } = useAuth();
  
  return {
    data: isAdmin,
    isLoading: loading,
  };
};
