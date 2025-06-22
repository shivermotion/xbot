import { TwitterApi, TweetV2, Tweetv2SearchResult, UserV2 } from 'twitter-api-v2';
import { HfInference } from '@huggingface/inference';
import * as schedule from 'node-schedule';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Twitter API client setup
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

// Initialize Mistral LLM

// Sample prompts for tweet generation
const prompts: string[] = [
  'Write a witty tweet about trending tech news.',
  'Create a fun fact tweet about AI advancements.',
  'Generate an engaging tweet about social media marketing.',
  'Share an interesting insight about digital transformation.',
  'Write a tweet about the future of technology.',
];

// News topic configuration
export let currentNewsTopic = '#news OR #breakingnews';

export function setNewsTopic(topic: string): void {
  currentNewsTopic = topic;
  logger.info(`News topic updated to: ${topic}`);
}

// Function to fetch news headlines
async function fetchNews(): Promise<string[]> {
  try {
    // Search for recent news tweets from verified accounts
    const tweets = await client.v2.search(currentNewsTopic, {
      'tweet.fields': ['created_at', 'public_metrics'],
      'user.fields': ['verified'],
      max_results: 10,
      'expansions': ['author_id'],
    });

    // Convert the response to an array of tweets
    const tweetsArray = Array.isArray(tweets.data) ? tweets.data : [];
    
    if (tweetsArray.length === 0) {
      console.log('No news tweets found');
      return [];
    }

    // Filter for verified accounts and get the most recent tweets
    const newsTweets = tweetsArray
      .filter((tweet: TweetV2) => {
        const author = tweets.includes?.users?.find((user: UserV2) => user.id === tweet.author_id);
        return author?.verified;
      })
      .map((tweet: TweetV2) => tweet.text);

    console.log(`Successfully fetched ${newsTweets.length} news tweets`);
    return newsTweets;
  } catch (error: any) {
    // Enhanced error logging
    if (error.data) {
      // Twitter API error response
      console.error('Twitter API Error:', {
        status: error.data.status,
        error: error.data.error,
        details: error.data.detail,
        title: error.data.title,
        type: error.data.type
      });
    } else if (error.errors) {
      // Alternative Twitter error format
      console.error('Twitter API Errors:', error.errors);
    } else if (error.message) {
      console.error('Error Details:', error.message);
    }

    // Check if credentials are present
    const credentials = {
      hasApiKey: !!process.env.TWITTER_API_KEY,
      hasApiSecret: !!process.env.TWITTER_API_SECRET,
      hasAccessToken: !!process.env.TWITTER_ACCESS_TOKEN,
      hasAccessSecret: !!process.env.TWITTER_ACCESS_TOKEN_SECRET
    };
    console.error('Credentials Status:', credentials);

    return [];
  }
}

// Replace pipeline usage in generateTweet with HfInference
const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

// List of models to try in order of preference.
const modelsToTry = [
  'meta-llama/Llama-3.1-8B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.3',
  'Qwen/Qwen2-7B-Instruct',
];

export async function generateTweet(prompt: string): Promise<string> {
  for (const modelName of modelsToTry) {
    try {
      logger.info(`Attempting to generate tweet with model: ${modelName}`);
      const response = await hf.chatCompletion({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80, // Limit the response length for a tweet
      });

      const generated = response.choices[0].message.content;

      if (!generated || !generated.trim()) {
        logger.warn(`Model ${modelName} returned an empty response. Trying next model...`);
        continue;
      }

      logger.info(`Successfully generated tweet with model: ${modelName}`);
      return generated.trim().slice(0, 280);
    } catch (error: any) {
      if (
        error.message.includes('is not supported for task text-generation') ||
        error.message.includes('No Inference Provider available') ||
        error.message.includes('is currently loading') ||
        error.message.includes('Model is overloaded')
      ) {
        logger.warn(
          `Model ${modelName} is unavailable or has the wrong task. Trying next model...`
        );
        continue;
      } else {
        logger.error(`A critical error occurred with model ${modelName}:`, error);
        throw new Error('Tweet generation failed due to a critical API error.');
      }
    }
  }

  // This part is reached only if all models in the list have failed.
  logger.error('All fallback models failed. Could not generate a tweet.');
  throw new Error('Tweet generation failed.');
}

// A new, simpler function to verify permissions.
async function verifyTwitterPermissions(): Promise<void> {
  try {
    logger.info('Verifying basic Twitter authentication...');
    const user = await client.v2.me();
    logger.info(
      `Successfully authenticated as @${user.data.username}. Assuming write permissions are set.`
    );
    // The actual tweet posting will be the definitive test of write permissions.
  } catch (error: any) {
    logger.error(
      'Basic Twitter authentication failed. Please check your API keys and tokens.'
    );
    if (error.data?.errors) {
      logger.error('Twitter API Error:', error.data.errors);
    } else {
      logger.error('Authentication error details:', error.message);
    }
    throw new Error('Authentication failed.');
  }
}

// Modify the generateAndPostTweet function to include permission check
async function generateAndPostTweet(): Promise<void> {
  try {
    // First verify permissions
    logger.info('Verifying Twitter API permissions...');
    await verifyTwitterPermissions();
    
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    let finalPrompt = prompt;
    
    try {
      const news = await fetchNews();
      if (news.length > 0) {
        finalPrompt = `${prompt} Context: ${news[Math.floor(Math.random() * news.length)]}`;
      }
    } catch (error) {
      logger.error('Error fetching news, continuing without news context:', error);
    }

    const tweet = await generateTweet(finalPrompt);
    await client.v2.tweet(tweet);
    logger.info(`Posted tweet: ${tweet}`);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Write permission')) {
        logger.error('Permission Error:', error.message);
        logger.error('Please update your app permissions in the Twitter Developer Portal and regenerate your tokens.');
      } else {
        logger.error('Error in generateAndPostTweet:', error);
      }
    } else {
      logger.error('Unknown error in generateAndPostTweet:', error);
    }
    throw error;
  }
}

// Schedule tweets
function scheduleTweets(): void {
  const intervalHours = parseInt(process.env.TWEET_INTERVAL_HOURS || '4');
  const scheduleRule = `0 */${intervalHours} * * *`;
  
  schedule.scheduleJob(scheduleRule, generateAndPostTweet);
  logger.info(`Scheduled tweets every ${intervalHours} hours`);
}

// Start the bot
async function startBot(): Promise<void> {
  try {
    logger.info('Starting Twitter bot...');
    scheduleTweets();
    logger.info('Twitter bot is running...');
  } catch (error) {
    logger.error('Error starting bot:', error);
    process.exit(1);
  }
}

// Export functions for testing
export {
  generateAndPostTweet,
  fetchNews,
  startBot,
}; 