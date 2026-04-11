"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductPaginationProps {
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export default function ProductPagination({
  currentPage,
  totalPages,
  totalProducts,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: ProductPaginationProps) {
  // Show pagination if there are products or if we have more than 1 page
  if (totalPages <= 1 && totalProducts === 0) {
    return null;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalProducts);

  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-tierra-media text-center sm:text-left order-2 sm:order-1">
            {startItem} - {endItem} de {totalProducts}
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 order-1 sm:order-2">
            <Button
              className="h-8 sm:h-9 text-xs px-2 sm:px-3"
              disabled={currentPage === 1}
              size="sm"
              variant="outline"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            >
              Ant
            </Button>

            <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap justify-center">
              {/* First page */}
              {currentPage > 3 && (
                <>
                  <Button
                    size="sm"
                    variant={currentPage === 1 ? "default" : "outline"}
                    onClick={() => onPageChange(1)}
                  >
                    1
                  </Button>
                  {currentPage > 4 && <span className="px-2">...</span>}
                </>
              )}

              {/* Pages around current */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  return (
                    page === currentPage ||
                    page === currentPage - 1 ||
                    page === currentPage + 1 ||
                    (page === currentPage - 2 && currentPage <= 3) ||
                    (page === currentPage + 2 && currentPage >= totalPages - 2)
                  );
                })
                .map((page) => (
                  <Button
                    className="h-8 w-8 sm:h-9 sm:w-9 p-0 min-w-0"
                    key={page}
                    size="sm"
                    variant={currentPage === page ? "default" : "outline"}
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </Button>
                ))}

              {/* Last page */}
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && (
                    <span className="px-2">...</span>
                  )}
                  <Button
                    size="sm"
                    variant={currentPage === totalPages ? "default" : "outline"}
                    onClick={() => onPageChange(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

            <Button
              className="h-8 sm:h-9 text-xs px-2 sm:px-3"
              disabled={currentPage === totalPages}
              size="sm"
              variant="outline"
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
            >
              Sig
            </Button>

            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                onItemsPerPageChange(parseInt(value));
                onPageChange(1);
              }}
            >
              <SelectTrigger className="w-[70px] sm:w-[100px] h-8 sm:h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 / pág</SelectItem>
                <SelectItem value="24">24 / pág</SelectItem>
                <SelectItem value="48">48 / pág</SelectItem>
                <SelectItem value="100">100 / pág</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
