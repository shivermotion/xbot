import { logger } from './logger';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove expired requests
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.config.windowMs
    );

    // Check if we're at the limit
    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.config.windowMs - (now - oldestRequest);
      
      logger.info(`Rate limit reached. Waiting ${waitTime}ms before next request.`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Recursively check again after waiting
      return this.waitForSlot();
    }

    // Add current request
    this.requests.push(now);
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.config.windowMs
    );
    return Math.max(0, this.config.maxRequests - this.requests.length);
  }

  reset(): void {
    this.requests = [];
  }
}

// Twitter API rate limits (approximate)
export const twitterRateLimiter = new RateLimiter({
  maxRequests: 300, // 300 requests per 15 minutes
  windowMs: 15 * 60 * 1000 // 15 minutes
});

// Hugging Face API rate limiter
export const huggingFaceRateLimiter = new RateLimiter({
  maxRequests: 100, // 100 requests per hour
  windowMs: 60 * 60 * 1000 // 1 hour
}); 