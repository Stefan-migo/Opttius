import { AlertCircle, CheckCircle2, Clock, MessageSquare } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface TicketStatsProps {
  total: number;
  openTicketsCount: number;
  inProgressCount: number;
  resolvedCount: number;
}

export function TicketStats({
  total,
  openTicketsCount,
  inProgressCount,
  resolvedCount,
}: TicketStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 sm:pt-6 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/80 uppercase tracking-wider">
                Total
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-primary truncate">
                {total}
              </p>
            </div>
            <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-epoch-accent shrink-0" />
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 sm:pt-6 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/80 uppercase tracking-wider">
                Abiertos
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-primary truncate">
                {openTicketsCount}
              </p>
            </div>
            <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-epoch-accent shrink-0" />
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 sm:pt-6 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/80 uppercase tracking-wider">
                En Progreso
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-primary truncate">
                {inProgressCount}
              </p>
            </div>
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-epoch-accent shrink-0" />
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 sm:pt-6 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/80 uppercase tracking-wider">
                Resueltos
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-primary truncate">
                {resolvedCount}
              </p>
            </div>
            <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-epoch-accent shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
