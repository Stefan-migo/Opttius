"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface RecentUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  profiles?: { first_name?: string; last_name?: string };
}

interface OrgActivityLogProps {
  recentUsers?: RecentUser[] | null;
}

export default function OrgActivityLog({ recentUsers }: OrgActivityLogProps) {
  return (
    <Card className="admin-card">
      <CardHeader>
        <CardTitle>Usuarios Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {recentUsers && recentUsers.length > 0 ? (
          <div className="space-y-2">
            {recentUsers.map((user) => (
              <div className="flex items-center justify-between p-3 border rounded-lg" key={user.id}>
                <div>
                  <p className="font-medium">{user.profiles?.first_name} {user.profiles?.last_name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{user.role}</Badge>
                    {user.is_active ? <Badge variant="default">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
                  </div>
                </div>
                {user.last_login && (
                  <div className="text-sm text-gray-500">Último acceso: {formatDate(user.last_login)}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No hay usuarios registrados</p>
        )}
      </CardContent>
    </Card>
  );
}
