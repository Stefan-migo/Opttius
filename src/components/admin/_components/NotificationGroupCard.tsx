"use client";

import { Bell } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/notifications/constants";

interface NotificationSetting {
  id: string;
  notification_type: string;
  enabled: boolean;
  priority: "low" | "medium" | "high" | "urgent" | null;
  notify_all_admins: boolean;
  notify_specific_roles: string[] | null;
  [key: string]: unknown;
}

interface NotificationGroupCardProps {
  title: string;
  settings: NotificationSetting[];
  onUpdate: (type: string, field: string, value: unknown) => void;
}

export function NotificationGroupCard({
  title,
  settings,
  onUpdate,
}: NotificationGroupCardProps) {
  if (settings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {settings.map((setting) => (
            <div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border"
              key={setting.id}
            >
              <div className="flex items-center gap-3">
                <Switch
                  checked={setting.enabled}
                  onCheckedChange={(checked) =>
                    onUpdate(setting.notification_type, "enabled", checked)
                  }
                />
                <div>
                  <Label className="font-medium">
                    {NOTIFICATION_TYPE_LABELS[setting.notification_type] ||
                      setting.notification_type}
                  </Label>
                  <p className="text-xs text-gray-500">
                    {setting.notification_type.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={setting.priority || "medium"}
                  onValueChange={(value) =>
                    onUpdate(setting.notification_type, "priority", value)
                  }
                >
                  <SelectTrigger className="w-full sm:w-[130px] rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
