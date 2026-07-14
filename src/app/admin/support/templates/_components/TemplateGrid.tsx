import { BarChart3, Copy, Edit, Eye, FileText, Plus, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Template {
  id: string;
  name: string;
  subject: string;
  content: string;
  category_id?: string;
  variables: string[];
  usage_count: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string };
  creator?: { id: string; email: string };
}

interface TemplateGridProps {
  templates: Template[];
  onPreview: (template: Template) => void;
  onCopy: (template: Template) => void;
  onEdit: (template: Template) => void;
  onCreateNew: () => void;
  searchTerm: string;
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return "Hace menos de 1 hora";
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-AR");
}

export function TemplateGrid({ templates, onPreview, onCopy, onEdit, onCreateNew, searchTerm }: TemplateGridProps) {
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchTerm === "" ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (filteredTemplates.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-16">
          <FileText className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-epoch-primary mb-2">
            No se encontraron plantillas
          </h3>
          <p className="text-admin-text-tertiary mb-4">
            {searchTerm ? "Ajusta los filtros de búsqueda" : "Crea tu primera plantilla de soporte"}
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Primera Plantilla
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredTemplates.map((template) => (
        <Card className="hover:shadow-lg transition-shadow" key={template.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.subject && (
                  <p className="text-sm text-admin-text-tertiary mt-1 line-clamp-2">
                    {template.subject}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {template.category && (
                  <Badge
                    style={{
                      borderColor:
                        template.category.name === "Productos" ? "#10B981" : "#3B82F6",
                    }}
                    variant="outline"
                  >
                    {template.category.name}
                  </Badge>
                )}
                {!template.is_active && <Badge variant="secondary">Inactiva</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-admin-text-tertiary line-clamp-4">
                  {template.content}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-admin-text-tertiary">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {template.usage_count} usos
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {template.creator?.email || "Admin"}
                  </div>
                </div>
                <div>{formatTimeAgo(template.updated_at)}</div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" size="sm" variant="outline" onClick={() => onPreview(template)}>
                  <Eye className="h-3 w-3 mr-1" />
                  Vista previa
                </Button>
                <Button size="sm" variant="outline" onClick={() => onCopy(template)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
