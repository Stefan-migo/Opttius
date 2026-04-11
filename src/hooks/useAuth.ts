"use client";

import { AuthError, Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { Tables } from "@/types/database";
import { createClient } from "@/utils/supabase/client";

type Profile = Tables<"profiles">;

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

/**
 * @param initialUser - Usuario validado en servidor (getUser). Evita redirect erróneo
 * cuando el cliente aún no tiene sesión en document.cookie (nueva pestaña/refresh).
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

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const supabase = createClient();
    try {
      // Add timeout to profile fetch with more graceful handling
      const profilePromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 5000),
      );

      const { data, error } = (await Promise.race([
        profilePromise,
        timeoutPromise,
      ])) as {
        data: Profile | null;
        error: { code?: string; message?: string } | null;
      };

      if (error) {
        // Handle different error types more gracefully
        if (error.message === "Profile fetch timeout") {
          console.warn(
            "⏱️ Profile fetch timed out - this is normal for new users or slow connections",
          );
          return null;
        }

        if (error.code === "PGRST116") {
          console.log(
            "📝 Profile not found for user - will be created automatically on first update",
          );
          return null;
        }

        // Only log actual errors, not expected cases
        if (error.code !== "42P01") {
          // Table doesn't exist
          console.error("❌ Profile fetch error:", error);
        }
        return null;
      }

      console.log("✅ Profile loaded successfully");
      return data;
    } catch (error) {
      // More specific error handling
      if (error instanceof Error && error.message === "Profile fetch timeout") {
        console.warn(
          "⏱️ Profile fetch timeout - continuing without profile data",
        );
      } else {
        console.error("❌ Unexpected profile fetch error:", error);
      }
      return null;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    },
  ) => {
    const supabase = createClient();
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Create auth user - handle_new_user trigger creates profile with SECURITY DEFINER
      // (bypasses RLS). We pass phone in metadata so the trigger can include it.
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.opttius.cl"}/login`;

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

      // Profile is created by handle_new_user trigger (SECURITY DEFINER - bypasses RLS).
      // No client-side upsert needed - the trigger includes first_name, last_name, phone.
      // When email confirmation is required, auth.uid() is null so client upsert would fail with RLS.

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

      // Don't set loading false here - let the auth state change handler do it
      // This prevents race conditions
      return { data, error: null };
    } catch (error) {
      console.error("SignIn error:", error);
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
