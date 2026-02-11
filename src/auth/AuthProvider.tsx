/**
 * AuthProvider - React context provider for authentication state
 * 
 * This component provides auth state and methods to the entire app tree.
 * It initializes the appropriate auth adapter based on environment config.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthAdapter, User } from './adapter';
import { getAuthAdapter } from './adapter';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  adapter: AuthAdapter | null;
  signInWithMagicLink: (email: string) => Promise<{ error?: Error }>;
  signInWithOAuth: (provider: 'google' | 'github' | 'azure' | 'apple') => Promise<{ error?: Error }>;
  signOut: () => Promise<{ error?: Error }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adapter, setAdapter] = useState<AuthAdapter | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        const authAdapter = await getAuthAdapter();
        setAdapter(authAdapter);

        // Get initial user
        const currentUser = await authAdapter.getUser();
        setUser(currentUser);

        // Listen for auth state changes
        unsubscribe = authAdapter.onAuthStateChange((newUser) => {
          setUser(newUser);
        });
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signInWithMagicLink = async (email: string) => {
    if (!adapter) {
      return { error: new Error('Auth adapter not initialized') };
    }
    return adapter.signInWithMagicLink(email);
  };

  const signInWithOAuth = async (provider: 'google' | 'github' | 'azure' | 'apple') => {
    if (!adapter) {
      return { error: new Error('Auth adapter not initialized') };
    }
    return adapter.signInWithOAuth(provider);
  };

  const signOut = async () => {
    if (!adapter) {
      return { error: new Error('Auth adapter not initialized') };
    }
    return adapter.signOut();
  };

  const value: AuthContextValue = {
    user,
    loading,
    adapter,
    signInWithMagicLink,
    signInWithOAuth,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
