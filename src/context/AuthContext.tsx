import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../supabase-client';
import { AuthContext, type AuthState, type SignUpData } from './auth-context';
import { getCurrentUserProfile, createUserProfile } from '../api/user-profile';
import type { UserProfile } from '../types/supabase';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    userProfile: null,
    isLoading: true,
  });

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    const { data } = await getCurrentUserProfile();
    return data;
  }, []);

  // Refresh user profile (exposed to components)
  const refreshUserProfile = useCallback(async () => {
    const profile = await fetchUserProfile();
    setAuthState((prev) => ({
      ...prev,
      userProfile: profile,
    }));
  }, [fetchUserProfile]);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      let userProfile: UserProfile | null = null;
      if (session?.user) {
        userProfile = await fetchUserProfile();
      }

      setAuthState({
        user: session?.user ?? null,
        session,
        userProfile,
        isLoading: false,
      });
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        let userProfile: UserProfile | null = null;
        if (session?.user) {
          userProfile = await fetchUserProfile();
        }

        setAuthState({
          user: session?.user ?? null,
          session,
          userProfile,
          isLoading: false,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signUp = useCallback(async ({ email, password, name }: SignUpData) => {
    // Sign up with Supabase Auth, passing name in user metadata
    // The database trigger will use this to create the profile
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

    // If user was created and we have the user ID, ensure profile exists
    // This is a fallback in case the database trigger doesn't fire
    if (data.user) {
      const { error: profileError } = await createUserProfile(data.user.id, name);

      // Ignore "already exists" errors since the trigger might have created it
      if (profileError && !profileError.includes('already exists')) {
        console.warn('Profile creation fallback:', profileError);
      }
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setAuthState((prev) => ({
        ...prev,
        userProfile: null,
      }));
    }
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
