"use client";

import { useState, useEffect } from 'react';
import { extractDataFromResponse } from '@/lib/api/response-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileText, 
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Eye,
  Copy,
  Trash2,
  Settings,
  Tag,
  BarChart3,
  Clock,
  User
} from 'lucide-react';
import Link from 'next/link';

interface SupportTemplate {
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
  category?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    email: string;
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  color: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<SupportTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');

  // Template creation/editing
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SupportTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    subject: '',
    content: '',
    category_id: '',
    variables: [] as string[]
  });

  const [previewData, setPreviewData] = useState({
    subject: '',
    content: '',
    variables: {} as Record<string, string>
  });

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, [categoryFilter, activeFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category_id', categoryFilter);
      if (activeFilter !== 'all') params.append('active_only', activeFilter === 'active' ? 'true' : 'false');

      const response = await fetch(`/api/admin/support/templates?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/support/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(extractDataFromResponse(data));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setForm({
      name: '',
      subject: '',
      content: '',
      category_id: '',
      variables: []
    });
    setEditDialogOpen(true);
  };

  const openEditDialog = (template: SupportTemplate) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      subject: template.subject,
      content: template.content,
      category_id: template.category_id || '',
      variables: Array.isArray(template.variables) ? template.variables : 
                  typeof template.variables === 'string' ? JSON.parse(template.variables || '[]') : []
    });
    setEditDialogOpen(true);
  };

  const openPreviewDialog = (template: SupportTemplate) => {
    // Extract variables from template content
    const variableMatches = template.content.match(/\{\{(\w+)\}\}/g) || [];
    const subjectMatches = template.subject.match(/\{\{(\w+)\}\}/g) || [];
    const allMatches = [...variableMatches, ...subjectMatches];
    const uniqueVariables = [...new Set(allMatches.map(match => match.replace(/\{\{|\}\}/g, '')))];

    // Create sample data for variables
    const sampleVariables: Record<string, string> = {};
    uniqueVariables.forEach(variable => {
      switch (variable) {
        case 'customer_name':
          sampleVariables[variable] = 'María González';
          break;
        case 'order_number':
          sampleVariables[variable] = 'ORD-001';
          break;
        case 'product_name':
          sampleVariables[variable] = 'Crema Facial de Rosa Mosqueta';
          break;
        case 'tracking_number':
          sampleVariables[variable] = 'TR123456789';
          break;
        case 'delivery_date':
          sampleVariables[variable] = '25 de enero de 2025';
          break;
        default:
          sampleVariables[variable] = `[${variable}]`;
      }
    });

    setPreviewData({
      subject: template.subject,
      content: template.content,
      variables: sampleVariables
    });
    setPreviewDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      alert('Por favor, completa los campos obligatorios.');
      return;
    }

    try {
      setSaving(true);
      const method = editingTemplate ? 'PUT' : 'POST';
      const url = editingTemplate 
        ? `/api/admin/support/templates/${editingTemplate.id}`
        : '/api/admin/support/templates';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          subject: form.subject.trim(),
          content: form.content.trim(),
          category_id: form.category_id || null,
          variables: form.variables
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      await fetchTemplates();
      setEditDialogOpen(false);
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Error al guardar la plantilla. Por favor, inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyTemplate = async (template: SupportTemplate) => {
    try {
      await navigator.clipboard.writeText(template.content);
      alert('Plantilla copiada al portapapeles');
    } catch (err) {
      console.error('Error copying template:', err);
      alert('Error al copiar la plantilla');
    }
  };

  const renderTemplateWithVariables = (text: string, variables: Record<string, string>) => {
    let rendered = text;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value);
    });
    return rendered;
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchTerm === '' || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-AR');
  };

  if (loading && templates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-azul-profundo">Plantillas de Soporte</h1>
            <p className="text-tierra-media">Cargando plantillas...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link href="/admin/support">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-azul-profundo">Plantillas de Soporte</h1>
            <p className="text-tierra-media">
              Gestiona plantillas de respuestas para agilizar el soporte al cliente
            </p>
          </div>
        </div>
        
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-azul-profundo" />
              <div className="ml-3">
                <p className="text-xs text-tierra-media">Total Plantillas</p>
                <p className="text-lg font-bold text-azul-profundo">{templates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <BarChart3 className="h-6 w-6 text-verde-suave" />
              <div className="ml-3">
                <p className="text-xs text-tierra-media">Más Usada</p>
                <p className="text-lg font-bold text-verde-suave">
                  {Math.max(...templates.map(t => t.usage_count), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Tag className="h-6 w-6 text-dorado" />
              <div className="ml-3">
                <p className="text-xs text-tierra-media">Categorías</p>
                <p className="text-lg font-bold text-dorado">{categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-blue-500" />
              <div className="ml-3">
                <p className="text-xs text-tierra-media">Activas</p>
                <p className="text-lg font-bold text-blue-500">
                  {templates.filter(t => t.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tierra-media h-4 w-4" />
                <Input
                  placeholder="Buscar plantillas por nombre o contenido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="inactive">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.subject && (
                    <p className="text-sm text-tierra-media mt-1 line-clamp-2">
                      {template.subject}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {template.category && (
                    <Badge variant="outline" style={{ borderColor: template.category.name === 'Productos' ? '#10B981' : '#3B82F6' }}>
                      {template.category.name}
                    </Badge>
                  )}
                  {!template.is_active && (
                    <Badge variant="secondary">Inactiva</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-tierra-media line-clamp-4">
                    {template.content}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-tierra-media">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {template.usage_count} usos
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {template.creator?.email || 'Admin'}
                    </div>
                  </div>
                  <div>
                    {formatTimeAgo(template.updated_at)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPreviewDialog(template)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Vista previa
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyTemplate(template)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-16">
            <FileText className="h-12 w-12 text-tierra-media mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-azul-profundo mb-2">No se encontraron plantillas</h3>
            <p className="text-tierra-media mb-4">
              {searchTerm ? 'Ajusta los filtros de búsqueda' : 'Crea tu primera plantilla de soporte'}
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Plantilla
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Template Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Plantilla' : 'Crear Nueva Plantilla'}
            </DialogTitle>
            <DialogDescription>
              Las plantillas te permiten responder rápidamente con mensajes predefinidos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tierra-media mb-2">
                  Nombre de la Plantilla <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ej: Respuesta entrega tardía"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tierra-media mb-2">
                  Categoría
                </label>
                <Select value={form.category_id} onValueChange={(value) => setForm(prev => ({ ...prev, category_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-tierra-media mb-2">
                Asunto del Email
              </label>
              <Input
                placeholder="Ej: Actualización sobre tu pedido {{order_number}}"
                value={form.subject}
                onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-tierra-media mb-2">
                Contenido de la Plantilla <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Hola {{customer_name}},&#10;&#10;Gracias por contactarnos sobre tu pedido {{order_number}}.&#10;&#10;[Continúa escribiendo tu mensaje...]"
                value={form.content}
                onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                rows={10}
                className="min-h-[200px]"
              />
              <p className="text-xs text-tierra-media mt-2">
                Usa variables con doble llaves, ej: {`{{customer_name}}, {{order_number}}, {{product_name}}`}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveTemplate}
              disabled={saving}
            >
              {saving ? 'Guardando...' : (editingTemplate ? 'Actualizar' : 'Crear Plantilla')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vista Previa de la Plantilla</DialogTitle>
            <DialogDescription>
              Así se verá la plantilla con datos de ejemplo
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {previewData.subject && (
              <div>
                <label className="block text-sm font-medium text-tierra-media mb-2">
                  Asunto:
                </label>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">
                    {renderTemplateWithVariables(previewData.subject, previewData.variables)}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-tierra-media mb-2">
                Contenido:
              </label>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="whitespace-pre-wrap">
                  {renderTemplateWithVariables(previewData.content, previewData.variables)}
                </div>
              </div>
            </div>

            {Object.keys(previewData.variables).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-tierra-media mb-2">
                  Variables utilizadas:
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(previewData.variables).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs">
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setPreviewDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
