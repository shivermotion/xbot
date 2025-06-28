import { generateAndPostTweet } from './bot';
import { healthChecker } from './utils/healthCheck';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { analyticsManager } from './utils/analytics';
import inquirer from 'inquirer';
import figlet from 'figlet';
import boxen from 'boxen';

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
          { name: 'View Analytics', value: 'analytics' },
          { name: 'Reset Analytics Data', value: 'reset' },
          { name: 'Check Bot Health', value: 'health' },
          { name: 'Send LIVE Tweet Now', value: 'live' },
          new inquirer.Separator(),
          { name: 'Content Management (Advanced)', value: 'content' },
          new inquirer.Separator(),
          { name: 'Exit', value: 'exit' },
        ],
        loop: false,
      },
    ]);

    switch (answer.main) {
      case 'analytics':
        await handleAnalytics();
        break;
      case 'reset':
        await handleResetAnalytics();
        break;
      case 'health':
        await handleHealthCheck();
        break;
      case 'live':
        await handleLiveTweet();
        break;
      case 'content':
        await handleContentRedirect();
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

async function handleContentRedirect() {
  console.log(chalk.yellow('\n=== Content Management ==='));
  console.log(chalk.cyan('Redirecting to Content CLI for advanced features:'));
  console.log(chalk.cyan('• Content Generation & Testing'));
  console.log(chalk.cyan('• Persona Management'));
  console.log(chalk.cyan('• Strategy Management'));
  console.log(chalk.cyan('• Rules Management'));
  console.log(chalk.cyan('• Trend Monitoring'));
  console.log(chalk.cyan('• Twitter API Credentials'));
  console.log('');
  console.log(chalk.green('Run: yarn content'));
  console.log('');
  await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to return to main menu' });
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

async function handleLiveTweet() {
  console.log(chalk.yellow.bold('⚠️  WARNING: This will post a LIVE tweet to your account!'));
  const confirmation = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmLive',
      message: 'Are you sure you want to post a live tweet?',
      default: false,
    },
  ]);

  if (confirmation.confirmLive) {
    try {
      console.log(chalk.blue('Generating and posting live tweet...'));
      await generateAndPostTweet(false); // false = live tweet
      analyticsManager.recordApiCall('huggingFace');
      console.log(chalk.green('Live tweet posted successfully!'));
    } catch (error) {
      analyticsManager.recordApiCall('huggingFace');
      console.error(chalk.red('Error posting live tweet:'), error);
    }
  } else {
    console.log(chalk.blue('Live tweet cancelled.'));
  }

  // Wait for user to press Enter before returning to menu
  await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to return to the main menu' });
}

function displayHeader(): void {
  console.clear();
  console.log(
    chalk.blue(
      figlet.textSync('XBot', { horizontalLayout: 'full' })
    )
  );
  
  const statusBox = boxen(
    chalk.green(`Bot Status:
• Main CLI - Bot Operations
• Content CLI - Advanced Content Management
• Free Tier Compatible
• Railway Deployed`),
    { padding: 1, margin: 1, borderStyle: 'round' }
  );
  console.log(statusBox);
}

// Start the CLI
if (require.main === module) {
  mainMenu().catch((error) => {
    console.error('Failed to start CLI:', error);
    process.exit(1);
  });
} 