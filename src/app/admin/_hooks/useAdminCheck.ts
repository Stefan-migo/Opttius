"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuthContext } from "@/contexts/AuthContext";

/**
 * Hook that manages admin authentication check, role detection, and redirect logic.
 * Extracted from AdminShell.tsx to reduce component complexity.
 */
export function useAdminCheck() {
  const { user, loading, signOut } = useAuthContext();
  const router = useRouter();

  // Admin state management - using combined state to prevent race conditions
  const [adminState, setAdminState] = useState<{
    isChecking: boolean;
    isAdmin: boolean;
    hasChecked: boolean;
    checkedUserId: string | null;
  }>({
    isChecking: true,
    isAdmin: false,
    hasChecked: false,
    checkedUserId: null,
  });

  // Admin role (admin, super_admin, employee, vendedor, root, dev)
  const [adminRole, setAdminRole] = useState<string | null>(null);

  // Prevent multiple simultaneous admin checks
  const [isAdminCheckInProgress, setIsAdminCheckInProgress] = useState(false);

  // Prevent multiple redirects
  const redirectInProgress = useRef(false);

  // Ref to read current user in setTimeout (avoids stale closure)
  const latestUserRef = useRef(user);
  latestUserRef.current = user;

  // Skip any redirect to onboarding during sign-out (avoids race)
  const signOutInProgress = useRef(false);

  // Debug mode
  const debugMode =
    typeof window !== "undefined" &&
    localStorage.getItem("admin-debug") === "true";

  // Admin status check effect
  useEffect(() => {
    const checkAdminStatus = async () => {
      // Don't check admin status if auth is still loading
      if (loading) {
        return;
      }

      if (!user) {
        setAdminState({
          isChecking: false,
          isAdmin: false,
          hasChecked: true,
          checkedUserId: null,
        });
        return;
      }

      // Additional check: ensure valid user with email
      if (!user.email) {
        setAdminState({
          isChecking: false,
          isAdmin: false,
          hasChecked: false,
          checkedUserId: null,
        });
        return;
      }

      // Skip admin check if already checked this exact user ID
      if (
        adminState.hasChecked &&
        adminState.checkedUserId === user.id &&
        adminState.isAdmin
      ) {
        return;
      }

      // Prevent multiple simultaneous admin checks
      if (isAdminCheckInProgress) {
        return;
      }

      setIsAdminCheckInProgress(true);
      setAdminState((prev) => ({
        ...prev,
        isChecking: true,
        hasChecked: false,
      }));

      try {
        if (debugMode) {
          setAdminState({
            isChecking: false,
            isAdmin: true,
            hasChecked: true,
            checkedUserId: user.id,
          });
          setIsAdminCheckInProgress(false);
          return;
        }

        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();

        const adminCheckPromise = supabase.rpc("is_admin", {
          user_id: user.id,
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Admin check timeout")), 10000),
        );

        const raceResult = (await Promise.race([
          adminCheckPromise,
          timeoutPromise,
        ])) as { data: unknown; error: { message: string } | null };
        const { data, error } = raceResult;

        let isAdminResult = false;

        if (error) {
          if (
            error.message !== "Admin check timeout" &&
            process.env.NODE_ENV === "development"
          ) {
            console.error("❌ Error checking admin status:", error);
          }
          isAdminResult = false;
        } else {
          isAdminResult = !!data;
        }

        setAdminState({
          isChecking: false,
          isAdmin: isAdminResult,
          hasChecked: true,
          checkedUserId: user.id,
        });
        setIsAdminCheckInProgress(false);
      } catch (error: unknown) {
        if (error instanceof Error && error.message === "Admin check timeout") {
          console.error("⏱️ Admin check timed out - assuming not admin");
        } else if (error instanceof Error) {
          console.error("❌ Error checking admin status:", error);
        } else {
          console.error("❌ Error checking admin status:", error);
        }

        setAdminState({
          isChecking: false,
          isAdmin: false,
          hasChecked: true,
          checkedUserId: user.id,
        });
        setIsAdminCheckInProgress(false);
      }
    };

    checkAdminStatus();
  }, [user?.id, loading]);

  // Redirect effect
  useEffect(() => {
    if (redirectInProgress.current) {
      return;
    }

    if (!loading && adminState.hasChecked && !adminState.isChecking) {
      if (user && user.email && adminState.isAdmin) {
        return;
      }

      const delayRedirect = () => {
        redirectInProgress.current = true;
        setTimeout(() => {
          const currentUser = latestUserRef.current;

          if (!currentUser || !currentUser.email) {
            if (signOutInProgress.current) return;
            router.push("/login");
            return;
          }

          if (!adminState.isAdmin) {
            router.push("/onboarding/choice");
            return;
          }
        }, 800);
      };

      if (!user || !user.email || !adminState.isAdmin) {
        delayRedirect();
      }
    }
  }, [
    user?.id,
    adminState.hasChecked,
    adminState.isChecking,
    adminState.isAdmin,
    loading,
    router,
  ]);

  // Reset redirect/signOut flags when user changes
  useEffect(() => {
    redirectInProgress.current = false;
    if (user?.id) signOutInProgress.current = false;
  }, [user?.id]);

  const handleSignOut = async () => {
    signOutInProgress.current = true;
    await signOut();
    router.push("/");
  };

  const isStillChecking =
    loading || adminState.isChecking || !adminState.hasChecked;

  return {
    adminState,
    adminRole,
    signOutInProgress,
    handleSignOut,
    isStillChecking,
    setAdminRole,
    redirectInProgress,
    latestUserRef,
  };
}
