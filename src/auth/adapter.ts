/**
 * Auth adapter interface and selector
 * 
 * This module defines the auth adapter interface and selects the appropriate
 * implementation based on the VITE_ENABLE_AUTH environment variable.
 */

export interface User {
  id: string;
  email: string | null;
}

export interface AuthAdapter {
  /**
   * Sign in with magic link (email)
   */
  signInWithMagicLink(email: string): Promise<{ error?: Error }>;

  /**
   * Sign in with OAuth provider (Google, GitHub, Microsoft, Apple)
   */
  signInWithOAuth(provider: 'google' | 'github' | 'azure' | 'apple'): Promise<{ error?: Error }>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<{ error?: Error }>;

  /**
   * Get the current user
   */
  getUser(): Promise<User | null>;

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}

// Select the appropriate adapter based on environment
const enableAuth = import.meta.env.VITE_ENABLE_AUTH === 'true';

export const getAuthAdapter = async (): Promise<AuthAdapter> => {
  if (enableAuth) {
    const { supabaseAdapter } = await import('./supabaseAdapter');
    return supabaseAdapter;
  } else {
    const { noopAdapter } = await import('./noopAdapter');
    return noopAdapter;
  }
};
