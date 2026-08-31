export type OfficerRole = 
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'INVESTIGATOR'
  | 'OPERATOR'
  | 'DUTY_OFFICER'
  | 'DISPATCHER';

export type Permission =
  | 'camera.read'
  | 'camera.manage'
  | 'camera.register'
  | 'camera.ptz'
  | 'alert.read'
  | 'alert.acknowledge'
  | 'alert.review'
  | 'alert.dispatch'
  | 'vehicle.search'
  | 'person.search'
  | 'investigation.advanced'
  | 'case.create'
  | 'case.manage'
  | 'case.review'
  | 'evidence.read'
  | 'evidence.export'
  | 'evidence.verify'
  | 'watchlist.manage'
  | 'user.manage'
  | 'system.config'
  | 'audit.full'
  | 'dashboard.overview'
  | 'analytics.broad';

export interface UserContext {
  identity: string;
  officer_id: string;
  badge_number: string;
  full_name: string;
  role: OfficerRole | string;
  rank: string;
  department: string;
  jurisdiction: string;
  district: string;
  station?: string;
  permissions: string[];
}

export interface Officer {
  id: string;
  officer_id: string;
  badge_number: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: OfficerRole;
  rank: string;
  station: string;
  district: string;
  jurisdiction?: string;
  department_id: string;
  is_active: boolean;
  is_break_glass: boolean;
  permissions?: string[];
  created_at: string;
  last_login?: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  officer_id: string;
  badge_number: string;
  role: OfficerRole;
  district: string;
  department?: string;
  jurisdiction?: string;
  permissions?: string[];
  user?: UserContext;
}

export interface BreakGlassRequest {
  officer_id: string;
  password?: string;
  fir_number: string;
  incident_reason: string;
  duration_minutes?: number;
}

export interface BreakGlassResponse {
  status: string;
  session_id: string;
  officer_id: string;
  elevated_role: OfficerRole;
  expires_at: string;
  fir_number: string;
  audit_hmac: string;
}
