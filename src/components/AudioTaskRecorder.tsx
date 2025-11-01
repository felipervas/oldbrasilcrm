import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AudioTaskRecorderProps {
  tipo: 'tarefa' | 'visita';
  onSuccess: (dados: any) => void;
}

export const AudioTaskRecorder = ({ tipo, onSuccess }: AudioTaskRecorderProps) => {
  const [open, setOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: 'Erro ao acessar microfone',
        description: 'Permita o acesso ao microfone para gravar',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Converter blob para base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });

      // Processar com edge function
      const { data, error } = await supabase.functions.invoke('process-audio-task', {
        body: { audio: base64Audio, tipo },
      });

      if (error) throw error;

      toast({
        title: '✅ Áudio processado!',
        description: `${tipo === 'tarefa' ? 'Tarefa' : 'Visita'} criada com sucesso`,
      });

      onSuccess(data);
      setOpen(false);
    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      toast({
        title: 'Erro ao processar áudio',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Mic className="h-4 w-4 mr-2" />
        {tipo === 'tarefa' ? 'Gravar Tarefa' : 'Gravar Visita'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Gravar {tipo === 'tarefa' ? 'Tarefa' : 'Visita'} com Áudio
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-8">
            {!isRecording && !isProcessing && (
              <Button
                size="lg"
                onClick={startRecording}
                className="h-24 w-24 rounded-full"
              >
                <Mic className="h-8 w-8" />
              </Button>
            )}

            {isRecording && (
              <>
                <div className="animate-pulse">
                  <div className="h-24 w-24 rounded-full bg-red-500 flex items-center justify-center">
                    <Mic className="h-8 w-8 text-white" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Gravando...</p>
                <Button onClick={stopRecording} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Parar Gravação
                </Button>
              </>
            )}

            {isProcessing && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Processando áudio com IA...
                </p>
              </>
            )}

            {!isRecording && !isProcessing && (
              <p className="text-xs text-center text-muted-foreground max-w-xs">
                {tipo === 'tarefa' 
                  ? 'Grave sua tarefa descrevendo o que precisa fazer, a prioridade e quando deve ser concluída.'
                  : 'Grave os detalhes da visita: nome do cliente, data, horário e observações.'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
