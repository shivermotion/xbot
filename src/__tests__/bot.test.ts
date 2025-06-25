import { generateTweet, generateAndPostTweet } from '../bot';
import { analyticsManager } from '../utils/analytics';

// Mock external dependencies
(global as any).jest.mock('twitter-api-v2');
(global as any).jest.mock('@huggingface/inference');

(global as any).describe('Bot Tests', () => {
  (global as any).beforeEach(() => {
    // Reset analytics before each test
    analyticsManager.reset();
  });

  (global as any).describe('generateTweet', () => {
    (global as any).it('should generate a tweet with valid prompt', async () => {
      const prompt = 'Write a tweet about technology';
      
      // Mock Hugging Face response
      const mockResponse = {
        choices: [{
          message: {
            content: 'This is a test tweet about technology! #tech #innovation'
          }
        }]
      };
      
      // Mock the HfInference
      const { HfInference } = require('@huggingface/inference');
      HfInference.prototype.chatCompletion = (global as any).jest.fn().mockResolvedValue(mockResponse);
      
      const result = await generateTweet(prompt);
      
      (global as any).expect(result).toBeDefined();
      (global as any).expect(result.length).toBeLessThanOrEqual(280);
      (global as any).expect(result).toContain('technology');
    });

    (global as any).it('should handle generation errors gracefully', async () => {
      const prompt = 'Write a tweet about technology';
      
      // Mock error response
      const { HfInference } = require('@huggingface/inference');
      HfInference.prototype.chatCompletion = (global as any).jest.fn().mockRejectedValue(new Error('API Error'));
      
      await (global as any).expect(generateTweet(prompt)).rejects.toThrow('Tweet generation failed.');
    });
  });

  (global as any).describe('generateAndPostTweet', () => {
    (global as any).it('should handle dry run mode', async () => {
      // Mock Twitter API
      const { TwitterApi } = require('twitter-api-v2');
      TwitterApi.prototype.v2 = {
        me: (global as any).jest.fn().mockResolvedValue({ data: { username: 'testuser' } }),
        tweet: (global as any).jest.fn().mockResolvedValue({ data: { id: '123' } })
      };
      
      // Mock Hugging Face
      const { HfInference } = require('@huggingface/inference');
      HfInference.prototype.chatCompletion = (global as any).jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'This is a test tweet!'
          }
        }]
      });
      
      // This should not throw in dry run mode
      await (global as any).expect(generateAndPostTweet(true)).resolves.not.toThrow();
    });
  });

  (global as any).describe('Analytics', () => {
    (global as any).it('should record tweet statistics correctly', () => {
      const content = 'Test tweet content';
      
      analyticsManager.recordTweet(true, content);
      const analytics = analyticsManager.getAnalytics();
      
      (global as any).expect(analytics.totalTweets).toBe(1);
      (global as any).expect(analytics.successfulTweets).toBe(1);
      (global as any).expect(analytics.failedTweets).toBe(0);
      (global as any).expect(analytics.lastTweetContent).toBe(content);
    });

    (global as any).it('should record errors correctly', () => {
      const errorMessage = 'Test error message';
      
      analyticsManager.recordError(errorMessage);
      const analytics = analyticsManager.getAnalytics();
      
      (global as any).expect(analytics.errors).toHaveLength(1);
      (global as any).expect(analytics.errors[0]).toContain(errorMessage);
    });
  });
}); 