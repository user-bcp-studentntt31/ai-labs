import { Injectable } from '@angular/core';
import merge from 'lodash/merge';

const PREFERENCES_KEY = 'workshop_preferences';
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  showTips: true,
  compact: false
};

export interface UserPreferences {
  theme: string;
  showTips: boolean;
  compact: boolean;
}

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  load(): UserPreferences {
    const savedPreferences = localStorage.getItem(PREFERENCES_KEY);
    if (savedPreferences === null) {
      return { ...DEFAULT_PREFERENCES };
    }

    try {
      const parsedPreferences: unknown = JSON.parse(savedPreferences);
      if (!this.isRecord(parsedPreferences)) {
        throw new Error('Stored preferences are invalid');
      }
      return merge({ ...DEFAULT_PREFERENCES }, parsedPreferences);
    } catch (error) {
      console.log('Preferences could not be loaded', error);
      return { ...DEFAULT_PREFERENCES };
    }
  }

  save(preferences: UserPreferences): void {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
