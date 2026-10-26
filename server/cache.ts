/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private memoryStore = new Map<string, CacheEntry<any>>();
  private isRedisAvailable = false;

  constructor() {
    // Periodic sweep for expired memory keys every 30 seconds
    const sweepTimer = setInterval(() => this.sweepExpired(), 30000);
    if (sweepTimer.unref) {
      sweepTimer.unref();
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryStore.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }

    return entry.value as T;
  }

  public async set<T>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memoryStore.set(key, { value, expiresAt });
  }

  public async del(key: string): Promise<void> {
    this.memoryStore.delete(key);
  }

  public async invalidatePattern(patternPrefix: string): Promise<void> {
    for (const key of this.memoryStore.keys()) {
      if (key.startsWith(patternPrefix)) {
        this.memoryStore.delete(key);
      }
    }
  }

  private sweepExpired() {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (now > entry.expiresAt) {
        this.memoryStore.delete(key);
      }
    }
  }

  public getStats() {
    return {
      keysCount: this.memoryStore.size,
      provider: this.isRedisAvailable ? 'REDIS' : 'IN_MEMORY_CACHE_ASIDE',
    };
  }
}

export const cache = new CacheService();
