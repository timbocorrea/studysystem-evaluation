import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Wrapper to protect admin routes
 */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return user?.hasAdminPanelAccess ? (
    <>{children}</>
  ) : (
    <Navigate to="/" replace />
  );
};

/**
 * Wrapper to protect master-only routes
 */
export const MasterRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isMaster = user?.role === 'MASTER';
  return isMaster ? (
    <>{children}</>
  ) : (
    <Navigate to="/" replace />
  );
};
