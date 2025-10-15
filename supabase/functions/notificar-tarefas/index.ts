import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = resendKey ? new Resend(resendKey) : null;

    // Buscar tarefas que devem ser notificadas (data/hora chegou e notificação não foi enviada)
    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];
    const horaAgora = agora.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    const { data: tarefas, error: tarefasError } = await supabase
      .from("tarefas")
      .select(`
        *,
        clientes(nome_fantasia),
        profiles(nome, id)
      `)
      .eq("status", "pendente")
      .eq("notificacao_enviada", false)
      .lte("data_prevista", dataHoje)
      .not("responsavel_id", "is", null);

    if (tarefasError) throw tarefasError;

    if (!tarefas || tarefas.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma tarefa para notificar" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filtrar tarefas cujo horário já chegou
    const tarefasParaNotificar = tarefas.filter(tarefa => {
      if (!tarefa.horario) return true; // Se não tem horário, notifica pela data
      
      const [horaT, minT] = tarefa.horario.split(':');
      const [horaA, minA] = horaAgora.split(':');
      
      // Se a data é hoje e o horário já passou
      if (tarefa.data_prevista === dataHoje) {
        return (parseInt(horaT) < parseInt(horaA)) || 
               (parseInt(horaT) === parseInt(horaA) && parseInt(minT) <= parseInt(minA));
      }
      
      // Se a data já passou
      return tarefa.data_prevista < dataHoje;
    });

    console.log(`Encontradas ${tarefasParaNotificar.length} tarefas para notificar`);

    // Buscar emails dos responsáveis
    const responsaveisIds = [...new Set(tarefasParaNotificar.map(t => t.responsavel_id))];
    const { data: users } = await supabase.auth.admin.listUsers();
    const emailMap = new Map(users?.users.map(u => [u.id, u.email]) || []);

    const notificacoesEnviadas = [];

    for (const tarefa of tarefasParaNotificar) {
      const email = emailMap.get(tarefa.responsavel_id);
      
      if (email && resend) {
        try {
          // Enviar email
          await resend.emails.send({
            from: "CRM Old Brasil <onboarding@resend.dev>",
            to: [email],
            subject: `🔔 Tarefa Agendada: ${tarefa.titulo}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Olá ${tarefa.profiles?.nome || 'Colaborador'}!</h2>
                <p style="color: #666; font-size: 16px;">Você tem uma tarefa agendada:</p>
                
                <div style="background: #f5f5f5; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #333;">${tarefa.titulo}</h3>
                  <p style="margin: 5px 0; color: #666;">
                    <strong>Cliente:</strong> ${tarefa.clientes?.nome_fantasia || 'N/A'}
                  </p>
                  <p style="margin: 5px 0; color: #666;">
                    <strong>Tipo:</strong> ${tarefa.tipo === 'visitar' ? '🏢 Visita' : '📞 Ligação'}
                  </p>
                  ${tarefa.data_prevista ? `<p style="margin: 5px 0; color: #666;">
                    <strong>Data:</strong> ${new Date(tarefa.data_prevista).toLocaleDateString('pt-BR')}
                    ${tarefa.horario ? `às ${tarefa.horario}` : ''}
                  </p>` : ''}
                  ${tarefa.descricao ? `<p style="margin: 10px 0 0 0; color: #666;">
                    <strong>Descrição:</strong><br/>${tarefa.descricao}
                  </p>` : ''}
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Acesse o sistema para marcar como concluída.
                </p>
              </div>
            `,
          });
          
          console.log(`Email enviado para ${email} - Tarefa: ${tarefa.titulo}`);
        } catch (emailError) {
          console.error(`Erro ao enviar email para ${email}:`, emailError);
        }
      }

      // Marcar tarefa como notificada
      await supabase
        .from("tarefas")
        .update({ notificacao_enviada: true })
        .eq("id", tarefa.id);

      notificacoesEnviadas.push({
        tarefa_id: tarefa.id,
        titulo: tarefa.titulo,
        responsavel: tarefa.profiles?.nome,
        email: email || "não disponível",
      });
    }

    return new Response(
      JSON.stringify({
        message: `${notificacoesEnviadas.length} notificações enviadas`,
        notificacoes: notificacoesEnviadas,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});