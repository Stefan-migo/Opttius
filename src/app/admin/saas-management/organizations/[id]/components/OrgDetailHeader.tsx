"use client";

import { ArrowLeft, Crown, Edit, Pause, Play, Trash2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

interface OrgDetailHeaderProps {
  name: string;
  slug: string;
  status: string;
  subscriptionTier: string;
  onAction: (action: "suspend" | "activate" | "cancel" | "change_tier", value?: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    active: "default",
    suspended: "secondary",
    cancelled: "destructive",
  };
  const icons: Record<string, typeof CheckCircle2> = {
    active: CheckCircle2,
    suspended: Pause,
    cancelled: XCircle,
  };
  const Icon = icons[status] || CheckCircle2;
  return (
    <Badge variant={variants[status] || "default"}>
      <Icon className="h-3 w-3 mr-1" />
      {status === "active" ? "Activa" : status === "suspended" ? "Suspendida" : "Cancelada"}
    </Badge>
  );
}

function getTierBadge(tier: string) {
  const colors: Record<string, string> = {
    basic: "bg-gray-100 text-gray-800",
    pro: "bg-blue-100 text-blue-800",
    premium: "bg-purple-100 text-purple-800",
  };
  return (
    <Badge className={colors[tier] || colors.basic}>
      <Crown className="h-3 w-3 mr-1" />
      {tier === "basic" ? "Básico" : tier === "pro" ? "Pro" : tier === "premium" ? "Premium" : tier}
    </Badge>
  );
}

export default function OrgDetailHeader({ name, slug, status, subscriptionTier, onAction, onEdit, onDelete }: OrgDetailHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/admin/saas-management/organizations">
          <Button size="sm" variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">{name}</h1>
            {getStatusBadge(status)}
            {getTierBadge(subscriptionTier)}
          </div>
          <p className="text-admin-text-tertiary mt-1">{slug}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {status === "active" ? (
          <Button variant="outline" onClick={() => onAction("suspend")}>
            <Pause className="h-4 w-4 mr-2" /> Suspender
          </Button>
        ) : (
          <Button variant="outline" onClick={() => onAction("activate")}>
            <Play className="h-4 w-4 mr-2" /> Activar
          </Button>
        )}
        <Button onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" /> Editar
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" /> Eliminar
        </Button>
      </div>
    </div>
  );
}
