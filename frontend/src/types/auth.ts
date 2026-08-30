export type OfficerRole = 
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'DUTY_OFFICER'
  | 'INVESTIGATOR'
  | 'DISPATCHER';

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
  department_id: string;
  is_active: boolean;
  is_break_glass: boolean;
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
