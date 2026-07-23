"use client";

import { CheckCheck, RefreshCw } from "lucide-react";

import { BranchSelector } from "@/components/admin/BranchSelector";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useNotifications } from "../_hooks/useNotifications";
import { NotificationFilters } from "./NotificationFilters";
import { NotificationListSection } from "./NotificationListSection";
import { NotificationStatsCards } from "./NotificationStatsCards";

export default function NotificationsContent() {
  const {
    notifications,
    unreadCount,
    loading,
    totalCount,
    currentPage,
    setCurrentPage,
    filters,
    setFilters,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    filteredNotifications,
    totalPages,
    isSuperAdmin,
    isRoot,
  } = useNotifications();

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-admin-text-primary font-cormorant">
            Notificaciones
          </h1>
          <p className="text-sm font-medium text-admin-text-tertiary uppercase tracking-widest">
            Centro de Control de Alertas y Mensajes
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {isSuperAdmin && !isRoot && <BranchSelector />}
          {unreadCount > 0 && (
            <Button
              className="h-10 px-4 text-xs font-bold border-admin-accent-primary/20 hover:bg-admin-accent-primary hover:text-white transition-all rounded-xl"
              disabled={loading}
              variant="outline"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todo como leído
            </Button>
          )}
          <Button
            className="h-10 px-4 text-xs font-bold bg-admin-bg-tertiary hover:bg-admin-border-primary transition-all rounded-xl"
            disabled={loading}
            variant="secondary"
            onClick={fetchNotifications}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
            />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <NotificationStatsCards
        totalCount={totalCount}
        unreadCount={unreadCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <NotificationFilters filters={filters} onFilterChange={setFilters} />
        </div>

        {/* Notifications List */}
        <div className="lg:col-span-3 space-y-4">
          <NotificationListSection
            currentPage={currentPage}
            filteredNotifications={filteredNotifications}
            loading={loading}
            notifications={notifications}
            totalPages={totalPages}
            onMarkAsRead={markAsRead}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
