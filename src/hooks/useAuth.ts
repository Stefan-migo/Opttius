"use client";

import type { AuthError, Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { appLogger } from '@/lib/logger';
import { createClient } from "@/utils/supabase/client";

import { fetchProfile } from "./useAuthFetchProfile";
import type { AuthState, Profile } from "./useAuthTypes";
export type { AuthState } from "./useAuthTypes";

/**
 * @param initialUser - Usuario validado en servidor (getUser).
 */
export function useAuth(initialUser?: User | null) {
  const [authState, setAuthState] = useState<AuthState>({
    user: initialUser ?? null,
    profile: null,
    session: null,
    loading: !initialUser,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    let initialized = false;
    const supabase = createClient();

    const applyAuthState = (
      user: User | null,
      profile: Profile | null,
      session: Session | null,
    ) => {
      if (!mounted || initialized) return;
      initialized = true;
      setAuthState({
        user,
        profile,
        session,
        loading: false,
        error: null,
      });
    };

    // Si tenemos initialUser del servidor: confiar en él, cargar perfil y no ejecutar getSession
    // (evita race entre getSession e INITIAL_SESSION que causa loop en reload)
    if (initialUser) {
      fetchProfile(initialUser.id)
        .then((profile) => {
          if (!mounted) return;
          applyAuthState(initialUser, profile, null);
        })
        .catch(() => {
          if (!mounted) return;
          applyAuthState(initialUser, null, null);
        });
    } else {
      // Sin initialUser: usar getSession como fuente única inicial
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (!mounted) return;
        if (error) {
          setAuthState((prev) => ({ ...prev, error, loading: false }));
          return;
        }
        if (session?.user) {
          fetchProfile(session.user.id)
            .then((profile) => {
              if (!mounted) return;
              applyAuthState(session.user, profile, session);
            })
            .catch(() => {
              if (!mounted) return;
              applyAuthState(session.user, null, session);
            });
        } else {
          applyAuthState(null, null, null);
        }
      });
    }

    // Timeout de seguridad (5s)
    const timeoutId = setTimeout(() => {
      if (mounted && !initialized) {
        initialized = true;
        setAuthState((prev) => ({ ...prev, loading: false }));
      }
    }, 5000);

    // Solo para eventos posteriores (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      // Ignorar INITIAL_SESSION: ya manejado por initialUser o getSession
      if (event === "INITIAL_SESSION") return;

      if (event === "SIGNED_IN" && session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (!mounted) return;
        setAuthState({
          user: session.user,
          profile,
          session,
          loading: false,
          error: null,
        });
      } else if (event === "SIGNED_OUT") {
        setAuthState({
          user: null,
          profile: null,
          session: null,
          loading: false,
          error: null,
        });
      } else if (event === "TOKEN_REFRESHED" && session) {
        setAuthState((prev) => ({
          ...prev,
          session,
          user: session.user,
        }));
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    userData?: { firstName?: string; lastName?: string; phone?: string },
  ) => {
    const supabase = createClient();
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : `${process.env.NEXT_PUBLIC_APP_URL || "https://www.opttius.cl"}/login`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData?.firstName,
            last_name: userData?.lastName,
            phone: userData?.phone,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) {
        setAuthState((prev) => ({ ...prev, error: authError, loading: false }));
        throw authError;
      }

      setAuthState((prev) => ({ ...prev, loading: false }));
      return { data: authData, error: null };
    } catch (error) {
      const authError =
        error instanceof Error ? error : new Error("Unknown error");
      setAuthState((prev) => ({
        ...prev,
        error: authError as AuthError,
        loading: false,
      }));
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    const supabase = createClient();
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setAuthState((prev) => ({ ...prev, error, loading: false }));
        return { data: null, error };
      }
      return { data, error: null };
    } catch (error) {
      appLogger.error("SignIn error:", error);
      const authError =
        error instanceof Error ? error : new Error("Unknown error");
      setAuthState((prev) => ({
        ...prev,
        error: authError as AuthError,
        loading: false,
      }));
      return { data: null, error: authError as AuthError };
    }
  };

  const signOut = async () => {
    const supabase = createClient();
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthState((prev) => ({ ...prev, error, loading: false }));
      return { error };
    }
    return { error: null };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    const supabase = createClient();
    if (!authState.user) {
      throw new Error("No user logged in");
    }

    const previousProfile = authState.profile;
    const optimisticProfile = previousProfile
      ? { ...previousProfile, ...updates }
      : null;

    // Optimistic UI: update local state immediately
    if (optimisticProfile) {
      setAuthState((prev) => ({
        ...prev,
        profile: optimisticProfile as Profile,
      }));
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", authState.user.id)
      .select()
      .single();

    if (error) {
      // Revert on failure
      setAuthState((prev) => ({
        ...prev,
        profile: previousProfile,
      }));
      throw error;
    }

    setAuthState((prev) => ({
      ...prev,
      profile: data,
    }));

    return data;
  };

  const resetPassword = async (email: string) => {
    const supabase = createClient();
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setAuthState((prev) => ({ ...prev, error, loading: false }));
        throw error;
      }

      setAuthState((prev) => ({ ...prev, loading: false }));
      return { error: null };
    } catch (error) {
      const authError =
        error instanceof Error ? error : new Error("Unknown error");
      setAuthState((prev) => ({
        ...prev,
        error: authError as AuthError,
        loading: false,
      }));
      throw error;
    }
  };

  const refetchProfile = async (): Promise<Profile | null> => {
    if (!authState.user) return null;
    const profile = await fetchProfile(authState.user.id);
    setAuthState((prev) => ({ ...prev, profile }));
    return profile;
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    refetchProfile,
  };
}
