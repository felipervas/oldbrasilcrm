import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

interface Marca {
  id: string;
  nome: string;
  produtos_count: number;
}

interface FiltrosLojaProps {
  marcas: Marca[];
  categorias: string[];
  filtrosMarcas: string[];
  filtrosCategorias: string[];
  onMarcaChange: (marcaId: string) => void;
  onCategoriaChange: (categoria: string) => void;
  onLimparFiltros: () => void;
}

export const FiltrosLoja = ({
  marcas,
  categorias,
  filtrosMarcas,
  filtrosCategorias,
  onMarcaChange,
  onCategoriaChange,
  onLimparFiltros,
}: FiltrosLojaProps) => {
  const temFiltrosAtivos = filtrosMarcas.length > 0 || filtrosCategorias.length > 0;

  return (
    <div className="bg-card rounded-lg border p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Filtros</h3>
        {temFiltrosAtivos && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLimparFiltros}
            className="h-8 px-2 text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Marcas */}
      {marcas && marcas.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">MARCAS</h4>
          <ScrollArea className="h-[200px] pr-3">
            <div className="space-y-2">
              {marcas.map((marca) => (
                <div key={marca.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`marca-${marca.id}`}
                    checked={filtrosMarcas.includes(marca.id)}
                    onCheckedChange={() => onMarcaChange(marca.id)}
                  />
                  <Label
                    htmlFor={`marca-${marca.id}`}
                    className="text-sm font-normal cursor-pointer flex-1 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {marca.nome}
                    <span className="text-muted-foreground ml-2">
                      ({marca.produtos_count})
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <Separator />

      {/* Categorias */}
      {categorias && categorias.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">CATEGORIAS</h4>
          <div className="space-y-2">
            {categorias.map((categoria) => (
              <div key={categoria} className="flex items-center space-x-2">
                <Checkbox
                  id={`cat-${categoria}`}
                  checked={filtrosCategorias.includes(categoria)}
                  onCheckedChange={() => onCategoriaChange(categoria)}
                />
                <Label
                  htmlFor={`cat-${categoria}`}
                  className="text-sm font-normal cursor-pointer flex-1 leading-none"
                >
                  {categoria}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
