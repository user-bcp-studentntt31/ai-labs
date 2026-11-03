import '@angular/compiler';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    isAxiosError: (error: unknown) =>
      typeof error === 'object' && error !== null && 'isAxiosError' in error && error.isAxiosError === true
  }
}));

describe('DashboardComponent session handling', () => {
  const session = new Map<string, string>();
  const storage = {
    getItem: (key: string) => session.get(key) ?? null,
    removeItem: (key: string) => session.delete(key)
  };
  const navigate = vi.fn(async () => true);
  const router = { navigate } as unknown as Router;
  const changeDetector = { detectChanges: vi.fn() } as unknown as ChangeDetectorRef;
  const zone = { run: <T>(callback: () => T): T => callback() } as NgZone;

  let component: DashboardComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    session.clear();
    session.set('workshop_token', 'test-token');
    session.set('workshop_user', JSON.stringify({ username: 'student' }));
    vi.stubGlobal('localStorage', storage);
    component = new DashboardComponent(router, changeDetector, zone);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears the session and redirects when tasks are rejected with HTTP 401', async () => {
    vi.mocked(axios.get).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 }
    });

    await component.ngOnInit();

    expect(session.has('workshop_token')).toBe(false);
    expect(session.has('workshop_user')).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(component.error).toBe('');
  });

  it('preserves the session and shows the error for non-authentication failures', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Network Error'));

    await component.ngOnInit();

    expect(session.get('workshop_token')).toBe('test-token');
    expect(session.has('workshop_user')).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(component.error).toBe('Network Error');
    expect(component.loading).toBe(false);
  });

  it('loads tasks without changing a valid session', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] });

    await component.ngOnInit();

    expect(session.get('workshop_token')).toBe('test-token');
    expect(navigate).not.toHaveBeenCalled();
    expect(component.visibleTasks).toEqual([]);
    expect(component.loading).toBe(false);
  });

  it('redirects to login when no token is present', async () => {
    session.delete('workshop_token');

    await component.ngOnInit();

    expect(axios.get).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
