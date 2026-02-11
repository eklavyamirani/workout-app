/**
 * Supabase auth adapter for production
 * 
 * This adapter provides a real authentication implementation using Supabase,
 * supporting magic link and OAuth (Google, GitHub, Microsoft, Apple).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AuthAdapter, User } from './adapter';

class SupabaseAdapter implements AuthAdapter {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
      );
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey);
  }

  async signInWithMagicLink(email: string): Promise<{ error?: Error }> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    return { error: error ? new Error(error.message) : undefined };
  }

  async signInWithOAuth(provider: 'google' | 'github' | 'azure' | 'apple'): Promise<{ error?: Error }> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    return { error: error ? new Error(error.message) : undefined };
  }

  async signOut(): Promise<{ error?: Error }> {
    const { error } = await this.client.auth.signOut();
    return { error: error ? new Error(error.message) : undefined };
  }

  async getUser(): Promise<User | null> {
    const { data: { user }, error } = await this.client.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
    };
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const { data: { subscription } } = this.client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
        ? {
            id: session.user.id,
            email: session.user.email ?? null,
          }
        : null;
      callback(user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const supabaseAdapter = new SupabaseAdapter();
