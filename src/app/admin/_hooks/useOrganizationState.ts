"use client";

import { useRouter } from "next/navigation";
import { MutableRefObject, useEffect, useState } from "react";

import { useAuthContext } from "@/contexts/AuthContext";
import { useRoot } from "@/hooks/useRoot";

export interface OrganizationState {
  hasOrganization: boolean | null;
  organizationName: string | null;
  organizationLogo: string | null;
  organizationSlogan: string | null;
  isDemoMode: boolean;
  showActivateBanner: boolean;
  onboardingRequired: boolean;
  isChecking: boolean;
  tierFeatures?: Record<string, boolean>;
}

interface UseOrganizationStateParams {
  adminState: { isAdmin: boolean; hasChecked: boolean };
  signOutInProgress: MutableRefObject<boolean>;
  setAdminRole: (role: string | null) => void;
}

/**
 * Hook that manages organization state and status checking.
 * Extracted from AdminShell.tsx to reduce component complexity.
 */
export function useOrganizationState({
  adminState,
  signOutInProgress,
  setAdminRole,
}: UseOrganizationStateParams) {
  const { user, loading } = useAuthContext();
  const { isRoot, isLoading: isRootLoading } = useRoot();
  const router = useRouter();

  const [organizationState, setOrganizationState] = useState<OrganizationState>(
    {
      hasOrganization: null,
      organizationName: null,
      organizationLogo: null,
      organizationSlogan: null,
      isDemoMode: false,
      showActivateBanner: false,
      onboardingRequired: false,
      isChecking: true,
    },
  );

  // Check organization status
  useEffect(() => {
    const checkOrganization = async () => {
      if (
        !adminState.isAdmin ||
        !adminState.hasChecked ||
        !user ||
        loading ||
        isRootLoading
      ) {
        if (!adminState.isAdmin && adminState.hasChecked) {
          setOrganizationState({
            hasOrganization: false,
            organizationName: null,
            organizationLogo: null,
            organizationSlogan: null,
            isDemoMode: false,
            showActivateBanner: false,
            onboardingRequired: false,
            isChecking: false,
          });
        }
        return;
      }

      if (isRoot) {
        setOrganizationState({
          hasOrganization: true,
          organizationName: null,
          organizationLogo: null,
          organizationSlogan: null,
          isDemoMode: false,
          showActivateBanner: false,
          onboardingRequired: false,
          isChecking: false,
        });
        return;
      }

      setOrganizationState((prev) => ({ ...prev, isChecking: true }));

      try {
        const response = await fetch("/api/admin/check-status");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.organization) {
          const isRootUser = data.organization.isRootUser || false;
          setAdminRole(data.adminCheck?.role ?? null);
          const orgState: OrganizationState = {
            hasOrganization: data.organization.hasOrganization || isRootUser,
            organizationName: data.organization.organizationName || null,
            organizationLogo: data.organization.organizationLogo || null,
            organizationSlogan: data.organization.organizationSlogan || null,
            isDemoMode: data.organization.isDemoMode || false,
            showActivateBanner:
              data.organization.showActivateBanner ??
              data.organization.isDemoMode ??
              false,
            onboardingRequired:
              data.organization.onboardingRequired && !isRootUser,
            isChecking: false,
            tierFeatures: data.organization.tierFeatures ?? {},
          };

          setOrganizationState(orgState);

          if (
            !signOutInProgress.current &&
            orgState.onboardingRequired &&
            !orgState.hasOrganization &&
            !data.organization.isSuperAdmin &&
            !isRootUser
          ) {
            router.push("/onboarding/choice");
            return;
          }

          if (isRootUser) {
            // Allow direct access
          }
        } else {
          setAdminRole(data.adminCheck?.role ?? null);

          if (isRoot) {
            setAdminRole("root");
            setOrganizationState({
              hasOrganization: true,
              organizationName: null,
              organizationLogo: null,
              organizationSlogan: null,
              isDemoMode: false,
              showActivateBanner: false,
              onboardingRequired: false,
              isChecking: false,
            });
            return;
          }

          setOrganizationState({
            hasOrganization: false,
            organizationName: null,
            organizationLogo: null,
            organizationSlogan: null,
            isDemoMode: false,
            showActivateBanner: false,
            onboardingRequired: true,
            isChecking: false,
          });

          if (!signOutInProgress.current) {
            router.push("/onboarding/choice");
          }
          return;
        }
      } catch (error) {
        if (isRoot) {
          setOrganizationState({
            hasOrganization: true,
            organizationName: null,
            organizationLogo: null,
            organizationSlogan: null,
            isDemoMode: false,
            showActivateBanner: false,
            onboardingRequired: false,
            isChecking: false,
          });
        } else {
          setOrganizationState({
            hasOrganization: false,
            organizationName: null,
            organizationLogo: null,
            organizationSlogan: null,
            isDemoMode: false,
            showActivateBanner: false,
            onboardingRequired: true,
            isChecking: false,
          });
          if (!signOutInProgress.current) {
            router.push("/onboarding/choice");
          }
        }
      }
    };

    checkOrganization();
  }, [
    adminState.isAdmin,
    adminState.hasChecked,
    user,
    loading,
    router,
    isRoot,
    isRootLoading,
  ]);

  return { organizationState };
}
