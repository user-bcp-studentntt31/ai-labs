import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@angular/compiler';
import type { Router } from '@angular/router';
import axios from 'axios';
import { LoginComponent } from './login.component';
import { AuthService } from '../services/auth.service';
import { PreferencesService } from '../services/preferences.service';
import { SessionService } from '../services/session.service';
import { createStorage } from '../../test-utils/storage';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    isAxiosError: (error: unknown) =>
      typeof error === 'object' && error !== null && 'response' in error
  }
}));

describe('LoginComponent characterization', () => {
  let storage: Storage;
  let sessionStorageMock: Storage;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = createStorage();
    sessionStorageMock = createStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('sessionStorage', sessionStorageMock);
    navigate = vi.fn().mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('merges saved preferences with defaults', () => {
    storage.setItem('workshop_preferences', JSON.stringify({ theme: 'dark', showTips: false }));

    const component = new LoginComponent(
      { navigate } as Router,
      new SessionService(),
      new AuthService(),
      new PreferencesService()
    );

    expect(component.preferences).toEqual({
      theme: 'dark',
      showTips: false,
      compact: false
    });
  });

  it('logs malformed saved preferences and returns defaults', () => {
    storage.setItem('workshop_preferences', '[]');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const component = new LoginComponent(
      { navigate } as Router,
      new SessionService(),
      new AuthService(),
      new PreferencesService()
    );

    expect(component.preferences).toEqual({
      theme: 'light',
      showTips: true,
      compact: false
    });
    expect(log).toHaveBeenCalled();
  });

  it('requires a username before requesting login', async () => {
    const component = new LoginComponent(
      { navigate } as Router,
      new SessionService(),
      new AuthService(),
      new PreferencesService()
    );
    component.password = 'fictitious-password';

    await component.login();

    expect(axios.post).not.toHaveBeenCalled();
    expect(component.message).toEqual({ title: 'Ingrese un usuario.' });
  });

  it('requires a password before requesting login', async () => {
    const component = new LoginComponent(
      { navigate } as Router,
      new SessionService(),
      new AuthService(),
      new PreferencesService()
    );
    component.username = 'fictitious-user';

    await component.login();

    expect(axios.post).not.toHaveBeenCalled();
    expect(component.message).toEqual({ title: 'Ingrese una contraseña.' });
  });

  it('posts the existing login contract, stores the response and navigates', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        token: 'fictional-token',
        user: { username: 'fictitious-user', displayName: 'Fictional User' }
      }
    } as never);
    const component = new LoginComponent(
      { navigate } as Router,
      new SessionService(),
      new AuthService(),
      new PreferencesService()
    );
    component.username = 'fictitious-user';
    component.password = 'fictitious-password';

    await component.login();

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8080/auth/login',
      {
        username: 'fictitious-user',
        password: 'fictitious-password',
        client: 'angular-workshop'
      },
      { timeout: 5000 }
    );
    expect(sessionStorageMock.getItem('workshop_token')).toBe('fictional-token');
    expect(sessionStorageMock.getItem('workshop_user')).toBe(
      JSON.stringify({ username: 'fictitious-user', displayName: 'Fictional User' })
    );
    expect(storage.getItem('workshop_preferences')).toBe(JSON.stringify(component.preferences));
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.busy).toBe(false);
  });

  it('reports a response without a token', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: {} } as never);
    const component = new LoginComponent(
      { navigate } as Router,
      new SessionService(),
      new AuthService(),
      new PreferencesService()
    );
    component.username = 'fictitious-user';
    component.password = 'fictitious-password';

    await component.login();

    expect(component.message).toEqual({ title: 'El backend respondió sin token.' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('includes the username and returned message when login fails', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      config: {
        data: JSON.stringify({
          username: 'fictitious-user',
          password: 'fictional-password'
        })
      },
      response: { data: { message: 'Fictional authentication error' } }
    });
    const component = new LoginComponent(
      { navigate } as Router,
      new SessionService(),
      new AuthService(),
      new PreferencesService()
    );
    component.username = 'fictitious-user';
    component.password = 'fictitious-password';
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await component.login();

    expect(component.message).toEqual({
      title: 'No se pudo autenticar a fictitious-user.',
      detail: 'Fictional authentication error'
    });
    expect(component.busy).toBe(false);
    expect(consoleError.mock.calls).toEqual([['Falló la solicitud de autenticación']]);
  });

  it('reports an unavailable authentication service and resets the busy state', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('Network Error'));
    const component = new LoginComponent(
      { navigate } as Router,
      new SessionService(),
      new AuthService(),
      new PreferencesService()
    );
    component.username = 'fictitious-user';
    component.password = 'fictitious-password';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await component.login();

    expect(component.message).toEqual({
      title: 'No se pudo autenticar a fictitious-user.',
      detail: 'Network Error'
    });
    expect(component.busy).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports the configured login timeout and resets the busy state', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('timeout of 5000ms exceeded'));
    const component = new LoginComponent(
      { navigate } as Router,
      new SessionService(),
      new AuthService(),
      new PreferencesService()
    );
    component.username = 'fictitious-user';
    component.password = 'fictitious-password';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await component.login();

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8080/auth/login',
      {
        username: 'fictitious-user',
        password: 'fictitious-password',
        client: 'angular-workshop'
      },
      { timeout: 5000 }
    );
    expect(component.message).toEqual({
      title: 'No se pudo autenticar a fictitious-user.',
      detail: 'timeout of 5000ms exceeded'
    });
    expect(component.busy).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps HTML-like username and backend content as separate message text', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { data: { message: '<em>Fictional backend detail</em>' } }
    });
    const component = new LoginComponent(
      { navigate } as Router,
      new SessionService(),
      new AuthService(),
      new PreferencesService()
    );
    component.username = '<b>fictitious-user</b>';
    component.password = 'fictitious-password';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await component.login();

    expect(component.message).toEqual({
      title: 'No se pudo autenticar a <b>fictitious-user</b>.',
      detail: '<em>Fictional backend detail</em>'
    });
  });

  it('normalizes authentication errors without exposing untyped values', () => {
    const service = new AuthService();

    expect(
      service.getErrorMessage({
        response: { data: {} },
        message: 'Fictional transport error'
      })
    ).toBe('Fictional transport error');
    expect(service.getErrorMessage(new Error('Fictional network error'))).toBe(
      'Fictional network error'
    );
    expect(service.getErrorMessage({})).toBe('Error desconocido');
  });
});
