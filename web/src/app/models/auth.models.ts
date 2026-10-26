export interface AuthUser {
  username: string;
  displayName?: string;
  role?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  client: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  user: AuthUser;
}

export function isAuthUser(value: unknown): value is AuthUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'username' in value &&
    typeof value.username === 'string'
  );
}
