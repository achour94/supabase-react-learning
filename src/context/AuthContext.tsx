import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../supabase-client';
import { AuthContext, type AuthState, type SignUpData } from './auth-context';
import { getCurrentUserProfile, createUserProfile, type UserProfile } from '../api/user-profile';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider - Single source of truth for authentication state
 *
 * Uses onAuthStateChange as the primary mechanism to avoid race conditions.
 * Profile fetching is decoupled from auth state changes and triggered explicitly.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    userProfile: null,
    isLoading: true,
  });

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Track current user ID to prevent redundant profile fetches
  const currentUserIdRef = useRef<string | null>(null);

  // Track if initial auth check is complete
  const isInitializedRef = useRef(false);

  /**
   * Fetches user profile from database.
   * Only fetches if user ID changed to prevent redundant requests.
   */
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    // Skip if same user (profile already loaded or being loaded)
    if (currentUserIdRef.current === userId) {
      return null;
    }

    currentUserIdRef.current = userId;
    const { data } = await getCurrentUserProfile();
    return data;
  }, []);

  /**
   * Refresh user profile - exposed to components for manual refresh
   */
  const refreshUserProfile = useCallback(async () => {
    if (!isMountedRef.current) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isMountedRef.current) return;

    // Force refresh by clearing the current user ID
    currentUserIdRef.current = null;
    const profile = await fetchUserProfile(user.id);

    if (isMountedRef.current && profile) {
      setAuthState((prev) => ({
        ...prev,
        userProfile: profile,
      }));
    }
  }, [fetchUserProfile]);

  /**
   * Updates auth state based on session.
   * Handles profile fetching for sign-in events only.
   */
  const handleAuthChange = useCallback(async (
    event: AuthChangeEvent,
    session: Session | null
  ) => {
    if (!isMountedRef.current) return;

    const user = session?.user ?? null;

    // Determine if we should fetch the profile
    // Only fetch on actual sign-in, not on token refresh or initial session
    const shouldFetchProfile =
      event === 'SIGNED_IN' &&
      user &&
      currentUserIdRef.current !== user.id;

    // Update auth state immediately (user/session)
    setAuthState((prev) => ({
      ...prev,
      user,
      session,
      isLoading: false,
      // Clear profile on sign out
      userProfile: event === 'SIGNED_OUT' ? null : prev.userProfile,
    }));

    // Fetch profile asynchronously for sign-in events
    if (shouldFetchProfile && user) {
      const profile = await fetchUserProfile(user.id);

      if (isMountedRef.current && profile) {
        setAuthState((prev) => ({
          ...prev,
          userProfile: profile,
        }));
      }
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    isMountedRef.current = true;

    // Set up auth state listener FIRST (single source of truth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip INITIAL_SESSION if we already handled it via getSession
        if (event === 'INITIAL_SESSION' && isInitializedRef.current) {
          return;
        }

        handleAuthChange(event, session);
      }
    );

    // Get initial session synchronously to prevent flash
    // This runs BEFORE the listener fires INITIAL_SESSION
    const initializeAuth = async () => {
      if (isInitializedRef.current) return;

      const { data: { session } } = await supabase.auth.getSession();

      if (!isMountedRef.current) return;

      isInitializedRef.current = true;

      const user = session?.user ?? null;

      // Set initial state without profile
      setAuthState({
        user,
        session,
        userProfile: null,
        isLoading: false,
      });

      // Fetch profile separately if user exists
      if (user) {
        const profile = await fetchUserProfile(user.id);

        if (isMountedRef.current && profile) {
          setAuthState((prev) => ({
            ...prev,
            userProfile: profile,
          }));
        }
      }
    };

    initializeAuth();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [handleAuthChange, fetchUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signUp = useCallback(async ({ email, password, name }: SignUpData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    });

    if (error) {
      return { error };
    }

    // Create profile as fallback if database trigger doesn't fire
    if (data.user) {
      const { error: profileError } = await createUserProfile(data.user.id, name);

      if (profileError && !profileError.includes('already exists')) {
        // Non-critical error, profile may be created by trigger
      }
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    // Reset refs before signing out
    currentUserIdRef.current = null;

    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        signIn,
        signUp,
        signOut,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
