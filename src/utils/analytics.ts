import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export interface BotAnalytics {
  totalTweets: number;
  successfulTweets: number;
  failedTweets: number;
  lastTweetTime: Date | null;
  lastTweetContent: string;
  errors: string[];
  isBotRunning: boolean;
  fallbackTweets: number;
  apiCalls: {
    twitter: number;
    huggingFace: number;
  };
  startTime: Date | null;
  uptime: number; // in seconds
}

const ANALYTICS_FILE = path.join(process.cwd(), 'analytics.json');

class AnalyticsManager {
  private analytics: BotAnalytics;

  constructor() {
    this.analytics = this.loadAnalytics();
  }

  private loadAnalytics(): BotAnalytics {
    try {
      if (fs.existsSync(ANALYTICS_FILE)) {
        const data = fs.readFileSync(ANALYTICS_FILE, 'utf8');
        const parsed = JSON.parse(data);
        
        // Convert date strings back to Date objects
        if (parsed.lastTweetTime) {
          parsed.lastTweetTime = new Date(parsed.lastTweetTime);
        }
        if (parsed.startTime) {
          parsed.startTime = new Date(parsed.startTime);
        }
        
        return parsed;
      }
    } catch (error) {
      logger.error('Error loading analytics:', error);
    }

    // Default analytics
    return {
      totalTweets: 0,
      successfulTweets: 0,
      failedTweets: 0,
      lastTweetTime: null,
      lastTweetContent: '',
      errors: [],
      isBotRunning: false,
      fallbackTweets: 0,
      apiCalls: {
        twitter: 0,
        huggingFace: 0
      },
      startTime: null,
      uptime: 0
    };
  }

  private saveAnalytics(): void {
    try {
      const data = JSON.stringify(this.analytics, null, 2);
      fs.writeFileSync(ANALYTICS_FILE, data, 'utf8');
    } catch (error) {
      logger.error('Error saving analytics:', error);
    }
  }

  getAnalytics(): BotAnalytics {
    // Update uptime if bot is running
    if (this.analytics.isBotRunning && this.analytics.startTime) {
      this.analytics.uptime = Math.floor((Date.now() - this.analytics.startTime.getTime()) / 1000);
    }
    return { ...this.analytics };
  }

  recordTweet(success: boolean, content?: string, isFallback = false): void {
    this.analytics.totalTweets++;
    
    if (success) {
      this.analytics.successfulTweets++;
      if (content) {
        this.analytics.lastTweetContent = content;
      }
      this.analytics.lastTweetTime = new Date();
    } else {
      this.analytics.failedTweets++;
    }

    if (isFallback) {
      this.analytics.fallbackTweets++;
    }

    this.saveAnalytics();
  }

  recordError(error: string): void {
    this.analytics.errors.push(`${new Date().toISOString()}: ${error}`);
    
    // Keep only last 100 errors
    if (this.analytics.errors.length > 100) {
      this.analytics.errors = this.analytics.errors.slice(-100);
    }
    
    this.saveAnalytics();
  }

  recordApiCall(service: 'twitter' | 'huggingFace'): void {
    this.analytics.apiCalls[service]++;
    this.saveAnalytics();
  }

  setBotRunning(running: boolean): void {
    this.analytics.isBotRunning = running;
    
    if (running && !this.analytics.startTime) {
      this.analytics.startTime = new Date();
    }
    
    this.saveAnalytics();
  }

  reset(): void {
    this.analytics = {
      totalTweets: 0,
      successfulTweets: 0,
      failedTweets: 0,
      lastTweetTime: null,
      lastTweetContent: '',
      errors: [],
      isBotRunning: false,
      fallbackTweets: 0,
      apiCalls: {
        twitter: 0,
        huggingFace: 0
      },
      startTime: null,
      uptime: 0
    };
    this.saveAnalytics();
  }
}

export const analyticsManager = new AnalyticsManager(); 