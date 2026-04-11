"use client";

import { Save, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ACTION_LABELS, PERMISSION_RESOURCES } from "@/lib/admin/permissions";

interface Permissions {
  [resource: string]: string[];
}

interface PermissionsEditorProps {
  userId: string;
  currentPermissions: Permissions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export default function PermissionsEditor({
  userId,
  currentPermissions,
  open,
  onOpenChange,
  onSave,
}: PermissionsEditorProps) {
  const [permissions, setPermissions] = useState<Permissions>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPermissions(currentPermissions || {});
    }
  }, [open, currentPermissions]);

  const hasPermission = (resource: string, action: string): boolean => {
    return permissions[resource]?.includes(action) || false;
  };

  const togglePermission = (resource: string, action: string) => {
    setPermissions((prev) => {
      const resourcePerms = prev[resource] || [];
      const hasAction = resourcePerms.includes(action);

      return {
        ...prev,
        [resource]: hasAction
          ? resourcePerms.filter((a) => a !== action)
          : [...resourcePerms, action],
      };
    });
  };

  const toggleAllForResource = (
    resource: string,
    actions: readonly string[],
  ) => {
    const allSelected = actions.every((action) =>
      hasPermission(resource, action),
    );

    setPermissions((prev) => ({
      ...prev,
      [resource]: allSelected ? [] : [...actions],
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/admin/admin-users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al actualizar permisos");
      }

      toast.success("Permisos actualizados exitosamente");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al guardar permisos",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Editar Permisos
          </DialogTitle>
          <DialogDescription>
            Configura los permisos específicos para este usuario administrador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {PERMISSION_RESOURCES.map((resource) => {
            const resourcePerms = permissions[resource.key] || [];
            const allSelected = resource.actions.every((action) =>
              hasPermission(resource.key, action),
            );
            const someSelected = resource.actions.some((action) =>
              hasPermission(resource.key, action),
            );

            return (
              <div
                className="border rounded-lg p-4 space-y-3"
                key={resource.key}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="font-semibold text-base">
                      {resource.label}
                    </Label>
                    {someSelected && (
                      <Badge className="text-xs" variant="outline">
                        {resourcePerms.length}{" "}
                        {resourcePerms.length === 1 ? "permiso" : "permisos"}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      toggleAllForResource(resource.key, resource.actions)
                    }
                  >
                    {allSelected ? "Desmarcar todos" : "Marcar todos"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {resource.actions.map((action) => (
                    <div className="flex items-center space-x-2" key={action}>
                      <Checkbox
                        checked={hasPermission(resource.key, action)}
                        id={`${resource.key}-${action}`}
                        onCheckedChange={() =>
                          togglePermission(resource.key, action)
                        }
                      />
                      <Label
                        className="text-sm font-normal cursor-pointer"
                        htmlFor={`${resource.key}-${action}`}
                      >
                        {ACTION_LABELS[action] || action}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            disabled={loading}
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button disabled={loading} onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Guardando..." : "Guardar Permisos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
