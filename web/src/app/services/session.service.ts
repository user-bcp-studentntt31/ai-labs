import { Injectable } from '@angular/core';
import { isAuthUser } from '../models/auth.models';
import type { AuthUser } from '../models/auth.models';

const TOKEN_KEY = 'workshop_token';
const USER_KEY = 'workshop_user';

@Injectable({ providedIn: 'root' })
export class SessionService {
  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  getUser(): AuthUser | null {
    const storedUser = sessionStorage.getItem(USER_KEY);
    if (storedUser === null) {
      return null;
    }

    const parsedUser: unknown = JSON.parse(storedUser);
    if (!isAuthUser(parsedUser)) {
      throw new Error('Stored session user is invalid');
    }
    return parsedUser;
  }

  save(token: string, user: AuthUser): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
}
