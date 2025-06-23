import { generateAndPostTweet } from './bot';
import { healthChecker } from './utils/healthCheck';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { analyticsManager } from './utils/analytics';
import inquirer from 'inquirer';
import figlet from 'figlet';
import boxen from 'boxen';
import { sourceManager } from './utils/sources';
import { TwitterApi } from 'twitter-api-v2';

dotenv.config();

// CLI entry point
async function mainMenu() {
  try {
    // Display ASCII header and status box
    displayHeader();

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'main',
        message: 'What would you like to do?',
        choices: [
          { name: 'Generate and Post a Test Tweet (Dry Run)', value: 'test' },
          { name: 'View Analytics', value: 'analytics' },
          { name: 'Reset Analytics Data', value: 'reset' },
          { name: 'Check Bot Health', value: 'health' },
          { name: 'Manage Topics / Users', value: 'sources' },
          { name: 'Verify Twitter Credentials', value: 'verify' },
          new inquirer.Separator(),
          { name: 'Exit', value: 'exit' },
        ],
      },
    ]);

    switch (answer.main) {
      case 'test':
        await handleTestTweet();
        break;
      case 'analytics':
        await handleAnalytics();
        break;
      case 'reset':
        await handleResetAnalytics();
        break;
      case 'health':
        await handleHealthCheck();
        break;
      case 'sources':
        await handleSourceManager();
        break;
      case 'verify':
        await handleVerifyCreds();
        break;
      case 'exit':
        console.log(chalk.blue('Exiting...'));
        return;
    }
    await mainMenu(); // Loop back to the main menu
  } catch (error: any) {
    if (error.isTtyError) {
      console.error(
        chalk.red('Error: Prompt could not be rendered in this environment.')
      );
    } else {
      console.error(chalk.red('An unexpected error occurred:'), error);
    }
  }
}

async function handleTestTweet() {
  try {
    console.log(chalk.blue('Generating a test tweet (dry run)...'));
    await generateAndPostTweet(true);
    analyticsManager.recordApiCall('huggingFace');
    console.log(
      chalk.green('Test tweet generation completed successfully (dry run).')
    );
  } catch (error) {
    analyticsManager.recordApiCall('huggingFace');
    console.error(chalk.red('Error generating test tweet:'), error);
  }

  // Wait for user to press Enter before returning to menu
  await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to return to the main menu' });
}

async function handleAnalytics() {
  const stats = analyticsManager.getAnalytics();
  console.log(chalk.bold.yellow('\n--- Bot Analytics ---'));
  console.log(`Bot Status: ${stats.isBotRunning ? 'Running' : 'Stopped'}`);
  console.log(`Uptime: ${stats.uptime} seconds`);
  console.log(`Success Rate: ${stats.successRate.toFixed(2)}%`);
  console.log(chalk.bold.cyan('\n--- Tweet Counts ---'));
  console.log(`Total: ${stats.totalTweets}`);
  console.log(`Successful: ${stats.successfulTweets}`);
  console.log(`Failed: ${stats.failedTweets}`);
  console.log(chalk.bold.cyan('\n--- API Call Counts ---'));
  console.log(`Twitter: ${stats.apiCalls.twitter}`);
  console.log(`Hugging Face: ${stats.apiCalls.huggingFace}`);
  console.log(chalk.bold.yellow('\n-----------------------\n'));

  // Wait for user to press Enter before returning to menu
  await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to return to the main menu' });
}

async function handleResetAnalytics() {
  console.log(
    chalk.yellow.bold(
      'Warning: This will reset all stored analytics data to zero.'
    )
  );
  const confirmation = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmReset',
      message: 'Are you sure you want to reset analytics?',
      default: false,
    },
  ]);

  if (confirmation.confirmReset) {
    analyticsManager.reset();
    console.log(chalk.green('Analytics data has been successfully reset.'));
  } else {
    console.log(chalk.blue('Analytics reset cancelled.'));
  }
}

