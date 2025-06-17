import { createInterface } from 'readline';
import { startBot, generateAndPostTweet, fetchNews, setNewsTopic, currentNewsTopic } from './bot';
import { logger } from './utils/logger';
import chalk from 'chalk';
import boxen from 'boxen';
import figlet from 'figlet';
import { TwitterApi } from 'twitter-api-v2';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Twitter client
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

// Analytics tracking
interface BotAnalytics {
  totalTweets: number;
  successfulTweets: number;
  failedTweets: number;
  lastTweetTime: Date | null;
  lastTweetContent: string;
  errors: string[];
  isBotRunning: boolean;
  fallbackTweets: number;
}

const analytics: BotAnalytics = {
  totalTweets: 0,
  successfulTweets: 0,
  failedTweets: 0,
  lastTweetTime: null,
  lastTweetContent: '',
  errors: [],
  isBotRunning: false,
  fallbackTweets: 0
};

// ASCII Art Header
function displayHeader() {
  console.clear();
  console.log(
    chalk.blue(
      figlet.textSync('XBot CLI', { horizontalLayout: 'full' })
    )
  );
  console.log(
    boxen(
      chalk.green('Twitter Bot Management Interface') + 
      (analytics.isBotRunning ? chalk.yellow('\nBot Status: Running') : chalk.red('\nBot Status: Stopped')),
      { padding: 1, borderColor: analytics.isBotRunning ? 'green' : 'red' }
    )
  );
}

// Display Menu
function displayMenu() {
  console.log('\n' + chalk.yellow('Available Commands:'));
  console.log(chalk.cyan('1.') + ' Start Bot');
  console.log(chalk.cyan('2.') + ' Generate & Post Test Tweet');
  console.log(chalk.cyan('3.') + ' View Analytics');
  console.log(chalk.cyan('4.') + ' Test News API');
  console.log(chalk.cyan('5.') + ' View Recent Tweets');
  console.log(chalk.cyan('6.') + ' View Error Log');
  console.log(chalk.cyan('7.') + ' Change News Topic');
  console.log(chalk.cyan('8.') + ' Check Twitter Permissions');
  console.log(chalk.cyan('9.') + ' Exit');
  console.log('\n' + chalk.green('Enter command number:'));
}

// View Analytics
async function viewAnalytics() {
  console.clear();
  console.log(
    boxen(
      chalk.yellow('Bot Analytics'),
      { padding: 1, borderColor: 'yellow' }
    )
  );
  
  console.log(chalk.cyan('Bot Status:'), analytics.isBotRunning ? chalk.green('Running') : chalk.red('Stopped'));
  console.log(chalk.cyan('Total Tweets:'), analytics.totalTweets);
  console.log(chalk.cyan('Successful Tweets:'), analytics.successfulTweets);
  console.log(chalk.cyan('Failed Tweets:'), analytics.failedTweets);
  console.log(chalk.cyan('Fallback Tweets:'), analytics.fallbackTweets);
  console.log(chalk.cyan('Last Tweet Time:'), analytics.lastTweetTime || 'Never');
  console.log(chalk.cyan('Last Tweet Content:'), analytics.lastTweetContent || 'None');
  
  // Display API Status
  console.log('\n' + chalk.yellow('API Status:'));
  console.log(chalk.cyan('News API:'), process.env.NEWS_API_KEY ? chalk.green('Configured') : chalk.red('Not Configured'));
  console.log(chalk.cyan('Hugging Face:'), process.env.HUGGINGFACE_TOKEN ? chalk.green('Configured') : chalk.red('Not Configured'));
  
  // Display Recent Errors
  if (analytics.errors.length > 0) {
    console.log('\n' + chalk.yellow('Recent Errors:'));
    analytics.errors.slice(-5).forEach((error, index) => {
      console.log(chalk.red(`${index + 1}.`), error);
    });
  }
  
  console.log('\n' + chalk.yellow('Press Enter to return to menu...'));
  await new Promise(resolve => process.stdin.once('data', resolve));
}

