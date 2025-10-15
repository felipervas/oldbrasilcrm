import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  totalItems,
  pageSize 
}: PaginationProps) => {
  const canGoBack = currentPage > 0;
  const canGoForward = currentPage < totalPages - 1;

  const startItem = currentPage * (pageSize || 20) + 1;
  const endItem = Math.min((currentPage + 1) * (pageSize || 20), totalItems || 0);

  return (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-muted-foreground">
        {totalItems ? (
          <>Mostrando {startItem} a {endItem} de {totalItems} itens</>
        ) : (
          <>Página {currentPage + 1} de {totalPages}</>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoForward}
        >
          Próxima
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