async function handleHealthCheck() {
  const health = await healthChecker.checkHealth();
  console.log(chalk.bold.yellow('\n--- System Health Check ---'));
  console.log(`Overall Status: ${health.status === 'healthy' ? chalk.green('Healthy') : chalk.red(health.status.toUpperCase())}`);
  console.log(`Timestamp: ${health.timestamp.toLocaleString()}`);
  console.log(chalk.bold.cyan('\n--- Services ---'));
  console.log(`Twitter API: ${health.services.twitter.status === 'healthy' ? chalk.green('✓ Healthy') : chalk.red('✗ Error')}`);
  console.log(`Hugging Face API: ${health.services.huggingFace.status === 'healthy' ? chalk.green('✓ Healthy') : chalk.red('✗ Error')}`);
  console.log(chalk.bold.cyan('\n--- Bot Performance ---'));
  console.log(`Running: ${health.bot.isRunning ? 'Yes' : 'No'}`);
  console.log(`Uptime: ${health.bot.uptime} seconds`);
  console.log(`Success Rate: ${health.bot.successRate.toFixed(2)}%`);
  console.log(chalk.bold.yellow('\n---------------------------\n'));

  // Wait for user to press Enter before returning to menu
  await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to return to the main menu' });
}

async function handleSourceManager() {
  while (true) {
    console.clear();
    console.log(chalk.yellow('--- Source Manager ---'));
    const cfg = sourceManager.getConfig();
    console.log(chalk.cyan('Mode:'), cfg.mode);
    console.log(chalk.cyan('Topics:'), cfg.topics.length ? cfg.topics.join(', ') : 'None');
    console.log(chalk.cyan('Users:'), cfg.users.length ? cfg.users.join(', ') : 'None');

    const ans = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Choose an action',
        choices: [
          { name: 'Add Topic', value: 'addTopic' },
          { name: 'Remove Topic', value: 'removeTopic' },
          { name: 'Add User', value: 'addUser' },
          { name: 'Remove User', value: 'removeUser' },
          { name: 'Toggle Mode (static/dynamic)', value: 'toggle' },
          new inquirer.Separator(),
          { name: 'Back to Main Menu', value: 'back' },
        ],
      },
    ]);

    switch ((ans as any).action) {
      case 'addTopic': {
        const { topic } = await inquirer.prompt([{ type: 'input', name: 'topic', message: 'Enter topic (without #):' }]) as any;
        if (topic.trim()) sourceManager.addTopic(topic.trim());
        break; }
      case 'removeTopic': {
        if (cfg.topics.length === 0) break;
        const { topic } = await inquirer.prompt([{ type: 'list', name: 'topic', message: 'Select topic to remove', choices: cfg.topics }]) as any;
        sourceManager.removeTopic(topic);
        break; }
      case 'addUser': {
        const { user } = await inquirer.prompt([{ type: 'input', name: 'user', message: 'Enter Twitter username (without @):' }]) as any;
        if (user.trim()) sourceManager.addUser(user.trim());
        break; }
      case 'removeUser': {
        if (cfg.users.length === 0) break;
        const { user } = await inquirer.prompt([{ type: 'list', name: 'user', message: 'Select user to remove', choices: cfg.users }]) as any;
        sourceManager.removeUser(user);
        break; }
      case 'toggle': {
        sourceManager.setMode(cfg.mode === 'static' ? 'dynamic' : 'static');
        break; }
      case 'back':
        return;
    }
  }
}

async function handleVerifyCreds() {
  console.clear();
  console.log(chalk.yellow('Verifying Twitter credentials...'));
  const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET } = process.env;
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_TOKEN_SECRET) {
    console.log(chalk.red('Missing one or more TWITTER_* variables in .env'));
  } else {
    try {
      const client = new TwitterApi({
        appKey: TWITTER_API_KEY,
        appSecret: TWITTER_API_SECRET,
        accessToken: TWITTER_ACCESS_TOKEN,
        accessSecret: TWITTER_ACCESS_TOKEN_SECRET,
      });
      const user = await client.v2.me();
      console.log(chalk.green(`Successfully authenticated as @${user.data.username}`));
    } catch (err: any) {
      console.log(chalk.red('Authentication failed:'), err?.message || err);
    }
  }
  await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to return to the main menu' });
}

// Utility to display ASCII header and bot status
function displayHeader(): void {
  console.clear();
  const header = figlet.textSync('XBot CLI', { horizontalLayout: 'full' });
  console.log(chalk.blue(header));

  const stats = analyticsManager.getAnalytics();
  const statusLine = `Bot Status: ${stats.isBotRunning ? chalk.green('Running') : chalk.red('Stopped')}`;
  const uptimeLine = `Uptime: ${stats.uptime} sec`;

  console.log(
    boxen(`${statusLine}\n${uptimeLine}`, {
      padding: 1,
      borderColor: stats.isBotRunning ? 'green' : 'red',
      borderStyle: 'round',
      align: 'center',
    })
  );
}

// Start the CLI if this file is run directly
if (require.main === module) {
  mainMenu();
} 