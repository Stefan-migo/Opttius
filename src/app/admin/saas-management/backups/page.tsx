"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Database,
  Download,
  Trash2,
  RefreshCcw,
  ShieldAlert,
  FileText,
  Calendar,
  HardDrive,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BackupFile {
  id: string;
  name: string;
  size: number;
  size_mb: string;
  created_at: string;
}

export default function SaasBackupsPage() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/saas-management/backups");
      const data = await response.json();
      if (data.success) {
        setBackups(data.backups);
      } else {
        toast.error(data.error || "Error al cargar backups");
      }
    } catch (err) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    const confirm = window.confirm(
      "¿Confirmar generación de backup integral? Este proceso captura el 100% de la base de datos y podría tomar unos segundos dependiendo del volumen de datos.",
    );
    if (!confirm) return;

    setIsGenerating(true);
    const toastId = toast.loading("Generando volcado SQL completo...");

    try {
      const response = await fetch("/api/admin/saas-management/backups", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success("Backup SaaS generado con éxito", { id: toastId });
        fetchBackups();
      } else {
        throw new Error(data.error || "Fallo en la generación");
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteBackup = async (fileName: string) => {
    if (
      !window.confirm(
        "¿Estás seguro de eliminar este backup? Esta acción es irreversible.",
      )
    )
      return;

    try {
      const response = await fetch(
        `/api/admin/saas-management/backups?fileName=${fileName}`,
        { method: "DELETE" },
      );
      const data = await response.json();

      if (data.success) {
        toast.success("Backup eliminado");
        fetchBackups();
      } else {
        toast.error(data.error || "Error al eliminar");
      }
    } catch (err) {
      toast.error("Error de conexión");
    }
  };

  // Para descargar archivos de storage privado necesitamos una URL firmada.
  // Usaremos el mismo endpoint GET pero con parámetros de descarga si es necesario o
  // modificaremos la API para devolver detalles incluyendo URL.
  // Por ahora, implementaremos una descarga directa simulada o vía API de detalles.
  const handleDownload = async (fileName: string) => {
    toast.info("Preparando descarga segura...");
    try {
      const response = await fetch(
        `/api/admin/saas-management/backups?fileName=${fileName}`,
      );
      const data = await response.json();

      if (data.success && data.downloadUrl) {
        // Crear un link temporal para disparar la descarga
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Descarga iniciada");
      } else {
        toast.error("No se pudo obtener la URL de descarga");
      }
    } catch (err) {
      toast.error("Error al procesar la descarga");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-azul-profundo flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-blue-600" />
            Gestión de Backups Integrales SaaS
          </h1>
          <p className="text-tierra-media mt-2">
            Panel central de recuperación ante desastres y respaldos de nivel
            servidor
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBackups} disabled={loading}>
            <RefreshCcw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
          <Button onClick={handleCreateBackup} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Generar Backup Total (SQL)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Estadísticas/Estado */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Estado de Seguridad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-lg border border-green-100">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="text-sm font-bold">Motor de Dump Activo</p>
                <p className="text-xs opacity-80">pg_dump v15.x operativo</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Fidelidad:</span>
                <span className="text-blue-600 font-bold">
                  100% (SQL Nativo)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">
                  Schemas Incluidos:
                </span>
                <span className="text-gray-900">public, auth, storage</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Ubicación:</span>
                <span className="text-gray-900 italic">
                  saas-backups-bucket
                </span>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">
                  Los backups contienen todos los datos de todas las
                  organizaciones. Maneje estos archivos con extrema precaución.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Backups */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historial de Respaldos
            </CardTitle>
            <CardDescription>
              Listado de volcados completos de base de datos almacenados en la
              nube
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              </div>
            ) : backups.length === 0 ? (
              <div className="py-20 text-center text-gray-500 border-2 border-dashed rounded-xl">
                <Database className="h-12 w-12 mx-auto opacity-20 mb-3" />
                <p>No existen backups SaaS generados aún.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <HardDrive className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 break-all">
                          {backup.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(
                              new Date(backup.created_at),
                              "PPP 'a las' HH:mm",
                              { locale: es },
                            )}
                          </span>
                          <span className="bg-gray-200 px-2 py-0.5 rounded text-gray-700">
                            {backup.size_mb} MB
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleDownload(backup.name)}
                        title="Descargar SQL"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteBackup(backup.name)}
                        title="Eliminar permanentemente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
