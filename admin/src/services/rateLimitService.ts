interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimitService {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  // Rate limits for different operations (requests per minute)
  private readonly RATE_LIMITS = {
    user_status_change: 10,
    user_role_change: 5,
    report_status_change: 20,
    report_delete: 5,
    default: 30
  };

  // Check if an operation is allowed for a user
  canPerformOperation(userId: string, operation: string = 'default'): boolean {
    const key = `${userId}:${operation}`;
    const now = Date.now();
    const windowSize = 60 * 1000; // 1 minute window
    
    const limit = this.RATE_LIMITS[operation as keyof typeof this.RATE_LIMITS] || this.RATE_LIMITS.default;
    
    const entry = this.limits.get(key);
    
    if (!entry) {
      // First request
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowSize
      });
      return true;
    }
    
    if (now > entry.resetTime) {
      // Reset window
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowSize
      });
      return true;
    }
    
    if (entry.count >= limit) {
      // Rate limit exceeded
      return false;
    }
    
    // Increment count
    entry.count++;
    return true;
  }

  // Get remaining requests for an operation
  getRemainingRequests(userId: string, operation: string = 'default'): number {
    const key = `${userId}:${operation}`;
    const now = Date.now();
    const limit = this.RATE_LIMITS[operation as keyof typeof this.RATE_LIMITS] || this.RATE_LIMITS.default;
    
    const entry = this.limits.get(key);
    
    if (!entry || now > entry.resetTime) {
      return limit;
    }
    
    return Math.max(0, limit - entry.count);
  }

  // Get time until reset (in milliseconds)
  getTimeUntilReset(userId: string, operation: string = 'default'): number {
    const key = `${userId}:${operation}`;
    const now = Date.now();
    
    const entry = this.limits.get(key);
    
    if (!entry || now > entry.resetTime) {
      return 0;
    }
    
    return entry.resetTime - now;
  }

  // Clean up expired entries (call periodically)
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

export const rateLimitService = new RateLimitService();

// Clean up expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    rateLimitService.cleanup();
  }, 5 * 60 * 1000);
}

export default rateLimitService;
