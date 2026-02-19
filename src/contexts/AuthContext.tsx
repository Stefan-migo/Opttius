"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth, AuthState } from "@/hooks/useAuth";
import { Tables } from "@/types/database";
import { createClient } from "@/utils/supabase/client";
import {
  IsAdminParams,
  IsAdminResult,
  GetAdminRoleParams,
  GetAdminRoleResult,
} from "@/types/supabase-rpc";

type Profile = Tables<"profiles">;

interface AuthContextType extends AuthState {
  signUp: (
    email: string,
    password: string,
    userData?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    },
  ) => Promise<{ data: any; error: any }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  refetchProfile: () => Promise<Profile | null> | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper functions for admin checks
async function checkAdminStatus(
  userId: string,
): Promise<{ isAdmin: boolean; role: string | null }> {
  const supabase = createClient();

  try {
    // Check if user is admin
    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: userId,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };

    // Get admin role
    const { data: adminRole } = (await supabase.rpc("get_admin_role", {
      user_id: userId,
    } as GetAdminRoleParams)) as {
      data: GetAdminRoleResult | null;
      error: Error | null;
    };

    return {
      isAdmin: !!isAdmin,
      role: adminRole || null,
    };
  } catch (error) {
    console.error("Error checking admin status:", error);
    return {
      isAdmin: false,
      role: null,
    };
  }
}

interface AuthProviderProps {
  children: ReactNode;
  /** Usuario validado en servidor - evita redirect erróneo en nueva pestaña/refresh */
  initialUser?: User | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const auth = useAuth(initialUser);
  const [adminData, setAdminData] = useState<{
    isAdmin: boolean;
    isSuperAdmin: boolean;
    adminRole: string | null;
  }>({
    isAdmin: false,
    isSuperAdmin: false,
    adminRole: null,
  });

  useEffect(() => {
    let mounted = true;

    if (auth.user) {
      checkAdminStatus(auth.user.id).then((data) => {
        if (!mounted) return;
        setAdminData({
          isAdmin: data.isAdmin,
          isSuperAdmin:
            data.role === "super_admin" ||
            data.role === "root" ||
            data.role === "dev",
          adminRole: data.role,
        });
      });
    } else {
      setAdminData({ isAdmin: false, isSuperAdmin: false, adminRole: null });
    }

    return () => {
      mounted = false;
    };
  }, [auth.user]);

  const contextValue: AuthContextType = {
    ...auth,
    ...adminData,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
}

// Convenient hook for checking if user is authenticated
export function useRequireAuth() {
  const { user, loading } = useAuthContext();

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isLoading: loading,
  };
}

// Hook for getting user profile with type safety
export function useProfile() {
  const { profile, user, loading } = useAuthContext();

  return {
    profile,
    user,
    loading,
    hasProfile: !!profile,
    isProfileLoading: loading && !!user,
  };
}
