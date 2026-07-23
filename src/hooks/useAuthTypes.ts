import type { AuthError, Session, User } from "@supabase/supabase-js";

import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}
