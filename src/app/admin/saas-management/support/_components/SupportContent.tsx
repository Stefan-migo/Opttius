"use client";

import { ArrowLeft, MessageSquare, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SupportMetrics } from "@/components/admin/saas-support/SupportMetrics";
import { Button } from "@/components/ui/button";
import {
  extractDataFromResponse,
  extractPaginationFromResponse,
} from "@/lib/api/response-helpers";

import { SupportSearchResults } from "./SupportSearchResults";
import { SupportTicketFilters } from "./SupportTicketFilters";
import { SupportTicketList } from "./SupportTicketList";

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

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  organization?: { id: string; name: string; slug: string } | null;
  assigned_to_user?: { id: string; email: string; role: string } | null;
}

const statusLabels: Record<string, string> = {
  open: "Abierto",
  assigned: "Asignado",
  in_progress: "En Progreso",
  waiting_customer: "Esperando Cliente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  assigned: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-purple-100 text-purple-800",
  waiting_customer: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const categoryLabels: Record<string, string> = {
  technical: "Técnico",
  billing: "Facturación",
  feature_request: "Funcionalidad",
  bug_report: "Bug",
  account: "Cuenta",
  other: "Otro",
};

export default function SupportContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"tickets" | "metrics" | "search">(
    "tickets",
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult>({
    organizations: [],
    users: [],
  });
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    category: "all",
    search: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Load tickets
  useEffect(() => {
    loadTickets();
  }, [filters, pagination.page]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.status && filters.status !== "all") {
        params.append("status", filters.status);
      }
      if (filters.priority && filters.priority !== "all") {
        params.append("priority", filters.priority);
      }
      if (filters.category && filters.category !== "all") {
        params.append("category", filters.category);
      }
      if (filters.search) {
        params.append("search", filters.search);
      }

      const response = await fetch(
        `/api/admin/saas-management/support/tickets?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Error al cargar tickets");
      }

      const data = await response.json();
      const paginationData = extractPaginationFromResponse(data);
      setTickets(extractDataFromResponse(data));
      setPagination((prev) => ({
        ...prev,
        total: paginationData.total || 0,
        totalPages: paginationData.totalPages || 0,
      }));
    } catch (err) {
      toast.error("Error al cargar tickets");
    } finally {
      setLoadingTickets(false);
    }
  };

  // Search functionality
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch();
      } else {
        setSearchResults({ organizations: [], users: [] });
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const performSearch = async () => {
    setSearching(true);
    setHasSearched(true);
    try {
      const response = await fetch(
        `/api/admin/saas-management/support/search?q=${encodeURIComponent(searchQuery)}`,
      );

      if (!response.ok) {
        throw new Error("Error en la búsqueda");
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      toast.error("Error al realizar búsqueda");
      setSearchResults({ organizations: [], users: [] });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-[#0D1117] min-h-screen">
      <div className="flex items-center gap-4">
        <Button
          className="rounded-xl text-white hover:bg-white/10"
          size="icon"
          title="Volver al dashboard"
          variant="ghost"
          onClick={() => router.push("/admin/saas-management/dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Panel de Soporte
          </h1>
          <p className="text-white/50 mt-2">
            Gestión de tickets de soporte SaaS y búsqueda rápida
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <Button
          className={`rounded-xl rounded-b-none ${activeTab === "tickets" ? "bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase" : "text-epoch-primary"}`}
          variant={activeTab === "tickets" ? "default" : "ghost"}
          onClick={() => setActiveTab("tickets")}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Tickets de Soporte
        </Button>
        <Button
          className={`rounded-xl rounded-b-none ${activeTab === "search" ? "bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase" : "text-epoch-primary"}`}
          variant={activeTab === "search" ? "default" : "ghost"}
          onClick={() => setActiveTab("search")}
        >
          <Search className="h-4 w-4 mr-2" />
          Búsqueda Rápida
        </Button>
      </div>

      {/* Metrics Tab */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          <SupportMetrics />
        </div>
      )}

      {/* Tickets Tab */}
      {activeTab === "tickets" && (
        <div className="space-y-6">
          <SupportTicketFilters
            categoryLabels={categoryLabels}
            filters={filters}
            statusLabels={statusLabels}
            onFilterChange={(updates) =>
              setFilters((prev) => ({ ...prev, ...updates, page: 1 }))
            }
            onRefresh={loadTickets}
          />

          <SupportTicketList
            categoryLabels={categoryLabels}
            loading={loadingTickets}
            page={pagination.page}
            priorityColors={priorityColors}
            statusColors={statusColors}
            statusLabels={statusLabels}
            tickets={tickets}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(page) =>
              setPagination((prev) => ({ ...prev, page }))
            }
          />
        </div>
      )}

      {/* Search Tab */}
      {activeTab === "search" && (
        <SupportSearchResults
          hasSearched={hasSearched}
          searching={searching}
          searchQuery={searchQuery}
          searchResults={searchResults}
          onSearchQueryChange={setSearchQuery}
        />
      )}
    </div>
  );
}
