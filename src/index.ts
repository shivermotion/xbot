import { startBot } from './bot';
import { generateAndPostTweet } from './bot';

// Check if --tweet-once flag is provided
const args = process.argv.slice(2);
const tweetOnce = args.includes('--tweet-once');

if (tweetOnce) {
  // Run a single tweet and exit
  generateAndPostTweet(false)
    .then(() => {
      console.log('Tweet posted successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to post tweet:', error);
      process.exit(1);
    });
} else {
  // Start the bot with scheduling
  startBot().catch((error) => {
    console.error('Failed to start bot:', error);
    process.exit(1);
  });
} 