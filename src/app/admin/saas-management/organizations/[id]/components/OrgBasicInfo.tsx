"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface OwnerInfo {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

interface OrgBasicInfoProps {
  name: string;
  slug: string;
  owner?: OwnerInfo | null;
  createdAt: string;
  updatedAt: string;
}

export default function OrgBasicInfo({ name, slug, owner, createdAt, updatedAt }: OrgBasicInfoProps) {
  return (
    <Card className="admin-card">
      <CardHeader>
        <CardTitle>Información General</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-500">Nombre</label>
          <p className="text-base">{name}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Slug</label>
          <p className="text-base">{slug}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Owner</label>
          {owner ? (
            <div>
              <p className="text-base">{owner.first_name} {owner.last_name}</p>
              <p className="text-sm text-gray-500">{owner.email}</p>
              {owner.phone && <p className="text-sm text-gray-500">{owner.phone}</p>}
            </div>
          ) : (
            <p className="text-base text-gray-400">Sin owner asignado</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Creada</label>
          <p className="text-base">{formatDate(createdAt)}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Última actualización</label>
          <p className="text-base">{formatDate(updatedAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
