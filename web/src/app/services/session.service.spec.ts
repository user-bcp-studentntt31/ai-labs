import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service';
import { createStorage } from '../../test-utils/storage';

describe('SessionService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when no user is stored', () => {
    vi.stubGlobal('sessionStorage', createStorage());

    expect(new SessionService().getUser()).toBeNull();
  });

  it('rejects malformed stored user data', () => {
    const storage = createStorage();
    storage.setItem('workshop_user', 'not-json');
    vi.stubGlobal('sessionStorage', storage);

    expect(() => new SessionService().getUser()).toThrow(SyntaxError);
  });
});
