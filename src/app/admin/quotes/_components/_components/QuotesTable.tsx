"use client";

import { CheckCircle, ChevronLeft, ChevronRight, Clock, Eye, FileText, RefreshCw, Send, ShoppingCart, Trash2, XCircle } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Quote } from "@/lib/api/services";
import { formatCurrency, formatDate } from "@/lib/utils";

function getStatusBadge(status: string) {
  const config: Record<string, { variant: unknown; label: string; icon: unknown }> = {
    draft: { variant: "outline", label: "Borrador", icon: FileText },
    sent: { variant: "secondary", label: "Enviado", icon: Send },
    accepted: { variant: "default", label: "Aceptado", icon: CheckCircle },
    rejected: { variant: "destructive", label: "Rechazado", icon: XCircle },
    expired: { variant: "outline", label: "Expirado", icon: Clock },
    converted_to_work: { variant: "default", label: "Convertido", icon: RefreshCw },
  };
  const c = config[status] || { variant: "outline", label: status, icon: FileText };
  const Icon = c.icon as React.ElementType;
  return <Badge className="flex items-center gap-1" variant={c.variant as "outline" | "default" | "secondary" | "destructive"}><Icon className="h-3 w-3" />{c.label}</Badge>;
}

interface Props {
  filteredQuotes: Quote[];
  currentPage: number;
  totalPages: number;
  totalQuotes: number;
  fieldOperationIdFromUrl: string | null;
  onPageChange: (page: number) => void;
  onDeleteClick: (id: string) => void;
  onStatusChange: (quoteId: string, newStatus: string) => void;
}

export function QuotesTable({ filteredQuotes, currentPage, totalPages, totalQuotes, fieldOperationIdFromUrl, onPageChange, onDeleteClick, onStatusChange }: Props) {
  return (
    <>
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead><TableHead>Cliente</TableHead><TableHead>Marco</TableHead><TableHead>Lente</TableHead>
              <TableHead>Total</TableHead><TableHead>Estado</TableHead><TableHead>Convertido</TableHead><TableHead>Fecha</TableHead><TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuotes.map((quote) => {
              const isConverted = quote.status === "accepted" && !!quote.converted_to_work_order_id;
              return (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.quote_number}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{quote.customer?.first_name || ""} {quote.customer?.last_name || ""}</div>
                      <div className="text-sm text-admin-text-tertiary">{quote.customer?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{quote.frame_name || "-"}</TableCell>
                  <TableCell>
                    <div><div className="font-medium">{quote.lens_type || "-"}</div><div className="text-sm text-admin-text-tertiary">{quote.lens_material || ""}</div></div>
                  </TableCell>
                  <TableCell className="font-semibold text-admin-success">{formatCurrency(quote.total_amount)}</TableCell>
                  <TableCell>
                    <Select
                      disabled={isConverted}
                      value={quote.status}
                      onValueChange={(value) => onStatusChange(quote.id, value)}
                    >
                      <SelectTrigger className="w-auto border-0 p-0 h-auto bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 shadow-none [&>svg]:hidden [&_svg]:hidden [&_[data-radix-select-icon]]:hidden">
                        <SelectValue asChild>
                          <div className={`cursor-pointer ${isConverted ? "cursor-not-allowed opacity-75" : ""}`}>{getStatusBadge(quote.status)}</div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft"><div className="flex items-center gap-2"><FileText className="h-3 w-3" /> Borrador</div></SelectItem>
                        <SelectItem value="sent"><div className="flex items-center gap-2"><Send className="h-3 w-3" /> Enviado</div></SelectItem>
                        <SelectItem value="accepted"><div className="flex items-center gap-2"><CheckCircle className="h-3 w-3" /> Aceptado</div></SelectItem>
                        <SelectItem value="rejected"><div className="flex items-center gap-2"><XCircle className="h-3 w-3" /> Rechazado</div></SelectItem>
                        <SelectItem value="expired"><div className="flex items-center gap-2"><Clock className="h-3 w-3" /> Expirado</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {quote.converted_to_work_order_id ? (
                      <Badge className="flex items-center gap-1 bg-green-600" variant="default"><RefreshCw className="h-3 w-3" /> Convertido</Badge>
                    ) : (<span className="text-admin-text-tertiary text-sm">-</span>)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{formatDate(quote.quote_date)}</div>
                      {quote.expiration_date && (
                        <div className={`text-xs ${new Date(quote.expiration_date) < new Date() ? "text-red-500" : "text-admin-text-tertiary"}`}>
                          Exp: {formatDate(quote.expiration_date)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/quotes/${quote.id}`}><Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-1" />Ver</Button></Link>
                      {quote.status !== "accepted" && !quote.converted_to_work_order_id && (
                        <Link href={fieldOperationIdFromUrl ? `/admin/pos?quoteId=${quote.id}&field_operation_id=${fieldOperationIdFromUrl}` : `/admin/pos?quoteId=${quote.id}`}>
                          <Button className="text-green-600 hover:text-green-700 hover:bg-green-50" size="sm" variant="outline"><ShoppingCart className="h-4 w-4 mr-1" />Cargar al POS</Button>
                        </Link>
                      )}
                      <Button className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={quote.status === "accepted" || !!quote.converted_to_work_order_id}
                        size="sm" variant="outline"
                        onClick={() => onDeleteClick(quote.id)}
                      ><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-admin-text-tertiary">Página {currentPage} de {totalPages}</div>
          <div className="flex gap-2">
            <Button disabled={currentPage === 1} size="sm" variant="outline" onClick={() => onPageChange(Math.max(1, currentPage - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button disabled={currentPage === totalPages} size="sm" variant="outline" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
