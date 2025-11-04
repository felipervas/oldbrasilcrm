import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Navigation, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Visita {
  id: string;
  prospect: {
    nome_empresa: string;
    endereco_completo?: string;
    telefone?: string;
  };
  horario_inicio?: string;
  distancia_km?: number;
  tempo_trajeto_min?: number;
  ordem_rota?: number;
  observacoes?: string;
}

interface RoteiroMelhoradoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitas: Visita[];
}

export const RoteiroMelhorado = ({ open, onOpenChange, visitas }: RoteiroMelhoradoProps) => {
  const [visitasConcluidas, setVisitasConcluidas] = useState<Set<string>>(new Set());

  const visitasOrdenadas = [...visitas].sort((a, b) => {
    if (a.ordem_rota && b.ordem_rota) {
      return a.ordem_rota - b.ordem_rota;
    }
    if (a.horario_inicio && b.horario_inicio) {
      return a.horario_inicio.localeCompare(b.horario_inicio);
    }
    return 0;
  });

  const totalDistancia = visitas.reduce((sum, v) => sum + (v.distancia_km || 0), 0);
  const totalTempo = visitas.reduce((sum, v) => sum + (v.tempo_trajeto_min || 0), 0);
  const progresso = (visitasConcluidas.size / visitas.length) * 100;

  const toggleVisita = (visitaId: string) => {
    setVisitasConcluidas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(visitaId)) {
        newSet.delete(visitaId);
      } else {
        newSet.add(visitaId);
      }
      return newSet;
    });
  };

  const handleAbrirRotaWaze = () => {
    const enderecos = visitasOrdenadas
      .map((v) => v.prospect.endereco_completo)
      .filter(Boolean);
    
    if (enderecos.length > 0) {
      const primeiroEndereco = encodeURIComponent(enderecos[0]!);
      window.open(`https://www.waze.com/ul?q=${primeiroEndereco}&navigate=yes`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Navigation className="h-6 w-6 text-primary" />
            Roteiro do Dia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo e Progresso */}
          <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progresso</span>
                <span className="text-sm font-semibold">
                  {visitasConcluidas.size} de {visitas.length} visitas
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Distância Total</span>
                  <span className="font-semibold">{totalDistancia.toFixed(1)} km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tempo Estimado</span>
                  <span className="font-semibold">{Math.round(totalTempo)} min</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Lista de Visitas */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Ordem de Visitas</h3>
            {visitasOrdenadas.map((visita, index) => {
              const isConcluida = visitasConcluidas.has(visita.id);
              return (
                <Card 
                  key={visita.id} 
                  className={`p-4 transition-all ${isConcluida ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isConcluida}
                      onCheckedChange={() => toggleVisita(visita.id)}
                      className="mt-1"
                    />
                    <Badge variant={isConcluida ? "default" : "outline"} className="mt-1">
                      {index + 1}
                    </Badge>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className={`font-semibold ${isConcluida ? 'line-through text-muted-foreground' : ''}`}>
                          {visita.prospect.nome_empresa}
                        </h4>
                        {isConcluida && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      
                      {visita.horario_inicio && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{visita.horario_inicio}</span>
                        </div>
                      )}
                      
                      {visita.prospect.endereco_completo && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{visita.prospect.endereco_completo}</span>
                        </div>
                      )}

                      {visita.prospect.telefone && (
                        <div className="text-sm">
                          <a 
                            href={`https://wa.me/55${visita.prospect.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            📱 {visita.prospect.telefone}
                          </a>
                        </div>
                      )}
                      
                      {(visita.distancia_km || visita.tempo_trajeto_min) && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {visita.distancia_km && (
                            <span>📍 {visita.distancia_km.toFixed(1)} km</span>
                          )}
                          {visita.tempo_trajeto_min && (
                            <span>⏱️ {Math.round(visita.tempo_trajeto_min)} min</span>
                          )}
                        </div>
                      )}

                      {visita.observacoes && (
                        <div className="text-sm text-muted-foreground italic bg-muted/50 p-2 rounded">
                          💬 {visita.observacoes}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Ações */}
          <div className="flex gap-3">
            <Button onClick={handleAbrirRotaWaze} className="flex-1" size="lg">
              <Navigation className="h-4 w-4 mr-2" />
              Abrir no Waze
            </Button>
            <Button 
              onClick={() => setVisitasConcluidas(new Set())} 
              variant="outline"
              disabled={visitasConcluidas.size === 0}
            >
              Limpar Check-list
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
