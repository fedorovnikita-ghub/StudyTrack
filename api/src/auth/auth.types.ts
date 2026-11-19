import { UserRole } from '../models';

// Пользователь, проверенный по токену. Кладется в req.user
export interface AuthUser {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
}

export interface UserResponse {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
}

export interface SessionResponse {
  token: string;
  expiresAt: string; // ISO 8601, UTC
  user: UserResponse;
}