// Test News API
async function testNewsAPI() {
  console.clear();
  console.log(chalk.yellow('Testing News API...'));
  
  if (!process.env.NEWS_API_KEY) {
    console.log(chalk.red('News API key is not configured!'));
    console.log(chalk.yellow('Please add your News API key to the .env file:'));
    console.log(chalk.cyan('NEWS_API_KEY=your_api_key_here'));
  } else {
    try {
      const news = await fetchNews();
      if (news.length > 0) {
        console.log(chalk.green('Successfully fetched news:'));
        news.forEach((headline, index) => {
          console.log(chalk.cyan(`${index + 1}.`), headline);
        });
      } else {
        console.log(chalk.yellow('No news articles found.'));
      }
    } catch (error) {
      console.log(chalk.red('Error fetching news:'), error);
      console.log(chalk.yellow('\nPlease check your News API key in the .env file.'));
    }
  }
  
  console.log('\n' + chalk.yellow('Press Enter to return to menu...'));
  await new Promise(resolve => process.stdin.once('data', resolve));
}

// View Recent Tweets
async function viewRecentTweets() {
  console.clear();
  console.log(chalk.yellow('Fetching recent tweets...'));
  
  try {
    const tweets = await client.v2.userTimeline(process.env.TWITTER_USER_ID!, {
      max_results: 5,
    });
    
    console.log(chalk.green('Recent Tweets:'));
    for await (const tweet of tweets) {
      console.log(
        chalk.cyan(new Date(tweet.created_at!).toLocaleString()),
        '\n',
        tweet.text,
        '\n'
      );
    }
  } catch (error) {
    console.log(chalk.red('Error fetching tweets:'), error);
  }
  
  console.log('\n' + chalk.yellow('Press Enter to return to menu...'));
  await new Promise(resolve => process.stdin.once('data', resolve));
}

// View Error Log
function viewErrorLog() {
  console.clear();
  console.log(
    boxen(
      chalk.red('Error Log'),
      { padding: 1, borderColor: 'red' }
    )
  );
  
  if (analytics.errors.length === 0) {
    console.log(chalk.green('No errors logged.'));
  } else {
    analytics.errors.forEach((error, index) => {
      console.log(chalk.red(`${index + 1}.`), error);
    });
  }
  
  console.log('\n' + chalk.yellow('Press Enter to return to menu...'));
  process.stdin.once('data', () => {});
}

// Change News Topic
async function changeNewsTopic() {
  console.clear();
  console.log(chalk.yellow('Change News Topic'));
  console.log(chalk.cyan('Current topic:'), currentNewsTopic);
  console.log('\n' + chalk.yellow('Enter new topic (e.g., #tech OR #technology):'));
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('', async (topic) => {
    if (topic.trim()) {
      setNewsTopic(topic.trim());
      console.log(chalk.green('News topic updated successfully!'));
      
      // Test the new topic
      console.log(chalk.yellow('\nTesting new topic...'));
      const news = await fetchNews();
      if (news.length > 0) {
        console.log(chalk.green('Successfully fetched news with new topic:'));
        news.forEach((headline, index) => {
          console.log(chalk.cyan(`${index + 1}.`), headline);
        });
      } else {
        console.log(chalk.yellow('No news articles found with the new topic.'));
      }
    } else {
      console.log(chalk.red('Topic cannot be empty!'));
    }
    
    console.log('\n' + chalk.yellow('Press Enter to return to menu...'));
    await new Promise(resolve => process.stdin.once('data', resolve));
    rl.close();
  });
}

