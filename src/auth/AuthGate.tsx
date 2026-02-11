/**
 * AuthGate - Gate component for protecting the app with authentication
 * 
 * This component shows a loading state while auth is initializing, and
 * renders children once auth is ready. When auth is enabled and user is
 * not authenticated, it can show a login UI (currently just passes through).
 */

import React from 'react';
import { useAuth } from './AuthProvider';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { loading, user } = useAuth();

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Loading...</div>
          <div style={{ fontSize: '0.875rem' }}>Initializing authentication</div>
        </div>
      </div>
    );
  }

  // When auth is disabled (noop adapter), user will be the mock local user
  // When auth is enabled, user will be null if not authenticated
  // For now, we just pass through - login UI could be added here later
  const isAuthEnabled = import.meta.env.VITE_ENABLE_AUTH === 'true';
  
  if (isAuthEnabled && !user) {
    // In production with auth enabled, could show a login page here
    // For now, just pass through to allow the app to handle it
    return <>{children}</>;
  }

  return <>{children}</>;
};
