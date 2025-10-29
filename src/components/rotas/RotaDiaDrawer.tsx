import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Clock } from 'lucide-react';

interface Visita {
  id: string;
  prospect: {
    nome_empresa: string;
    endereco_completo?: string;
  };
  horario_inicio?: string;
  distancia_km?: number;
  tempo_trajeto_min?: number;
  ordem_rota?: number;
}

interface RotaDiaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitas: Visita[];
}

export const RotaDiaDrawer = ({ open, onOpenChange, visitas }: RotaDiaDrawerProps) => {
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

  const handleAbrirRotaWaze = () => {
    const enderecos = visitasOrdenadas
      .map((v) => v.prospect.endereco_completo)
      .filter(Boolean);
    
    if (enderecos.length > 0) {
      // Primeira parada no Waze
      const primeiroEndereco = encodeURIComponent(enderecos[0]!);
      window.open(`https://www.waze.com/ul?q=${primeiroEndereco}&navigate=yes`, '_blank');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Rota do Dia - {visitas.length} visitas
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Resumo da Rota */}
          <div className="bg-accent/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Distância Total:</span>
              <span className="font-semibold">{totalDistancia.toFixed(1)} km</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tempo Estimado:</span>
              <span className="font-semibold">{Math.round(totalTempo)} min</span>
            </div>
          </div>

          {/* Lista de Paradas */}
          <div className="space-y-3">
            <h3 className="font-semibold">Ordem Sugerida:</h3>
            {visitasOrdenadas.map((visita, index) => (
              <div key={visita.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <h4 className="font-semibold">{visita.prospect.nome_empresa}</h4>
                    {visita.horario_inicio && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {visita.horario_inicio}
                      </p>
                    )}
                    {visita.prospect.endereco_completo && (
                      <p className="text-sm text-muted-foreground flex items-start gap-1 mt-2">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{visita.prospect.endereco_completo}</span>
                      </p>
                    )}
                    {(visita.distancia_km || visita.tempo_trajeto_min) && (
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {visita.distancia_km && (
                          <span>📍 {visita.distancia_km.toFixed(1)} km</span>
                        )}
                        {visita.tempo_trajeto_min && (
                          <span>⏱️ {Math.round(visita.tempo_trajeto_min)} min</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ação */}
          <Button onClick={handleAbrirRotaWaze} className="w-full" size="lg">
            <Navigation className="h-4 w-4 mr-2" />
            Abrir Rota no Waze
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
