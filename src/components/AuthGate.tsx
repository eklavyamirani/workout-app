import React, { useState, useEffect } from 'react';
import { Dumbbell } from 'lucide-react';
import { getAuthMode, isAuthenticated, enterAnonymousMode } from '../storage/auth';
import { login, handleCallback, isOidcConfigured, isTokenExpired } from '../storage/oidc';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [state, setState] = useState<'loading' | 'gate' | 'app'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      // Check for OIDC callback (?code=...&state=...)
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const callbackState = params.get('state');

      if (code && callbackState) {
        try {
          await handleCallback(code, callbackState);
          setState('app');
          return;
        } catch (err) {
          console.error('OIDC callback failed:', err);
          setError(err instanceof Error ? err.message : 'Authentication failed');
          setState('gate');
          return;
        }
      }

      // Check existing auth state
      const mode = getAuthMode();
      if (mode === 'authenticated' && !isTokenExpired()) {
        setState('app');
      } else if (mode === 'anonymous') {
        setState('app');
      } else {
        setState('gate');
      }
    }

    init();
  }, []);

  function handleTryWithoutAccount() {
    enterAnonymousMode();
    setState('app');
  }

  async function handleSignIn() {
    if (!isOidcConfigured()) {
      setError('Sign-in is not configured for this environment.');
      return;
    }
    try {
      await login();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sign-in');
    }
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (state === 'gate') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <Dumbbell className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Workout Tracker</h1>
            <p className="text-gray-500">Track your workouts and progress across devices</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {isOidcConfigured() && (
              <>
                <button
                  onClick={handleSignIn}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Sign in
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={handleTryWithoutAccount}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Try without an account
            </button>

            <p className="text-xs text-gray-400 text-center">
              Your data will be stored locally. Sign in later to sync across devices.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // state === 'app'
  return <>{children}</>;
}
