export type UserRole = 'OPERATOR' | 'INVESTIGATOR' | 'SOC_LEAD' | 'ADMIN';

export interface OfficerUser {
  id: string;
  badge_number: string;
  full_name: string;
  role: UserRole;
  rank: string;
  station: string;
  district: string;
  email: string;
  phone?: string;
  is_active: boolean;
  last_login?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse {
  tokens: AuthTokens;
  officer: OfficerUser;
}
