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
    
    console.log('Listando usuários')
    
    // Buscar profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('nome')
    
    if (profilesError) {
      console.error('Erro ao buscar profiles:', profilesError)
      throw profilesError
    }
    
    console.log(`Profiles encontrados: ${profiles?.length || 0}`)
    
    // Para cada perfil, buscar roles e email
    const members = []
    for (const profile of profiles || []) {
      const { data: rolesData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id)
      
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      
      members.push({
        id: profile.id,
        nome: profile.nome,
        email: userData?.user?.email || 'N/A',
        telefone: profile.telefone,
        roles: rolesData?.map(r => r.role) || [],
        ativo: true
      })
    }
    
    console.log(`Membros processados: ${members.length}`)
    
    return new Response(
      JSON.stringify({ members }),
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
