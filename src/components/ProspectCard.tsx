import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, MapPin, User, Calendar, UserPlus } from 'lucide-react';
import { Prospect } from '@/hooks/useProspects';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProspectCardProps {
  prospect: Prospect;
  onClick: () => void;
  isSelected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  ultimaInteracao?: string;
}

export const ProspectCard = ({ prospect, onClick, isSelected, onSelectChange, ultimaInteracao }: ProspectCardProps) => {
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
      className={`hover:shadow-md transition-all border-l-4 ${isSelected ? 'ring-2 ring-primary shadow-lg' : ''}`}
      style={{ borderLeftColor: prospect.prioridade === 'alta' ? '#ef4444' : prospect.prioridade === 'media' ? '#eab308' : '#22c55e' }}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          {onSelectChange && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectChange}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
          )}
          <div className="flex items-start gap-2 flex-1 cursor-pointer" onClick={onClick}>
            <Building2 className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
            <h4 className="font-semibold text-sm line-clamp-2">{prospect.nome_empresa}</h4>
          </div>
        </div>

        <div className="space-y-1">
          {(prospect.cidade || prospect.estado) && (
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <MapPin className="h-3 w-3" />
              <span>📍 {[prospect.cidade, prospect.estado].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {prospect.segmento && (
            <div className="text-xs text-muted-foreground">
              🏢 {prospect.segmento}
            </div>
          )}
          {prospect.porte && (
            <Badge variant="outline" className={getPorteColor(prospect.porte)}>
              {prospect.porte}
            </Badge>
          )}
        </div>

        {/* Data de cadastro */}
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Cadastrado:</span> {format(new Date(prospect.created_at), "dd/MM/yyyy", { locale: ptBR })}
        </div>

        {/* Última edição */}
        {prospect.updated_at && (
          <div className="text-xs text-muted-foreground">
            📝 Editado: {format(new Date(prospect.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        )}

        {/* Última interação */}
        {ultimaInteracao && (
          <div className="text-xs font-medium text-purple-600 dark:text-purple-400">
            💬 Última interação: {ultimaInteracao}
          </div>
        )}

        {/* Último contato */}
        {prospect.data_ultimo_contato && (
          <div className="text-xs font-medium text-green-600 dark:text-green-400">
            📞 Último contato: {format(new Date(prospect.data_ultimo_contato), "dd/MM/yyyy", { locale: ptBR })}
          </div>
        )}

        {/* Próximo contato agendado */}
        {prospect.data_proximo_contato && (
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
            📅 Próximo: {format(new Date(prospect.data_proximo_contato), "dd/MM/yyyy", { locale: ptBR })}
          </div>
        )}

        {/* Responsável e Criador */}
        <div className="pt-2 border-t space-y-1">
          {prospect.profiles?.nome && (
            <div className="flex items-center gap-2 text-xs">
              <User className="h-3 w-3 text-primary" />
              <span className="font-medium text-primary">Responsável:</span>
              <span className="font-semibold">{prospect.profiles.nome}</span>
            </div>
          )}
          {prospect.criador?.nome && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <UserPlus className="h-3 w-3" />
              <span>Criado por:</span>
              <span>{prospect.criador.nome}</span>
            </div>
          )}
        </div>

        {/* Motivo de perda */}
        {prospect.status === 'perdido' && prospect.motivo_perda && (
          <div className="text-xs text-red-600 dark:text-red-400 italic pt-2 border-t">
            ✗ {prospect.motivo_perda}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
