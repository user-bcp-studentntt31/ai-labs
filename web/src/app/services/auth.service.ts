import { Injectable } from '@angular/core';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { environment } from '../../environments/environment';
import type { LoginCredentials, LoginRequest, LoginResponse } from '../models/auth.models';

const LOGIN_TIMEOUT_MS = 5000;
const LOGIN_CLIENT = 'angular-workshop';
const DEFAULT_LOGIN_ERROR = 'Error desconocido';

@Injectable({ providedIn: 'root' })
export class AuthService {
  login(credentials: LoginCredentials): Promise<AxiosResponse<LoginResponse>> {
    const request: LoginRequest = { ...credentials, client: LOGIN_CLIENT };
    return axios.post<LoginResponse>(
      `${environment.authBaseUrl}/auth/login`,
      request,
      { timeout: LOGIN_TIMEOUT_MS }
    );
  }

  getErrorMessage(error: unknown): string {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      const message = error.response?.data?.message;
      if (typeof message === 'string' && message) {
        return message;
      }
      if (error.message) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }
    return DEFAULT_LOGIN_ERROR;
  }
}
