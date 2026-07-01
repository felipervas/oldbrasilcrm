import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "gestor" | "vendedor";
export type ProfileRole = "vendedor" | "gerente" | "secretaria";

/**
 * Papel do usuário. Usado em ~17 telas — por isso é cacheado com React Query:
 * busca UMA vez por usuário e compartilha o resultado entre todas as telas,
 * em vez de refazer 2 consultas a cada montagem/navegação. O papel quase nunca
 * muda, então um staleTime alto evita rebuscas desnecessárias.
 */
export function useUserRole() {
  const { user } = useAuth();
  const uid = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["user-role", uid],
    enabled: !!uid,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [{ data: rolesData }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid!),
        supabase.from("profiles").select("role").eq("user_id", uid!).maybeSingle(),
      ]);
      const roles = (rolesData ?? []).map((r: any) => r.role as AppRole);
      const pr = (profile as any)?.role as ProfileRole | undefined;
      const profileRole: ProfileRole =
        pr === "vendedor" || pr === "gerente" || pr === "secretaria" ? pr : "vendedor";
      return { roles, profileRole };
    },
  });

  const roles = data?.roles ?? [];
  const profileRole = data?.profileRole ?? "vendedor";
  const loading = !!uid && isLoading;

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole("admin");
  const isGestor = hasRole("gestor");
  const isAdminOrGestor = isAdmin || isGestor;
  const isSecretaria = profileRole === "secretaria";
  const isGerente = profileRole === "gerente" || isAdminOrGestor;
  // Pode "registrar como" outro vendedor (secretária ou gerente)
  const canActAsOther = isSecretaria || isGerente;

  return {
    roles,
    profileRole,
    loading,
    hasRole,
    isAdmin,
    isGestor,
    isAdminOrGestor,
    isSecretaria,
    isGerente,
    canActAsOther,
  };
}
