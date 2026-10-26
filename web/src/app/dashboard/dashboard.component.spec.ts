import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@angular/compiler';
import type { ChangeDetectorRef, NgZone } from '@angular/core';
import type { Router } from '@angular/router';
import axios from 'axios';
import { DashboardComponent } from './dashboard.component';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { createStorage } from '../../test-utils/storage';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    isAxiosError: (error: unknown) =>
      typeof error === 'object' && error !== null && 'response' in error
  }
}));

describe('DashboardComponent characterization', () => {
  let storage: Storage;
  let sessionStorageMock: Storage;
  let navigate: ReturnType<typeof vi.fn>;
  let detectChanges: ReturnType<typeof vi.fn>;
  let runInZone: ReturnType<typeof vi.fn>;

  function createComponent(): DashboardComponent {
    return new DashboardComponent(
      { navigate } as Router,
      { detectChanges } as ChangeDetectorRef,
      { run: (callback: () => void) => runInZone(callback) } as NgZone,
      new SessionService(),
      new TasksService()
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    storage = createStorage();
    sessionStorageMock = createStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('sessionStorage', sessionStorageMock);
    navigate = vi.fn().mockResolvedValue(true);
    detectChanges = vi.fn();
    runInZone = vi.fn((callback: () => void) => callback());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects to login when no token is stored', async () => {
    const component = createComponent();

    await component.ngOnInit();

    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('requests tasks with the stored owner and bearer token, then filters and sorts them', async () => {
    sessionStorageMock.setItem('workshop_token', 'fictional-token');
    sessionStorageMock.setItem(
      'workshop_user',
      JSON.stringify({ username: 'fictitious-user', displayName: 'Fictional User' })
    );
    vi.mocked(axios.get).mockResolvedValue({
      data: [
        {
          title: 'Low priority',
          description: 'Fictional low-priority task',
          status: 'TODO',
          priority: 'LOW',
          owner: 'fictitious-user'
        },
        {
          title: 'Archived task',
          description: 'Fictional archived task',
          status: 'ARCHIVED',
          priority: 'URGENT',
          owner: 'fictitious-user'
        },
        {
          title: 'High priority',
          description: 'Fictional high-priority task',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          owner: 'fictitious-user'
        }
      ]
    } as never);
    const component = createComponent();

    await component.ngOnInit();

    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:8000/api/tasks?owner=fictitious-user',
      { headers: { Authorization: 'Bearer fictional-token' } }
    );
    expect(component.visibleTasks.map((task) => task.title)).toEqual([
      'Low priority',
      'High priority'
    ]);
    expect(component.visibleTasks[1].label).toBe('HIGH · FICTITIOUS-USER');
    expect(component.tasks).toHaveLength(3);
    expect(component.loading).toBe(false);
    expect(detectChanges).toHaveBeenCalled();
    expect(runInZone).toHaveBeenCalled();
  });

  it('shows the task service error and ends loading', async () => {
    sessionStorageMock.setItem('workshop_token', 'fictional-token');
    sessionStorageMock.setItem('workshop_user', JSON.stringify({ username: 'fictitious-user' }));
    vi.mocked(axios.get).mockRejectedValue(new Error('Fictional network error'));
    const component = createComponent();

    await component.ngOnInit();

    expect(component.error).toBe('Fictional network error');
    expect(component.loading).toBe(false);
    expect(detectChanges).toHaveBeenCalled();
  });

  it('shows an invalid-token response without clearing the session or redirecting', async () => {
    sessionStorageMock.setItem('workshop_token', 'fictional-token');
    sessionStorageMock.setItem('workshop_user', JSON.stringify({ username: 'fictitious-user' }));
    vi.mocked(axios.get).mockRejectedValue({
      response: { status: 401, data: { detail: 'Fictional invalid-token response' } }
    });
    const component = createComponent();

    await component.ngOnInit();

    expect(component.error).toBe('Fictional invalid-token response');
    expect(component.loading).toBe(false);
    expect(sessionStorageMock.getItem('workshop_token')).toBe('fictional-token');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a task request timeout as an error and ends loading', async () => {
    sessionStorageMock.setItem('workshop_token', 'fictional-token');
    sessionStorageMock.setItem('workshop_user', JSON.stringify({ username: 'fictitious-user' }));
    vi.mocked(axios.get).mockRejectedValue(new Error('Fictional request timeout'));
    const component = createComponent();

    await component.ngOnInit();

    expect(component.error).toBe('Fictional request timeout');
    expect(component.loading).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('clears stored token and user on logout while keeping preferences', async () => {
    sessionStorageMock.setItem('workshop_token', 'fictional-token');
    sessionStorageMock.setItem('workshop_user', JSON.stringify({ username: 'fictitious-user' }));
    storage.setItem('workshop_preferences', JSON.stringify({ theme: 'dark' }));
    const component = createComponent();

    await component.logout();

    expect(sessionStorageMock.getItem('workshop_token')).toBeNull();
    expect(sessionStorageMock.getItem('workshop_user')).toBeNull();
    expect(storage.getItem('workshop_preferences')).toBe(JSON.stringify({ theme: 'dark' }));
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('uses task API detail or a generic message for unknown errors', () => {
    const service = new TasksService();

    expect(
      service.getErrorMessage({ response: { data: { detail: 'Fictional API detail' } } })
    ).toBe('Fictional API detail');
    expect(
      service.getErrorMessage({
        response: { data: {} },
        message: 'Fictional Axios message'
      })
    ).toBe('Fictional Axios message');
    expect(service.getErrorMessage({})).toBe('No se pudo cargar el dashboard');
  });
});
