"use client";

import { Building2, Loader2, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import OrgActivityLog from "../components/OrgActivityLog";
import OrgBasicInfo from "../components/OrgBasicInfo";
import OrgDetailHeader from "../components/OrgDetailHeader";
import OrgSubscriptionInfo from "../components/OrgSubscriptionInfo";
import OrgBranchesTab from "./OrgBranchesTab";
import { OrgDeleteDialog, OrgEditDialog } from "./OrgDialogs";
import OrgUsersTab from "./OrgUsersTab";

interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  status: string;
  owner_id?: string;
  metadata?: unknown;
  created_at: string;
  updated_at: string;
  stats: {
    totalUsers: number;
    activeUsers: number;
    branches: number;
    orders: number;
    products: number;
  };
  subscriptions?: Array<{
    id: string;
    status: string;
    current_period_start?: string;
    current_period_end?: string;
    gateway_subscription_id?: string;
  }>;
  owner?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  recentUsers?: Array<{
    id: string;
    email: string;
    role: string;
    is_active: boolean;
    last_login?: string;
    created_at: string;
    profiles?: {
      first_name?: string;
      last_name?: string;
    };
  }>;
}

export default function OrganizationDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [organization, setOrganization] = useState<OrganizationDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    slug: "",
    subscription_tier: "basic",
    status: "active",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchOrganizationDetails();
  }, [orgId]);

  const fetchOrganizationDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}`,
      );

      if (!response.ok) {
        throw new Error("Error al cargar detalles de la organización");
      }

      const data = await response.json();
      setOrganization(data.organization);
      setEditData({
        name: data.organization.name,
        slug: data.organization.slug,
        subscription_tier: data.organization.subscription_tier,
        status: data.organization.status,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error("Error al cargar detalles");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setEditing(true);
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editData),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar organización");
      }

      toast.success("Organización actualizada exitosamente");
      setShowEditDialog(false);
      fetchOrganizationDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setEditing(false);
    }
  };

  const handleAction = async (
    action: "suspend" | "activate" | "cancel" | "change_tier",
    value?: string,
  ) => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/actions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, value }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al realizar acción");
      }

      toast.success("Acción realizada exitosamente");
      fetchOrganizationDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar organización");
      }

      toast.success(
        `Organización "${organization?.name}" eliminada completamente junto con todos sus datos relacionados`,
      );
      router.push("/admin/saas-management/organizations");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="p-6">
        <Card className="admin-card">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error: {error || "Organización no encontrada"}</p>
              <Link href="/admin/saas-management/organizations">
                <Button className="mt-4" variant="outline">
                  Volver a organizaciones
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <OrgDetailHeader
        name={organization.name}
        slug={organization.slug}
        status={organization.status}
        subscriptionTier={organization.subscription_tier}
        onAction={handleAction}
        onDelete={() => setDeleteDialogOpen(true)}
        onEdit={() => setShowEditDialog(true)}
      />

      <OrgSubscriptionInfo
        orgId={orgId}
        stats={organization.stats}
        subscriptions={organization.subscriptions}
      />

      {/* Tabs para gestión detallada */}
      <Tabs
        className="space-y-6"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <Building2 className="h-4 w-4 mr-2" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="branches">
            <MapPin className="h-4 w-4 mr-2" />
            Sucursales ({organization.stats.branches})
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Usuarios ({organization.stats.totalUsers})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent className="space-y-6" value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrgBasicInfo
              createdAt={organization.created_at}
              name={organization.name}
              owner={organization.owner || null}
              slug={organization.slug}
              updatedAt={organization.updated_at}
            />

            <OrgActivityLog recentUsers={organization.recentUsers} />
          </div>
        </TabsContent>

        {/* Tab: Sucursales */}
        <TabsContent className="space-y-6" value="branches">
          <OrgBranchesTab
            orgId={orgId}
            onOrgUpdate={fetchOrganizationDetails}
          />
        </TabsContent>

        {/* Tab: Usuarios */}
        <TabsContent className="space-y-6" value="users">
          <OrgUsersTab orgId={orgId} onOrgUpdate={fetchOrganizationDetails} />
        </TabsContent>
      </Tabs>

      <OrgEditDialog
        editData={editData}
        open={showEditDialog}
        saving={editing}
        onEditDataChange={setEditData}
        onOpenChange={setShowEditDialog}
        onSave={handleUpdate}
      />
      <OrgDeleteDialog
        deleting={deleting}
        open={deleteDialogOpen}
        orgName={organization?.name || ""}
        stats={{
          totalUsers: organization?.stats?.totalUsers || 0,
          activeUsers: organization?.stats?.activeUsers || 0,
          branches: organization?.stats?.branches || 0,
          orders: organization?.stats?.orders || 0,
          products: organization?.stats?.products || 0,
        }}
        onDelete={handleDeleteConfirm}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}
