import {
  Activity,
  CheckCircle,
  Globe,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface AdminUsersStatsProps {
  total: number;
  superAdminCount: number;
  activeCount: number;
  active30dCount: number;
}

export function AdminUsersStats({
  total,
  superAdminCount,
  activeCount,
  active30dCount,
}: AdminUsersStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/80 uppercase tracking-wider">
                Total
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-primary truncate">
                {total}
              </p>
            </div>
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-epoch-primary shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/80 uppercase tracking-wider">
                Super Admin
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-accent truncate">
                {superAdminCount}
              </p>
            </div>
            <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-epoch-accent shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/80 uppercase tracking-wider">
                Activos
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-primary truncate">
                {activeCount}
              </p>
            </div>
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-epoch-accent shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/80 uppercase tracking-wider">
                Activos (30d)
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-primary truncate">
                {active30dCount}
              </p>
            </div>
            <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-epoch-accent shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
