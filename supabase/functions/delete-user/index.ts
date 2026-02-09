import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json()
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Verificar autenticação e permissão
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Erro de autenticação:', authError)
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()
    
    if (!roleData) {
      console.error('Usuário não é admin')
      return new Response(
        JSON.stringify({ error: 'Sem permissão de administrador' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Deletando usuário:', userId)
    
    // Deletar dados relacionados primeiro (ordem importa por FK constraints)
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
    console.log('Roles deletadas')
    
    // Deletar referências em outras tabelas
    await supabaseAdmin.from('colaborador_eventos').delete().eq('colaborador_id', userId)
    await supabaseAdmin.from('historico_equipe').delete().eq('user_id', userId)
    
    // Limpar audit_log (FK audit_log_user_id_fkey)
    await supabaseAdmin.from('audit_log').update({ user_id: null }).eq('user_id', userId)
    console.log('Audit log limpo')
    
    // Limpar comentários
    await supabaseAdmin.from('comentarios').delete().eq('usuario_id', userId)
    
    // Limpar referências em outras tabelas (set null onde possível)
    await supabaseAdmin.from('clientes').update({ responsavel_id: null }).eq('responsavel_id', userId)
    await supabaseAdmin.from('interacoes').delete().eq('usuario_id', userId)
    await supabaseAdmin.from('tarefas').update({ responsavel_id: null }).eq('responsavel_id', userId)
    await supabaseAdmin.from('tarefas').update({ realizada_por_id: null }).eq('realizada_por_id', userId)
    await supabaseAdmin.from('prospect_interacoes').delete().eq('usuario_id', userId)
    await supabaseAdmin.from('prospect_visitas').delete().eq('responsavel_id', userId)
    await supabaseAdmin.from('prospects').update({ responsavel_id: null }).eq('responsavel_id', userId)
    await supabaseAdmin.from('prospects').update({ criado_por_id: null }).eq('criado_por_id', userId)
    await supabaseAdmin.from('financeiro').delete().eq('usuario_id', userId)
    await supabaseAdmin.from('receitas').delete().eq('usuario_id', userId)
    await supabaseAdmin.from('loja_audit_log').update({ user_id: null }).eq('user_id', userId)
    
    // Deletar perfil (FK para auth.users)
    await supabaseAdmin.from('profiles').delete().eq('id', userId)
    console.log('Perfil e referências deletados')
    
    // Deletar usuário do auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Erro ao deletar usuário:', deleteError)
      throw deleteError
    }
    
    console.log('Usuário deletado')
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Erro geral:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
