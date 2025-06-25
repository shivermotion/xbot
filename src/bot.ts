import { TwitterApi } from 'twitter-api-v2';
import { HfInference } from '@huggingface/inference';
import * as schedule from 'node-schedule';
import * as dotenv from 'dotenv';
import { logger } from './utils/logger';
import { analyticsManager } from './utils/analytics';
import chalk from 'chalk';
import { sourceManager } from './utils/sources';

// Load environment variables
dotenv.config();

// Check for required environment variables
const requiredEnvVars = {
  TWITTER_API_KEY: process.env.TWITTER_API_KEY,
  TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
  TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  HUGGINGFACE_TOKEN: process.env.HUGGINGFACE_TOKEN
};

// Validate environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease set these variables in your Railway environment.');
  process.exit(1);
}

// Twitter API client setup
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

// Initialize Mistral LLM
const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

// List of models to try in order of preference.
const modelsToTry = [
  'meta-llama/Llama-3.1-8B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.3',
  'Qwen/Qwen2-7B-Instruct',
];

// Sample prompts for tweet generation
const prompts: string[] = [
  // 'Write a witty tweet about trending tech news.',
  // 'Create a fun fact tweet about AI advancements.',
  // 'Generate an engaging tweet about social media marketing.',
  // 'Share an interesting insight about digital transformation.',
  // 'Write a tweet about the future of technology.',
  "Write a tweet (250-280 characters) as Ryo Hazuki, a sardonic, sarcastic Shenmue parody. Rant about easy modern games, praising Shenmue's grit or a tough game, with chaotic humor and a nod to retro gaming.  be edgy, controversional, overconfident (because youre overcompensating for being dumb, but you dont want the world to know). Make it feel like Ryo's unfiltered thoughts, not AI polish. rage bait and engagement bait is ok to use."
];

const hasTwitterCreds = (): boolean =>
  !!(
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_TOKEN_SECRET
  );

async function generateTweet(
  prompt: string,
  dryRun = false
): Promise<string> {
  if (dryRun) {
    logger.info('--- Performing a dry run for tweet generation ---');
    return `This is a sample dry-run tweet about a trending topic. No API was called. #dryrun`;
  }

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
        logger.warn(
          `Model ${modelName} returned an empty response. Trying next model...`
        );
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
        logger.error(
          `A critical error occurred with model ${modelName}:`,
          error
        );
        throw new Error('Tweet generation failed due to a critical API error.');
      }
    }
  }

  // This part is reached only if all models in the list have failed.
  logger.error('All fallback models failed. Could not generate a tweet.');
  throw new Error('Tweet generation failed.');
}

async function generateAndPostTweet(dryRun = false): Promise<void> {
  try {
    if (!dryRun) {
      logger.info('Verifying Twitter API permissions...');
      await verifyTwitterPermissions();
    }

    // Select a random prompt
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    // Build final prompt with source (topics/users) if configured
    let finalPrompt = prompt;
    const sourceCfg = sourceManager.getConfig();
    let contextInfo: string | undefined;
    if (sourceCfg.mode === 'static') {
      const randomSource = sourceManager.getRandomSource();
      contextInfo = randomSource;
      if (randomSource) {
        finalPrompt = `${prompt} Context: ${randomSource}`;
      }
    } else {
      let dyn: string | undefined;
      if (hasTwitterCreds()) {
        dyn = await sourceManager.getDynamicSource();
      } else {
        logger.warn('Dynamic lookup skipped – missing Twitter credentials');
      }
      contextInfo = dyn;
      if (dyn) {
        finalPrompt = `${prompt} Context: ${dyn}`;
      }
    }

    logger.info(
      `🛈 Mode: ${sourceCfg.mode}$${contextInfo ? `, Context: ${contextInfo}` : ', Context: none'}`
    );

    // If this is a dry run, show exactly what prompt would be sent to the LLM
    if (dryRun) {
      logger.info(`🛈 Prompt to LLM: ${finalPrompt}`);
    }

    // Generate the tweet content (HF skipped in dryRun)
    const tweet = await generateTweet(finalPrompt, dryRun);

    if (dryRun) {
      logger.info('--- DRY RUN MODE ---');
      logger.info('Tweet that would have been posted:');
      // Use console.log for clean output without logger formatting
      console.log(chalk.greenBright.bold(`\n${tweet}\n`));
      logger.info('--- No tweet was sent. ---');
      return; // Stop execution here for a dry run
    }

    await client.v2.tweet(tweet);
    logger.info(`Posted tweet: ${tweet}`);
    // Analytics for live tweets will be handled by the CLI that calls this.
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Write permission')) {
        logger.error('Permission Error:', error.message);
        logger.error(
          'Please update your app permissions in the Twitter Developer Portal and regenerate your tokens.'
        );
      } else {
        logger.error('Error in generateAndPostTweet:', error);
      }
    } else {
      logger.error('Unknown error in generateAndPostTweet:', error);
    }
    // Serialize non-enumerable properties like "message" and "stack"
    // to capture full error details in logs.
    try {
      const serializedError = JSON.stringify(
        error,
        Object.getOwnPropertyNames(error),
        2
      );
      logger.error('Raw error object:', serializedError);
    } catch (serErr) {
      logger.error('Failed to serialize error object:', serErr);
    }
    throw error;
  }
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
    // Rethrow the original error so upstream handlers can access full details.
    throw error;
  }
}

// Schedule tweets
function scheduleTweets(): void {
  const intervalHours = parseInt(process.env.TWEET_INTERVAL_HOURS || '4');
  const scheduleRule = `0 */${intervalHours} * * *`;

  schedule.scheduleJob(scheduleRule, () => generateAndPostTweet(false));
  logger.info(`Scheduled tweets every ${intervalHours} hours`);
}

// Start the bot
async function startBot(): Promise<void> {
  try {
    logger.info('Starting Twitter bot...');
    analyticsManager.setBotRunning(true);
    scheduleTweets();
    logger.info('Twitter bot is running...');
  } catch (error) {
    logger.error('Error starting bot:', error);
    analyticsManager.setBotRunning(false);
    process.exit(1);
  }
}

// Add a graceful shutdown handler
function gracefulShutdown(): void {
  logger.info('Shutting down Twitter bot...');
  schedule.gracefulShutdown().then(() => {
    analyticsManager.setBotRunning(false);
    logger.info('Scheduler shut down gracefully.');
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Export functions for testing
export { generateAndPostTweet, generateTweet, startBot }; 