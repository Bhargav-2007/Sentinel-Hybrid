import { UserRole } from '../types/auth';

export const PERMISSIONS = {
  VIEW_LIVE_MATRIX: ['OPERATOR', 'INVESTIGATOR', 'SOC_LEAD', 'ADMIN'] as UserRole[],
  SEARCH_VEHICLES: ['OPERATOR', 'INVESTIGATOR', 'SOC_LEAD', 'ADMIN'] as UserRole[],
  VIEW_INVESTIGATION_DOSSIER: ['INVESTIGATOR', 'SOC_LEAD', 'ADMIN'] as UserRole[],
  CREATE_CASE: ['INVESTIGATOR', 'SOC_LEAD', 'ADMIN'] as UserRole[],
  MANAGE_CASE_STATUS: ['INVESTIGATOR', 'SOC_LEAD', 'ADMIN'] as UserRole[],
  EXPORT_SECTION_65B_EVIDENCE: ['INVESTIGATOR', 'SOC_LEAD', 'ADMIN'] as UserRole[],
  MANAGE_WATCHLISTS: ['SOC_LEAD', 'ADMIN'] as UserRole[],
  VIEW_AUDIT_LOGS: ['SOC_LEAD', 'ADMIN'] as UserRole[],
  MANAGE_USERS: ['ADMIN'] as UserRole[],
  SYSTEM_CONFIG: ['ADMIN'] as UserRole[],
};

export function hasPermission(userRole: UserRole | undefined, requiredRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}
