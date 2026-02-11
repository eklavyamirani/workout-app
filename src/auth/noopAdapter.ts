/**
 * No-op auth adapter for local development
 * 
 * This adapter provides a no-op implementation of the auth interface,
 * allowing the app to run without authentication in local development.
 */

import type { AuthAdapter, User } from './adapter';

class NoopAdapter implements AuthAdapter {
  async signInWithMagicLink(_email: string): Promise<{ error?: Error }> {
    console.log('[NoopAdapter] signInWithMagicLink called - no-op');
    return {};
  }

  async signInWithOAuth(_provider: 'google' | 'github' | 'azure' | 'apple'): Promise<{ error?: Error }> {
    console.log('[NoopAdapter] signInWithOAuth called - no-op');
    return {};
  }

  async signOut(): Promise<{ error?: Error }> {
    console.log('[NoopAdapter] signOut called - no-op');
    return {};
  }

  async getUser(): Promise<User | null> {
    // Return a mock user for local development
    return {
      id: 'local-dev-user',
      email: 'dev@local.test'
    };
  }

  onAuthStateChange(_callback: (user: User | null) => void): () => void {
    // Return no-op unsubscribe function
    return () => {
      console.log('[NoopAdapter] onAuthStateChange unsubscribe called - no-op');
    };
  }
}

export const noopAdapter = new NoopAdapter();
