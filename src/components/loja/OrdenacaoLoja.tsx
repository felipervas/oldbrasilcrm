import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

interface OrdenacaoLojaProps {
  value: string;
  onChange: (value: string) => void;
}

export const OrdenacaoLoja = ({ value, onChange }: OrdenacaoLojaProps) => {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Ordenar por..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ordem_exibicao">Mais Relevantes</SelectItem>
          <SelectItem value="lancamentos">Lançamentos</SelectItem>
          <SelectItem value="menor_preco">Menor Preço</SelectItem>
          <SelectItem value="maior_preco">Maior Preço</SelectItem>
          <SelectItem value="a_z">A-Z</SelectItem>
          <SelectItem value="z_a">Z-A</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
