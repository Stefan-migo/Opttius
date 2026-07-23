import { Tables } from "@/types/database";
import { createClient } from "@/utils/supabase/client";

type Profile = Tables<"profiles">;

/** Fetch user profile from Supabase with a 5-second timeout */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  try {
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
      if (error.message === "Profile fetch timeout") {
        console.warn(
          "⚠️ Profile fetch timed out - normal for new users or slow connections",
        );
        return null;
      }
      if (error.code === "PGRST116") {
        console.log(
          "📝 Profile not found - will be created automatically on first update",
        );
        return null;
      }
      if (error.code !== "42P01") {
        console.error("❌ Profile fetch error:", error);
      }
      return null;
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.message === "Profile fetch timeout") {
      console.warn("⚠️ Profile fetch timeout - continuing without profile");
    } else {
      console.error("❌ Unexpected profile fetch error:", error);
    }
    return null;
  }
}
