import { createContext } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { UserProfile } from '../types/supabase';

export interface AuthState {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (data: SignUpData) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
