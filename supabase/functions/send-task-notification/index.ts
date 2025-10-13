import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tarefa_id, responsavel_id, titulo, cliente_id, data_prevista, tipo } = await req.json();

    console.log("Processando notificação para tarefa:", tarefa_id);

    // Buscar dados do responsável
    const { data: responsavel } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", responsavel_id)
      .single();

    // Buscar dados do cliente
    const { data: cliente } = await supabase
      .from("clientes")
      .select("nome_fantasia")
      .eq("id", cliente_id)
      .single();

    // Buscar email e telefone do usuário
    const { data: { user } } = await supabase.auth.admin.getUserById(responsavel_id);

    if (!user || !responsavel || !cliente) {
      throw new Error("Dados incompletos para envio de notificação");
    }

    console.log("Enviando notificação para:", user.email);

    // Por enquanto, apenas retornar link do WhatsApp
    // O email será implementado quando o RESEND_API_KEY estiver configurado
    const whatsappMessage = encodeURIComponent(
      `🔔 Nova Tarefa!\n\n` +
      `Título: ${titulo}\n` +
      `Cliente: ${cliente.nome_fantasia}\n` +
      `Tipo: ${tipo === 'visitar' ? 'Visita' : 'Ligação'}\n` +
      `${data_prevista ? `Data: ${new Date(data_prevista).toLocaleDateString('pt-BR')}\n` : ''}` +
      `\nAcesse o sistema para mais detalhes.`
    );
    
    // Assumindo formato brasileiro de telefone
    const telefone = user.user_metadata?.telefone || user.phone || "";
    const whatsappUrl = telefone ? `https://wa.me/${telefone.replace(/\D/g, '')}?text=${whatsappMessage}` : null;
    
    console.log("Link WhatsApp gerado:", whatsappUrl);
    
    return new Response(JSON.stringify({ 
      message: "Notificação processada com sucesso!",
      whatsappUrl,
      email: user.email
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Erro ao enviar notificação:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