// Add function to check Twitter permissions
async function checkTwitterPermissions() {
  console.clear();
  console.log(chalk.yellow('Checking Twitter API permissions...'));
  
  try {
    // Get user info
    const user = await client.v2.me();
    
    // Get access level from headers
    const response = await client.v2.get('users/me');
    const accessLevel = response._headers.get('x-access-level');
    
    console.log('\n' + boxen(
      chalk.green('Twitter API Permissions'),
      { padding: 1, borderColor: 'green' }
    ));
    
    console.log(chalk.cyan('Account:'), chalk.green('@' + user.data.username));
    console.log(chalk.cyan('User ID:'), user.data.id);
    console.log(chalk.cyan('Access Level:'), chalk.yellow(accessLevel || 'unknown'));
    
    // Parse permissions
    const permissions = {
      canRead: accessLevel?.includes('read') || false,
      canWrite: accessLevel?.includes('write') || false,
      canDM: accessLevel?.includes('directmessages') || false
    };
    
    console.log('\n' + chalk.yellow('Permissions Breakdown:'));
    console.log(chalk.cyan('Read Access:'), permissions.canRead ? chalk.green('✓') : chalk.red('✗'));
    console.log(chalk.cyan('Write Access:'), permissions.canWrite ? chalk.green('✓') : chalk.red('✗'));
    console.log(chalk.cyan('DM Access:'), permissions.canDM ? chalk.green('✓') : chalk.red('✗'));
    
    if (!permissions.canWrite) {
      console.log('\n' + chalk.red('Warning: Write permission is not enabled!'));
      console.log(chalk.yellow('Please update your app permissions to "Read and Write" in the Twitter Developer Portal'));
      console.log(chalk.yellow('and regenerate your access tokens.'));
    }
    
    // Verify credentials are present
    console.log('\n' + chalk.yellow('Credentials Status:'));
    console.log(chalk.cyan('API Key:'), process.env.TWITTER_API_KEY ? chalk.green('✓') : chalk.red('✗'));
    console.log(chalk.cyan('API Secret:'), process.env.TWITTER_API_SECRET ? chalk.green('✓') : chalk.red('✗'));
    console.log(chalk.cyan('Access Token:'), process.env.TWITTER_ACCESS_TOKEN ? chalk.green('✓') : chalk.red('✗'));
    console.log(chalk.cyan('Access Secret:'), process.env.TWITTER_ACCESS_TOKEN_SECRET ? chalk.green('✓') : chalk.red('✗'));
    
  } catch (error: any) {
    console.log(chalk.red('\nError checking permissions:'));
    
    // Handle 401 Unauthorized errors specifically
    if (error.code === 401 || (error.data?.errors && error.data.errors.some((e: any) => e.code === 401))) {
      console.log(chalk.red('Authentication failed (401 Unauthorized)'));
      console.log(chalk.yellow('\nPossible causes:'));
      console.log(chalk.yellow('1. Invalid or expired tokens'));
      console.log(chalk.yellow('2. Incorrect API key or secret'));
      console.log(chalk.yellow('3. Tokens were regenerated in the Twitter Developer Portal'));
      
      // Check if credentials are present
      const missingCreds = [];
      if (!process.env.TWITTER_API_KEY) missingCreds.push('TWITTER_API_KEY');
      if (!process.env.TWITTER_API_SECRET) missingCreds.push('TWITTER_API_SECRET');
      if (!process.env.TWITTER_ACCESS_TOKEN) missingCreds.push('TWITTER_ACCESS_TOKEN');
      if (!process.env.TWITTER_ACCESS_TOKEN_SECRET) missingCreds.push('TWITTER_ACCESS_TOKEN_SECRET');
      
      if (missingCreds.length > 0) {
        console.log(chalk.red('\nMissing credentials:'));
        missingCreds.forEach(cred => console.log(chalk.red(`- ${cred}`)));
      }
      
      console.log(chalk.yellow('\nRecommended actions:'));
      console.log(chalk.yellow('1. Verify all credentials are correctly set in your .env file'));
      console.log(chalk.yellow('2. Go to Twitter Developer Portal and check your app settings'));
      console.log(chalk.yellow('3. Regenerate your tokens if needed and update them in .env'));
      console.log(chalk.yellow('4. Ensure your app has the correct permissions enabled'));
      
    } else if (error.data?.errors) {
      error.data.errors.forEach((err: any) => {
        console.log(chalk.red(`- ${err.message}`));
      });
    } else {
      console.log(chalk.red(error.message || 'Unknown error'));
      if (error.code) {
        console.log(chalk.red(`Error code: ${error.code}`));
      }
    }
  }
  
  console.log('\n' + chalk.yellow('Press Enter to return to menu...'));
  await new Promise(resolve => process.stdin.once('data', resolve));
}

