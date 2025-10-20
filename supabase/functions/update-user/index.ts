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
    const { userId, nome, telefone, emails, telefones, role } = await req.json()
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Verificar se usuário logado é admin/gestor
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
    
    // Verificar se é admin ou gestor
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'gestor'])
    
    if (!roleData || roleData.length === 0) {
      console.error('Usuário não é admin/gestor')
      return new Response(
        JSON.stringify({ error: 'Sem permissão de administrador/gestor' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Atualizando usuário:', userId)
    
    // Atualizar perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        nome,
        telefone: telefone || null,
        emails: emails || [],
        telefones: telefones || []
      })
      .eq('id', userId)
    
    if (profileError) {
      console.error('Erro ao atualizar perfil:', profileError)
      throw profileError
    }
    
    console.log('Perfil atualizado')
    
    // Atualizar role se fornecida (apenas admin pode fazer isso)
    if (role) {
      const isAdmin = roleData.some(r => r.role === 'admin')
      
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Apenas administradores podem alterar cargos' }), 
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Deletar roles antigas
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
      
      // Inserir nova role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role
        })
      
      if (roleError) {
        console.error('Erro ao atualizar role:', roleError)
        throw roleError
      }
      
      console.log('Role atualizada')
    }
    
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