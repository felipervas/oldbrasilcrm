import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TEMPLATES } from "@/lib/whatsapp";

export interface WhatsAppTemplate {
  id: string;
  user_id: string;
  chave: string;
  titulo: string;
  conteudo: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResolvedTemplate {
  chave: string;
  titulo: string;
  conteudo: string;
  descricao: string;
  ativo: boolean;
  isCustom: boolean;
  id?: string;
}

/**
 * Mescla templates do banco com defaults: se o usuário não customizou,
 * usa o default. Se customizou, usa o do banco.
 */
export function useWhatsAppTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("whatsapp_templates")
      .select("*")
      .eq("user_id", user.id);
    setTemplates((data as WhatsAppTemplate[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  /**
   * Retorna a lista mesclada de templates (customizados + defaults não customizados).
   */
  const resolved: ResolvedTemplate[] = Object.entries(DEFAULT_TEMPLATES).map(([chave, def]) => {
    const custom = templates.find(t => t.chave === chave);
    if (custom) {
      return {
        chave,
        titulo: custom.titulo,
        conteudo: custom.conteudo,
        descricao: custom.descricao ?? def.descricao,
        ativo: custom.ativo,
        isCustom: true,
        id: custom.id,
      };
    }
    return {
      chave,
      titulo: def.titulo,
      conteudo: def.conteudo,
      descricao: def.descricao,
      ativo: true,
      isCustom: false,
    };
  });

  const getByKey = (chave: string): ResolvedTemplate | undefined =>
    resolved.find(t => t.chave === chave);

  /**
   * Salva (upsert) um template para o usuário atual.
   */
  const save = async (chave: string, titulo: string, conteudo: string, descricao?: string) => {
    if (!user) return { error: new Error("Não autenticado") };
    const existing = templates.find(t => t.chave === chave);
    if (existing) {
      const { error } = await (supabase as any)
        .from("whatsapp_templates")
        .update({ titulo, conteudo, descricao })
        .eq("id", existing.id);
      if (!error) await fetch();
      return { error };
    }
    const { error } = await (supabase as any)
      .from("whatsapp_templates")
      .insert({ user_id: user.id, chave, titulo, conteudo, descricao });
    if (!error) await fetch();
    return { error };
  };

  /**
   * Restaura um template ao padrão (remove customização).
   */
  const reset = async (chave: string) => {
    if (!user) return { error: new Error("Não autenticado") };
    const existing = templates.find(t => t.chave === chave);
    if (!existing) return { error: null };
    const { error } = await (supabase as any)
      .from("whatsapp_templates")
      .delete()
      .eq("id", existing.id);
    if (!error) await fetch();
    return { error };
  };

  return { templates: resolved, loading, fetch, save, reset, getByKey };
}
