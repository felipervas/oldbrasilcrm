import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Brain, Phone, MapPin, MoreVertical } from 'lucide-react';
import { Prospect } from '@/hooks/useProspects';

interface ProspectQuickActionsProps {
  prospect: Prospect;
  onAgendarVisita: (prospect: Prospect) => void;
  onGerarInsights: (prospect: Prospect) => void;
  onRegistrarInteracao: (prospect: Prospect) => void;
  onVerMapa: (prospect: Prospect) => void;
}

export const ProspectQuickActions = ({
  prospect,
  onAgendarVisita,
  onGerarInsights,
  onRegistrarInteracao,
  onVerMapa,
}: ProspectQuickActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onAgendarVisita(prospect)}>
          <Calendar className="h-4 w-4 mr-2" />
          Agendar Visita
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onGerarInsights(prospect)}>
          <Brain className="h-4 w-4 mr-2" />
          Gerar Insights IA
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRegistrarInteracao(prospect)}>
          <Phone className="h-4 w-4 mr-2" />
          Registrar Interação
        </DropdownMenuItem>
        {prospect.endereco_completo && (
          <DropdownMenuItem onClick={() => onVerMapa(prospect)}>
            <MapPin className="h-4 w-4 mr-2" />
            Ver no Mapa
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
