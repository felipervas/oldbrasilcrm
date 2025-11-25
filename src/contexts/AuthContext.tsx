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

    // Listener para mudanças de autenticação - apenas atualiza estado
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    // Verificar sessão existente ao inicializar
    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
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

  useEffect(() => {
    let mounted = true;

    const loadRoles = async () => {
      if (!user) {
        setRoles([]);
        setIsAdmin(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (!mounted) return;

        const userRoles = data?.map((r) => r.role) || [];
        setRoles(userRoles);
        setIsAdmin(userRoles.includes('admin'));
      } catch (error) {
        console.error('Erro ao carregar roles do usuário:', error);
        if (mounted) {
          setRoles([]);
          setIsAdmin(false);
        }
      }
    };

    loadRoles();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

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
