import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const AgendasEquipe = () => {
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [selectedColaborador, setSelectedColaborador] = useState<string>('');
  const [eventos, setEventos] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadColaboradores = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome')
        .order('nome');
      
      setColaboradores(data || []);
      if (data && data.length > 0) {
        setSelectedColaborador(data[0].id);
      }
      setIsLoading(false);
    };

    loadColaboradores();
  }, []);

  useEffect(() => {
    if (!selectedColaborador) return;

    const loadEventos = async () => {
      const { data } = await supabase
        .from('colaborador_eventos')
        .select('*')
        .eq('colaborador_id', selectedColaborador)
        .order('data', { ascending: true })
        .order('horario', { ascending: true });
      
      setEventos(data || []);
    };

    loadEventos();
  }, [selectedColaborador]);

  const eventosMes = eventos.filter(evento => {
    const eventoDate = new Date(evento.data);
    return eventoDate.getMonth() === selectedDate.getMonth() &&
           eventoDate.getFullYear() === selectedDate.getFullYear();
  });

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <User className="h-5 w-5 text-muted-foreground" />
        <Select value={selectedColaborador} onValueChange={setSelectedColaborador}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Selecione um colaborador" />
          </SelectTrigger>
          <SelectContent>
            {colaboradores.map((colab) => (
              <SelectItem key={colab.id} value={colab.id}>
                {colab.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Eventos de {format(selectedDate, 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventosMes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Nenhum evento neste mês
                </p>
              ) : (
                eventosMes.map((evento) => (
                  <div
                    key={evento.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{evento.titulo}</h4>
                        {evento.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {evento.descricao}
                          </p>
                        )}
                      </div>
                      <Badge variant={evento.tipo === 'evento' ? 'default' : 'secondary'}>
                        {evento.tipo}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(evento.data), 'dd/MM/yyyy')}
                      </div>
                      {evento.horario && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {evento.horario}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
