import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  roles: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    // Configurar listener PRIMEIRO
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (newSession?.user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', newSession.user.id);
        
        if (mounted) {
          const userRoles = data?.map(r => r.role) || [];
          setRoles(userRoles);
          setIsAdmin(userRoles.includes('admin'));
        }
      } else {
        if (mounted) {
          setRoles([]);
          setIsAdmin(false);
        }
      }
    });

    // DEPOIS verificar sessão existente
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted) return;
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentSession.user.id);
        
        if (mounted) {
          const userRoles = data?.map(r => r.role) || [];
          setRoles(userRoles);
          setIsAdmin(userRoles.includes('admin'));
        }
      }
      
      if (mounted) {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Erro ao carregar sessão:', error);
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, roles }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
