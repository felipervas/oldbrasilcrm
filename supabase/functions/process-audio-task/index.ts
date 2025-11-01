import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, tipo } = await req.json();
    
    if (!audio) {
      throw new Error('Áudio não fornecido');
    }

    console.log('🎤 Processando áudio para:', tipo);

    // Decodificar base64 em chunks para evitar problemas de memória
    const processBase64 = (base64: string) => {
      const chunks: Uint8Array[] = [];
      const chunkSize = 32768;
      let position = 0;
      
      while (position < base64.length) {
        const chunk = base64.slice(position, position + chunkSize);
        const binaryChunk = atob(chunk);
        const bytes = new Uint8Array(binaryChunk.length);
        
        for (let i = 0; i < binaryChunk.length; i++) {
          bytes[i] = binaryChunk.charCodeAt(i);
        }
        
        chunks.push(bytes);
        position += chunkSize;
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    };

    const binaryAudio = processBase64(audio);
    
    // Transcrever áudio usando Whisper
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    console.log('📝 Transcrevendo áudio...');
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      throw new Error(`Erro na transcrição: ${await transcriptionResponse.text()}`);
    }

    const { text } = await transcriptionResponse.json();
    console.log('✅ Transcrição:', text);

    // Processar com IA para extrair informações
    const systemPrompt = tipo === 'tarefa' 
      ? `Você é um assistente que extrai informações de tarefas de áudio. 
         Extraia: título da tarefa, descrição detalhada, prioridade (alta/media/baixa), e data prevista se mencionada.
         Retorne APENAS JSON válido no formato: {"titulo": "...", "descricao": "...", "prioridade": "...", "data_prevista": "YYYY-MM-DD ou null"}`
      : `Você é um assistente que extrai informações de visitas de áudio.
         Extraia: nome do cliente/empresa, data da visita, horário, observações.
         Retorne APENAS JSON válido no formato: {"cliente": "...", "data": "YYYY-MM-DD", "horario": "HH:MM", "observacoes": "..."}`;

    console.log('🤖 Processando com IA...');
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Erro na IA: ${await aiResponse.text()}`);
    }

    const aiResult = await aiResponse.json();
    const extractedData = JSON.parse(aiResult.choices[0].message.content);
    
    console.log('✅ Dados extraídos:', extractedData);

    return new Response(
      JSON.stringify({ 
        transcricao: text,
        dados: extractedData,
        tipo 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao processar áudio' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
