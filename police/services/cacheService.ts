import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  value: T;
  savedAt: number; // epoch ms
  ttlMs?: number; // optional time-to-live
}

export async function setCache<T>(key: string, value: T, ttlMs?: number): Promise<void> {
  const entry: CacheEntry<T> = { value, savedAt: Date.now(), ttlMs };
  try {
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    // non-fatal
    console.warn('Cache set failed for', key, e);
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (entry.ttlMs && Date.now() - entry.savedAt > entry.ttlMs) {
      // expired
      return null;
    }
    return entry.value as T;
  } catch (e) {
    console.warn('Cache get failed for', key, e);
    return null;
  }
}

export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('Cache clear failed for', key, e);
  }
}

export const cacheService = { setCache, getCache, clearCache };
export default cacheService;
