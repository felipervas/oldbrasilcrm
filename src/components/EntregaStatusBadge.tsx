import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle2, Calendar } from "lucide-react";

interface EntregaStatusBadgeProps {
  dataPrevisao: string | null;
  status: string;
  compact?: boolean;
}

export const EntregaStatusBadge = ({ dataPrevisao, status, compact = false }: EntregaStatusBadgeProps) => {
  if (!dataPrevisao || status === 'cancelado' || status === 'entregue') {
    return null;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const previsao = new Date(dataPrevisao + 'T00:00:00');
  previsao.setHours(0, 0, 0, 0);
  
  const diffTime = previsao.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let variant: "default" | "destructive" | "secondary" | "outline" = "default";
  let icon = <Calendar className="h-3 w-3" />;
  let texto = "";

  if (diffDays < 0) {
    variant = "destructive";
    icon = <AlertCircle className="h-3 w-3" />;
    texto = compact ? "Atrasado" : `Atrasado ${Math.abs(diffDays)} dias`;
  } else if (diffDays === 0) {
    variant = "default";
    icon = <Clock className="h-3 w-3" />;
    texto = "Hoje";
  } else if (diffDays === 1) {
    variant = "secondary";
    icon = <Clock className="h-3 w-3" />;
    texto = "Amanhã";
  } else if (diffDays <= 7) {
    variant = "outline";
    icon = <CheckCircle2 className="h-3 w-3" />;
    texto = compact ? `${diffDays}d` : `Em ${diffDays} dias`;
  } else {
    return null; // Não mostra badge para entregas distantes
  }

  return (
    <Badge variant={variant} className="gap-1 whitespace-nowrap">
      {icon}
      {texto}
    </Badge>
  );
};