// Main CLI Interface
async function startCLI() {
  // Add debug logging for environment variables
  console.log(chalk.yellow('\nChecking environment variables...'));
  const envVars = {
    TWITTER_API_KEY: process.env.TWITTER_API_KEY ? '✓' : '✗',
    TWITTER_API_SECRET: process.env.TWITTER_API_SECRET ? '✓' : '✗',
    TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN ? '✓' : '✗',
    TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET ? '✓' : '✗'
  };
  
  console.log(chalk.cyan('Environment Status:'));
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(chalk.cyan(`${key}:`), value === '✓' ? chalk.green(value) : chalk.red(value));
  });
  
  if (Object.values(envVars).includes('✗')) {
    console.log(chalk.red('\nWarning: Some environment variables are missing!'));
    console.log(chalk.yellow('Please check your .env file and ensure all Twitter credentials are set.'));
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const handleCommand = async (command: string) => {
    switch (command.trim()) {
      case '1':
        console.clear();
        if (analytics.isBotRunning) {
          console.log(chalk.yellow('Bot is already running!'));
        } else {
          console.log(chalk.green('Starting bot...'));
          try {
            // Start bot in background
            startBot().catch(error => {
              console.log(chalk.red('Bot encountered an error:'), error);
              analytics.isBotRunning = false;
            });
            analytics.isBotRunning = true;
            console.log(chalk.green('Bot is now running in scheduled mode. Tweets will be posted automatically.'));
            
            // Display API status
            if (!process.env.NEWS_API_KEY) {
              console.log(chalk.yellow('\nWarning: News API key is not configured. News context will be disabled.'));
            }
            if (!process.env.HUGGINGFACE_TOKEN) {
              console.log(chalk.yellow('Warning: Hugging Face token is not configured. Some features may be limited.'));
            }
          } catch (error: unknown) {
            console.log(chalk.red('Failed to start bot:'), error instanceof Error ? error.message : String(error));
            analytics.isBotRunning = false;
          }
        }
        console.log(chalk.yellow('\nPress Enter to return to menu...'));
        await new Promise(resolve => process.stdin.once('data', resolve));
        break;
      case '2':
        console.clear();
        console.log(chalk.yellow('Generating and posting test tweet...'));
        try {
          await generateAndPostTweet();
          analytics.totalTweets++;
          analytics.successfulTweets++;
          analytics.lastTweetTime = new Date();
          
          // Check if the tweet was a fallback
          const lastError = analytics.errors[analytics.errors.length - 1];
          if (lastError && lastError.includes('Using fallback tweet')) {
            analytics.fallbackTweets++;
            console.log(chalk.yellow('Note: This was a fallback tweet and counts towards your daily limit.'));
          }
          
          console.log(chalk.green('Test tweet posted successfully!'));
        } catch (error: unknown) {
          analytics.failedTweets++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          analytics.errors.push(errorMessage);
          
          if (errorMessage.includes('Tweet generation failed')) {
            console.log(chalk.red('Failed to generate tweet:'), errorMessage);
            console.log(chalk.yellow('\nThe tweet was not posted to avoid wasting API calls.'));
          } else {
            console.log(chalk.red('Error posting tweet:'), errorMessage);
          }
        }
        console.log(chalk.yellow('\nPress Enter to return to menu...'));
        await new Promise(resolve => process.stdin.once('data', resolve));
        break;
      case '3':
        await viewAnalytics();
        break;
      case '4':
        await testNewsAPI();
        break;
      case '5':
        await viewRecentTweets();
        break;
      case '6':
        viewErrorLog();
        break;
      case '7':
        await changeNewsTopic();
        break;
      case '8':
        await checkTwitterPermissions();
        break;
      case '9':
        console.log(chalk.yellow('Exiting...'));
        process.exit(0);
        break;
      default:
        console.log(chalk.red('Invalid command. Please try again.'));
        console.log(chalk.yellow('\nPress Enter to return to menu...'));
        await new Promise(resolve => process.stdin.once('data', resolve));
    }
    
    displayHeader();
    displayMenu();
  };

  displayHeader();
  displayMenu();

  rl.on('line', handleCommand);
}

// Start the CLI
startCLI().catch((error: unknown) => {
  console.error(chalk.red('Error starting CLI:'), error);
  process.exit(1);
}); 