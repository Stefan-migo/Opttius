import { BarChart3, Clock, FileText, Tag } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface TemplateStatsProps {
  totalTemplates: number;
  maxUsageCount: number;
  categoriesCount: number;
  activeCount: number;
}

export function TemplateStats({
  totalTemplates,
  maxUsageCount,
  categoriesCount,
  activeCount,
}: TemplateStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-epoch-primary" />
            <div className="ml-3">
              <p className="text-xs text-admin-text-tertiary">Total Plantillas</p>
              <p className="text-lg font-bold text-epoch-primary">{totalTemplates}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <BarChart3 className="h-6 w-6 text-admin-success" />
            <div className="ml-3">
              <p className="text-xs text-admin-text-tertiary">Más Usada</p>
              <p className="text-lg font-bold text-admin-success">{maxUsageCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <Tag className="h-6 w-6 text-epoch-accent" />
            <div className="ml-3">
              <p className="text-xs text-admin-text-tertiary">Categorías</p>
              <p className="text-lg font-bold text-epoch-accent">{categoriesCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-blue-500" />
            <div className="ml-3">
              <p className="text-xs text-admin-text-tertiary">Activas</p>
              <p className="text-lg font-bold text-blue-500">{activeCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
