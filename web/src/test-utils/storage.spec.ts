import { describe, expect, it } from 'vitest';
import { createStorage } from './storage';

describe('createStorage', () => {
  it('supports the Storage operations used by components and services', () => {
    const storage = createStorage();

    expect(storage.length).toBe(0);
    expect(storage.getItem('missing')).toBeNull();

    storage.setItem('first', 'value');
    storage.setItem('second', 'another');
    expect(storage.length).toBe(2);
    expect(storage.key(0)).toBe('first');
    expect(storage.key(4)).toBeNull();
    expect(storage.getItem('first')).toBe('value');

    storage.removeItem('first');
    expect(storage.length).toBe(1);
    storage.clear();
    expect(storage.length).toBe(0);
  });
});
