// API Key Management Service for Gemini API

const STORAGE_KEY = 'radiology_gemini_api_keys';
const SINGLE_KEY_STORAGE = 'gemini_api_key';

export function getStoredApiKeys(): string[] {
  const keys: string[] = [];

  // Check process.env (injected by Vite define)
  const envKey = (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEY || process.env?.API_KEY)) || '';
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0 && !envKey.startsWith('__')) {
    keys.push(envKey.trim());
  }

  // Check localStorage if in browser
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storedList = localStorage.getItem(STORAGE_KEY);
      if (storedList) {
        const parsed = JSON.parse(storedList);
        if (Array.isArray(parsed)) {
          parsed.forEach((k: any) => {
            if (typeof k === 'string' && k.trim() && !keys.includes(k.trim())) {
              keys.push(k.trim());
            }
          });
        }
      }

      const singleKey = localStorage.getItem(SINGLE_KEY_STORAGE);
      if (singleKey && typeof singleKey === 'string' && singleKey.trim() && !keys.includes(singleKey.trim())) {
        keys.push(singleKey.trim());
      }
    } catch (e) {
      console.warn('Could not read API keys from localStorage:', e);
    }
  }

  return keys;
}

export function getRandomApiKey(): string {
  const keys = getStoredApiKeys();
  if (keys.length === 0) {
    return (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEY || process.env?.API_KEY)) || '';
  }
  const index = Math.floor(Math.random() * keys.length);
  return keys[index];
}

export function getFallbackApiKey(lastFailedKey?: string): string {
  const keys = getStoredApiKeys();
  if (keys.length <= 1) {
    return getRandomApiKey();
  }
  const candidates = keys.filter(k => k !== lastFailedKey);
  if (candidates.length === 0) return keys[0];
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index];
}

export function saveApiKey(key: string): void {
  if (typeof window === 'undefined' || !key.trim()) return;
  try {
    const keys = getStoredApiKeys();
    const trimmed = key.trim();
    if (!keys.includes(trimmed)) {
      keys.push(trimmed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    }
    localStorage.setItem(SINGLE_KEY_STORAGE, trimmed);
  } catch (e) {
    console.error('Failed to save API key:', e);
  }
}

export function removeApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = getStoredApiKeys().filter(k => k !== key.trim());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    if (localStorage.getItem(SINGLE_KEY_STORAGE) === key.trim()) {
      localStorage.removeItem(SINGLE_KEY_STORAGE);
    }
  } catch (e) {
    console.error('Failed to remove API key:', e);
  }
}
