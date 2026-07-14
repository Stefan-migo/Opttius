import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Search,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SearchResult {
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    subscription_tier: string;
  }>;
  users: Array<{
    id: string;
    email: string;
    role: string;
    is_active: boolean;
    organization_id?: string;
    organization?: { id: string; name: string; slug: string };
    profiles?: { first_name?: string; last_name?: string };
  }>;
}

interface SupportSearchResultsProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchResults: SearchResult;
  searching: boolean;
  hasSearched: boolean;
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    active: "default",
    suspended: "secondary",
    cancelled: "destructive",
  };
  const Icon = status === "active" ? CheckCircle2 : XCircle;
  return (
    <Badge variant={variants[status] || "default"}>
      <Icon className="h-3 w-3 mr-1" />
      {status === "active" ? "Activa" : status === "suspended" ? "Suspendida" : "Cancelada"}
    </Badge>
  );
}

export function SupportSearchResults({
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searching,
  hasSearched,
}: SupportSearchResultsProps) {
  return (
    <div className="space-y-6">
      <Card className="admin-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-epoch-accent" />
            <Input
              className="pl-10 rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
              placeholder="Buscar por nombre, slug, email..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
          </div>
          {searching && (
            <div className="flex items-center gap-2 mt-4 text-sm text-epoch-primary/80">
              Buscando...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      {hasSearched && !searching && (
        <div className="space-y-6">
          {searchResults.organizations.length > 0 && (
            <Card className="admin-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-epoch-primary">
                  <Building2 className="h-5 w-5 text-epoch-accent" />
                  Organizaciones ({searchResults.organizations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {searchResults.organizations.map((org) => (
                    <div
                      className="flex items-center justify-between p-4 border rounded-xl hover:bg-epoch-primary/5 transition-colors"
                      key={org.id}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-epoch-primary">{org.name}</h3>
                          {getStatusBadge(org.status)}
                          <Badge variant="outline">{org.subscription_tier}</Badge>
                        </div>
                        <p className="text-sm text-epoch-primary/70 mt-1">{org.slug}</p>
                      </div>
                      <Link href={`/admin/saas-management/organizations/${org.id}`}>
                        <Button className="rounded-xl border-admin-border-primary/20" size="sm" variant="outline">
                          Ver detalles
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {searchResults.users.length > 0 && (
            <Card className="admin-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-epoch-primary">
                  <User className="h-5 w-5 text-epoch-accent" />
                  Usuarios ({searchResults.users.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {searchResults.users.map((user) => (
                    <div
                      className="flex items-center justify-between p-4 border rounded-xl hover:bg-epoch-primary/5 transition-colors"
                      key={user.id}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-epoch-primary">
                            {user.profiles?.first_name} {user.profiles?.last_name}
                          </h3>
                          <Badge variant="outline">{user.role}</Badge>
                          {user.is_active ? (
                            <Badge variant="default">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactivo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-epoch-primary/70 mt-1">{user.email}</p>
                        {user.organization && (
                          <p className="text-xs text-epoch-primary/60 mt-1">
                            Organización: {user.organization.name}
                          </p>
                        )}
                      </div>
                      <Link href={`/admin/saas-management/users/${user.id}`}>
                        <Button className="rounded-xl border-admin-border-primary/20" size="sm" variant="outline">
                          Ver detalles
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {searchResults.organizations.length === 0 &&
            searchResults.users.length === 0 && (
              <Card className="admin-card">
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-epoch-primary/70">
                    No se encontraron resultados para &ldquo;{searchQuery}&rdquo;
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      )}

      {!hasSearched && (
        <Card className="admin-card">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-epoch-primary/70">
              <Search className="h-12 w-12 mx-auto mb-4 text-epoch-accent" />
              <p className="text-lg font-medium mb-2">Busca organizaciones o usuarios</p>
              <p className="text-sm">Ingresa al menos 2 caracteres para comenzar la búsqueda</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
