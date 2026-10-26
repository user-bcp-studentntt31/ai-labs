import { describe, expect, it } from 'vitest';
import { formatTaskLabel } from './legacy-format';

describe('formatTaskLabel', () => {
  it('formats priority and owner', () => {
    expect(formatTaskLabel({ priority: 'high', owner: 'student' })).toBe('HIGH · STUDENT');
  });

  it('returns a label for missing task data', () => {
    expect(formatTaskLabel(null)).toBe('SIN-DATOS');
    expect(formatTaskLabel({})).toBe('NORMAL · SIN-ASIGNAR');
  });

  it('preserves string formatting for numeric task fields', () => {
    expect(formatTaskLabel({ priority: 2, owner: 17 })).toBe('2 · 17');
  });
});
