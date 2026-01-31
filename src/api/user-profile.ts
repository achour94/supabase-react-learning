import { supabase } from "../supabase-client";
import type { Database } from "../types/supabase";

export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"]
export type UserProfileInsert = Database["public"]["Tables"]["user_profiles"]["Insert"]
export type UserProfileUpdate = Database["public"]["Tables"]["user_profiles"]["Update"]
export type AccountType = Database["public"]["Enums"]["account_type"]


/**
 * Fetches the current user's profile from the database.
 * Returns null if no profile exists.
 */
export async function getCurrentUserProfile(): Promise<{
  data: UserProfile | null;
  error: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "User not authenticated" };
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    // Handle case where profile doesn't exist yet
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Updates the current user's profile.
 * Only allows updating the name field (account_type changes require admin privileges).
 */
export async function updateUserProfile(name: string): Promise<{
  data: UserProfile | null;
  error: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "User not authenticated" };
  }

  if (!name.trim()) {
    return { data: null, error: "Name is required" };
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .update({ name: name.trim() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Creates a user profile manually (used as fallback if trigger doesn't fire).
 * This is typically called after signup if the database trigger fails.
 */
export async function createUserProfile(
  userId: string,
  name: string
): Promise<{
  data: UserProfile | null;
  error: string | null;
}> {
  if (!name.trim()) {
    return { data: null, error: "Name is required" };
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .insert({
      id: userId,
      name: name.trim(),
      account_type: "member",
    })
    .select()
    .single();

  if (error) {
    // Profile might already exist (created by trigger)
    if (error.code === "23505") {
      // Unique violation - profile already exists, try to update instead
      return updateUserProfileById(userId, name);
    }
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Updates a user profile by ID (internal use for handling duplicate creation attempts).
 */
async function updateUserProfileById(
  userId: string,
  name: string
): Promise<{
  data: UserProfile | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ name: name.trim() })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Checks if the current user is an admin.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data } = await getCurrentUserProfile();
  return data?.account_type === "admin";
}
