// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for testing
process.env.TWITTER_API_KEY = process.env.TWITTER_API_KEY || 'test_key';
process.env.TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || 'test_secret';
process.env.TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || 'test_token';
process.env.TWITTER_ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET || 'test_token_secret';
process.env.HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN || 'test_hf_token';

// Global test timeout
(global as any).jest.setTimeout(10000); 