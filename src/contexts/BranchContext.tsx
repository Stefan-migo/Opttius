"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuthContext } from "./AuthContext";

export interface Branch {
  id: string;
  name: string;
  code: string;
  role?: string;
  is_primary?: boolean;
}

interface BranchContextType {
  branches: Branch[];
  currentBranch: Branch | null;
  isGlobalView: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  setCurrentBranch: (branchId: string | "global" | null) => Promise<void>;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const STORAGE_KEY = "selected_branch_id";

interface BranchProviderProps {
  children: ReactNode;
}

export function BranchProvider({ children }: BranchProviderProps) {
  const { user, loading: authLoading } = useAuthContext();
  const pathname = usePathname();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranchState] = useState<Branch | null>(null);
  const [isGlobalView, setIsGlobalView] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastOrganizationIdRef = useRef<string | null>(null);

  // Función optimizada para inicializar desde localStorage (solo para super admins)
  const initializeFromStorage = (availableBranches: Branch[]) => {
    const savedBranchId = localStorage.getItem(STORAGE_KEY);

    if (savedBranchId === "global") {
      setCurrentBranchState(null);
      setIsGlobalView(true);
    } else if (savedBranchId) {
      const branch = availableBranches.find((b) => b.id === savedBranchId);
      if (branch) {
        setCurrentBranchState(branch);
        setIsGlobalView(false);
      } else {
        // Saved branch no longer exists, default to global view
        setCurrentBranchState(null);
        setIsGlobalView(true);
        localStorage.setItem(STORAGE_KEY, "global");
      }
    } else {
      // No saved selection, default to global view
      setCurrentBranchState(null);
      setIsGlobalView(true);
      localStorage.setItem(STORAGE_KEY, "global");
    }
  };

  const fetchBranches = async (forceRefresh: boolean = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Para super admins: si ya está inicializado y no es un refresh forzado,
    // solo validar que la sucursal guardada aún existe (sin hacer petición al servidor).
    // Si organizationId cambió (ej. usuario activó su óptica real), NO saltar: forzar re-fetch.
    if (isSuperAdmin && isInitialized && !forceRefresh) {
      const savedBranchId = localStorage.getItem(STORAGE_KEY);

      // Si hay una sucursal guardada, verificar que aún existe en la lista actual
      if (savedBranchId && savedBranchId !== "global") {
        const branchExists = branches.some((b) => b.id === savedBranchId);
        if (!branchExists) {
          // La sucursal ya no existe, actualizar a global view
          setCurrentBranchState(null);
          setIsGlobalView(true);
          localStorage.setItem(STORAGE_KEY, "global");
        }
      }
      // No hacer petición al servidor - usar datos en memoria
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/branches");

      if (!response.ok) {
        throw new Error("Failed to fetch branches");
      }

      const data = await response.json();
      const serverIsSuperAdmin = data.isSuperAdmin || false;
      const responseOrgId = data.organizationId ?? null;
      setBranches(data.branches || []);
      setIsSuperAdmin(serverIsSuperAdmin);

      // Track organizationId for change detection (e.g. user activated real org)
      lastOrganizationIdRef.current = responseOrgId;

      // For super admins, prioritize localStorage to maintain selection across page reloads
      // For regular admins, use server values (they have assigned branches)
      if (serverIsSuperAdmin) {
        // Para super admins, usar localStorage como fuente de verdad
        initializeFromStorage(data.branches || []);
      } else {
        // Regular admin: use server values (they have assigned branches)
        setIsGlobalView(data.isGlobalView || false);

        // Check localStorage first, but validate it exists in available branches
        const savedBranchId = localStorage.getItem(STORAGE_KEY);
        let branchToUse: Branch | undefined;

        if (savedBranchId && savedBranchId !== "global") {
          // Validate saved branch still exists and user has access
          branchToUse = data.branches?.find(
            (b: Branch) => b.id === savedBranchId,
          );
        }

        // If no valid saved branch, use primary branch or first available
        if (!branchToUse) {
          branchToUse =
            data.branches?.find((b: Branch) => b.is_primary) ||
            data.branches?.[0];
        }

        if (branchToUse) {
          setCurrentBranchState(branchToUse);
          localStorage.setItem(STORAGE_KEY, branchToUse.id);
        } else if (data.branches && data.branches.length > 0) {
          // Fallback: use first branch if no primary found
          const firstBranch = data.branches[0];
          setCurrentBranchState(firstBranch);
          localStorage.setItem(STORAGE_KEY, firstBranch.id);
        }
      }

      setIsInitialized(true);
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentBranch = async (branchId: string | "global" | null) => {
    if (branchId === "global") {
      if (!isSuperAdmin) {
        console.error("Only super admins can use global view");
        return;
      }
      setCurrentBranchState(null);
      setIsGlobalView(true);
      localStorage.setItem(STORAGE_KEY, "global");
      // No need to notify server - localStorage is source of truth for super admins
    } else if (branchId) {
      const branch = branches.find((b) => b.id === branchId);
      if (branch) {
        setCurrentBranchState(branch);
        setIsGlobalView(false);
        localStorage.setItem(STORAGE_KEY, branch.id);
        // No need to notify server - localStorage is source of truth for super admins
      }
    }
  };

  // Fetch organizationId to detect org changes (e.g. user activated real optica from demo)
  useEffect(() => {
    if (!user || authLoading) return;

    let cancelled = false;
    const loadOrgId = async () => {
      try {
        const res = await fetch("/api/admin/check-status");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const orgId = data.organization?.organizationId ?? null;

        if (cancelled) return;

        // Reset when organization changed (e.g. demo -> real optica)
        if (
          lastOrganizationIdRef.current !== null &&
          lastOrganizationIdRef.current !== orgId
        ) {
          setIsInitialized(false);
          setBranches([]);
          setCurrentBranchState(null);
          setIsGlobalView(false);
          localStorage.removeItem(STORAGE_KEY);
        }
        lastOrganizationIdRef.current = orgId;
      } catch {
        // Ignore - check-status may fail if not admin
      }
    };
    loadOrgId();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, pathname]);

  // Inicializar cuando el usuario se autentica o cuando se resetea por cambio de org
  useEffect(() => {
    if (!authLoading && user && !isInitialized) {
      fetchBranches();
    } else if (!authLoading && !user) {
      setIsLoading(false);
      setBranches([]);
      setCurrentBranchState(null);
      setIsInitialized(false);
      lastOrganizationIdRef.current = null;
      localStorage.removeItem(STORAGE_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isInitialized]);

  return (
    <BranchContext.Provider
      value={{
        branches,
        currentBranch,
        isGlobalView,
        isSuperAdmin,
        isLoading,
        setCurrentBranch,
        refreshBranches: () => fetchBranches(true),
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error("useBranchContext must be used within a BranchProvider");
  }
  return context;
}
