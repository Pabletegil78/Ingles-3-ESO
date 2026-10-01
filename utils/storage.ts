const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        const item = window.localStorage.getItem(key);
        if (item !== null) return item;
      }
    } catch (e) {
      console.warn(`[Storage] Failed to read ${key} from localStorage, using memory:`, e);
    }
    return memoryStorage[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`[Storage] Failed to write ${key} to localStorage, using memory:`, e);
    }
    memoryStorage[key] = value;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[Storage] Failed to remove ${key} from localStorage:`, e);
    }
    delete memoryStorage[key];
  }
};
