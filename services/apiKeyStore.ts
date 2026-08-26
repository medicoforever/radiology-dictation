// API Key Management Service for Gemini API
import { GoogleGenAI } from "@google/genai";

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

export function hasApiKey(): boolean {
  return getStoredApiKeys().length > 0;
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

export function addApiKey(key: string): boolean {
  if (typeof window === 'undefined' || !key.trim()) return false;
  try {
    const keys = getStoredApiKeys();
    const trimmed = key.trim();
    if (!keys.includes(trimmed)) {
      keys.push(trimmed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
      localStorage.setItem(SINGLE_KEY_STORAGE, trimmed);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to add API key:', e);
    return false;
  }
}

export function saveApiKey(key: string): void {
  addApiKey(key);
}

export function removeApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = getStoredApiKeys().filter(k => k !== key.trim());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    if (localStorage.getItem(SINGLE_KEY_STORAGE) === key.trim()) {
      if (keys.length > 0) {
        localStorage.setItem(SINGLE_KEY_STORAGE, keys[0]);
      } else {
        localStorage.removeItem(SINGLE_KEY_STORAGE);
      }
    }
  } catch (e) {
    console.error('Failed to remove API key:', e);
  }
}

export function clearAllApiKeys(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SINGLE_KEY_STORAGE);
  } catch (e) {
    console.error('Failed to clear API keys:', e);
  }
}

export async function validateApiKey(key: string): Promise<boolean> {
  const cleanKey = key.trim();
  if (!cleanKey || cleanKey.length < 10) {
    return false;
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Ping',
    });
    return !!response;
  } catch (err: any) {
    console.warn('API key validation check failed:', err);
    // If the error indicates invalid key/unauthorized
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('api_key_invalid') || msg.includes('unauthorized') || msg.includes('403') || msg.includes('400')) {
      return false;
    }
    // If it's a transient network issue or format is typical AIzaSy, allow user to proceed
    if (cleanKey.startsWith('AIzaSy') && cleanKey.length >= 30) {
      return true;
    }
    return false;
  }
}
