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

    const { tarefa_id, responsavel_id, titulo, cliente_id, data_prevista, horario, tipo } = await req.json();

    console.log("Processando notificação para tarefa:", tarefa_id);

    // Buscar dados do responsável
    const { data: responsavel } = await supabase
      .from("profiles")
      .select("nome, telefone")
      .eq("id", responsavel_id)
      .single();

    // Buscar dados do cliente
    const { data: cliente } = await supabase
      .from("clientes")
      .select("nome_fantasia")
      .eq("id", cliente_id)
      .single();

    // Buscar email do usuário
    const { data: { user } } = await supabase.auth.admin.getUserById(responsavel_id);

    if (!user || !responsavel || !cliente) {
      throw new Error("Dados incompletos para envio de notificação");
    }

    console.log("Enviando notificação para:", user.email);

    // Formatar data e horário
    const dataFormatada = data_prevista ? new Date(data_prevista).toLocaleDateString('pt-BR') : '';
    const horarioFormatado = horario ? horario.slice(0, 5) : '';

    // Enviar email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && user.email) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Tarefas <onboarding@resend.dev>',
            to: [user.email],
            subject: `🔔 Nova Tarefa: ${titulo}`,
            html: `
              <h2>Nova Tarefa Atribuída</h2>
              <p><strong>Título:</strong> ${titulo}</p>
              <p><strong>Cliente:</strong> ${cliente.nome_fantasia}</p>
              <p><strong>Tipo:</strong> ${tipo === 'visitar' ? 'Visita' : 'Ligação'}</p>
              ${dataFormatada ? `<p><strong>Data:</strong> ${dataFormatada}</p>` : ''}
              ${horarioFormatado ? `<p><strong>Horário:</strong> ${horarioFormatado}</p>` : ''}
              <p>Acesse o sistema para mais detalhes.</p>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error("Erro ao enviar email:", await emailResponse.text());
        } else {
          console.log("Email enviado com sucesso!");
        }
      } catch (emailError) {
        console.error("Erro ao enviar email:", emailError);
      }
    }

    // Criar link do WhatsApp
    const whatsappMessage = encodeURIComponent(
      `🔔 Nova Tarefa!\n\n` +
      `Título: ${titulo}\n` +
      `Cliente: ${cliente.nome_fantasia}\n` +
      `Tipo: ${tipo === 'visitar' ? 'Visita' : 'Ligação'}\n` +
      `${dataFormatada ? `Data: ${dataFormatada}\n` : ''}` +
      `${horarioFormatado ? `Horário: ${horarioFormatado}\n` : ''}` +
      `\nAcesse o sistema para mais detalhes.`
    );
    
    const telefone = responsavel.telefone || user.user_metadata?.telefone || user.phone || "";
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
