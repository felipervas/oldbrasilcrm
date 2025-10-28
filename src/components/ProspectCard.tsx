import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, MapPin, User, Calendar } from 'lucide-react';
import { Prospect } from '@/hooks/useProspects';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProspectCardProps {
  prospect: Prospect;
  onClick: () => void;
}

export const ProspectCard = ({ prospect, onClick }: ProspectCardProps) => {
  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'media': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'baixa': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPorteColor = (porte?: string) => {
    switch (porte) {
      case 'Grande': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'Médio': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Pequeno': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: prospect.prioridade === 'alta' ? '#ef4444' : prospect.prioridade === 'media' ? '#eab308' : '#22c55e' }}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <Building2 className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
            <h4 className="font-semibold text-sm line-clamp-2">{prospect.nome_empresa}</h4>
          </div>
          <Badge variant="outline" className={getPrioridadeColor(prospect.prioridade)}>
            {prospect.prioridade}
          </Badge>
        </div>

        {(prospect.cidade || prospect.estado) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{[prospect.cidade, prospect.estado].filter(Boolean).join(', ')}</span>
          </div>
        )}

        {prospect.porte && (
          <Badge variant="outline" className={getPorteColor(prospect.porte)}>
            {prospect.porte}
          </Badge>
        )}

        {prospect.produto_utilizado && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            Produto: {prospect.produto_utilizado}
          </p>
        )}

        {prospect.profiles?.nome && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{prospect.profiles.nome}</span>
          </div>
        )}

        {prospect.data_ultimo_contato && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              Último contato: {format(new Date(prospect.data_ultimo_contato), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
