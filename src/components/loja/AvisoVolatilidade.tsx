import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AvisoVolatilidadeProps {
  dataAtualizacao?: string;
}

export const AvisoVolatilidade = ({ dataAtualizacao }: AvisoVolatilidadeProps) => {
  return (
    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-900 dark:text-orange-100">
        ⚠️ Preços Voláteis - Cacau
      </AlertTitle>
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        Os preços dos produtos à base de cacau variam frequentemente.
        Valores exibidos são apenas referência.{" "}
        <strong>Consulte via WhatsApp para preço atual.</strong>
        {dataAtualizacao && (
          <div className="mt-2 text-xs text-orange-700 dark:text-orange-300">
            Última atualização:{" "}
            {formatDistanceToNow(new Date(dataAtualizacao), {
              addSuffix: true,
              locale: ptBR,
            })}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
