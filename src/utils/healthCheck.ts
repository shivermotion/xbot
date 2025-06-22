import { TwitterApi } from 'twitter-api-v2';
import { HfInference } from '@huggingface/inference';
import { logger } from './logger';
import { analyticsManager } from './analytics';

interface HealthStatus {
  status: 'healthy' | 'warning' | 'error';
  timestamp: Date;
  services: {
    twitter: {
      status: 'healthy' | 'error';
      message: string;
    };
    huggingFace: {
      status: 'healthy' | 'error';
      message: string;
    };
  };
  bot: {
    isRunning: boolean;
    uptime: number;
    totalTweets: number;
    successRate: number;
  };
  environment: {
    hasTwitterCredentials: boolean;
    hasHuggingFaceToken: boolean;
  };
}

class HealthChecker {
  private twitterClient: TwitterApi;
  private huggingFaceClient: HfInference;

  constructor() {
    this.twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });

    this.huggingFaceClient = new HfInference(process.env.HUGGINGFACE_TOKEN);
  }

  async checkHealth(): Promise<HealthStatus> {
    const analytics = analyticsManager.getAnalytics();
    
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        twitter: { status: 'error', message: 'Not checked' },
        huggingFace: { status: 'error', message: 'Not checked' }
      },
      bot: {
        isRunning: analytics.isBotRunning,
        uptime: analytics.uptime,
        totalTweets: analytics.totalTweets,
        successRate: analytics.totalTweets > 0 
          ? (analytics.successfulTweets / analytics.totalTweets) * 100 
          : 0
      },
      environment: {
        hasTwitterCredentials: !!(process.env.TWITTER_API_KEY && 
                                 process.env.TWITTER_API_SECRET && 
                                 process.env.TWITTER_ACCESS_TOKEN && 
                                 process.env.TWITTER_ACCESS_TOKEN_SECRET),
        hasHuggingFaceToken: !!process.env.HUGGINGFACE_TOKEN
      }
    };

    // Check Twitter API
    try {
      await this.twitterClient.v2.me();
      healthStatus.services.twitter = {
        status: 'healthy',
        message: 'Twitter API is accessible'
      };
    } catch (error: any) {
      healthStatus.services.twitter = {
        status: 'error',
        message: `Twitter API error: ${error.message}`
      };
      healthStatus.status = 'error';
    }

    // Check Hugging Face API
    try {
      // Simple test call
      await this.huggingFaceClient.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.1',
        inputs: 'Test',
        parameters: { max_new_tokens: 1 }
      });
      healthStatus.services.huggingFace = {
        status: 'healthy',
        message: 'Hugging Face API is accessible'
      };
    } catch (error: any) {
      healthStatus.services.huggingFace = {
        status: 'error',
        message: `Hugging Face API error: ${error.message}`
      };
      healthStatus.status = 'error';
    }

    // Check environment variables
    if (!healthStatus.environment.hasTwitterCredentials || 
        !healthStatus.environment.hasHuggingFaceToken) {
      healthStatus.status = healthStatus.status === 'error' ? 'error' : 'warning';
    }

    // Check bot performance
    if (analytics.totalTweets > 0 && (analytics.successfulTweets / analytics.totalTweets) * 100 < 80) {
      healthStatus.status = healthStatus.status === 'error' ? 'error' : 'warning';
    }

    return healthStatus;
  }

  async logHealthStatus(): Promise<void> {
    const health = await this.checkHealth();
    
    logger.info('Health Check Results:', {
      status: health.status,
      timestamp: health.timestamp,
      services: health.services,
      bot: health.bot,
      environment: health.environment
    });

    if (health.status === 'error') {
      logger.error('Bot health check failed - critical issues detected');
    } else if (health.status === 'warning') {
      logger.warn('Bot health check warning - some issues detected');
    } else {
      logger.info('Bot health check passed - all systems operational');
    }
  }
}

export const healthChecker = new HealthChecker(); 