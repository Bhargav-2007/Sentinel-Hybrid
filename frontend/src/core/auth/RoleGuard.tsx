import React from 'react';
import { useAuthStore } from './authStore';
import { UserRole } from '../types/auth';
import { hasPermission } from './permissions';

interface RoleGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ roles, children, fallback = null }) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  if (!hasPermission(user.role, roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
