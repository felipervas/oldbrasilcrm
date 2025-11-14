import { Badge } from "@/components/ui/badge";
import { Flame, Thermometer, Snowflake } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProspectScoreBadgeProps {
  score: number;
  showLabel?: boolean;
}

export const ProspectScoreBadge = ({ score, showLabel = true }: ProspectScoreBadgeProps) => {
  const getScoreConfig = (score: number) => {
    if (score >= 70) {
      return {
        label: "Quente",
        color: "bg-red-500 text-white hover:bg-red-600",
        icon: Flame,
        description: "Alta probabilidade de conversão"
      };
    } else if (score >= 40) {
      return {
        label: "Morno",
        color: "bg-yellow-500 text-white hover:bg-yellow-600",
        icon: Thermometer,
        description: "Requer atenção e follow-up"
      };
    } else {
      return {
        label: "Frio",
        color: "bg-blue-500 text-white hover:bg-blue-600",
        icon: Snowflake,
        description: "Baixa prioridade ou sem engajamento recente"
      };
    }
  };

  const config = getScoreConfig(score);
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.color} flex items-center gap-1`}>
            <Icon className="h-3 w-3" />
            {showLabel && <span>{config.label}</span>}
            <span className="font-bold">{score}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{config.description}</p>
          <p className="text-xs text-muted-foreground">Score: {score}/100</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
