import * as dotenv from 'dotenv';
// Load environment variables as early as possible
dotenv.config();

// Debug: print Twitter API env vars to confirm loading
console.log('\n==================== DEBUG ENV ====================');
console.log('[DEBUG] TWITTER_API_KEY:', process.env.TWITTER_API_KEY);
console.log('[DEBUG] TWITTER_API_SECRET:', process.env.TWITTER_API_SECRET ? '[set]' : '[not set]');
console.log('[DEBUG] TWITTER_ACCESS_TOKEN:', process.env.TWITTER_ACCESS_TOKEN ? '[set]' : '[not set]');
console.log('[DEBUG] TWITTER_ACCESS_TOKEN_SECRET:', process.env.TWITTER_ACCESS_TOKEN_SECRET ? '[set]' : '[not set]');
console.log('===================================================\n');

// Wait for user to press Enter before continuing
try {
  require('readline-sync').question('Press Enter to continue... ');
} catch (e) {
  // fallback if readline-sync is not installed
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Press Enter to continue... ', () => rl.close());
}

import { contentOrchestrator, ContentRequest } from './utils/contentOrchestrator';
import { personaCreator } from './utils/personaCreator';
import { strategyBank } from './utils/strategyBank';
import { rulesBank } from './utils/rulesBank';
import { generateTweet } from './bot';
import chalk from 'chalk';
import inquirer from 'inquirer';
import figlet from 'figlet';
import boxen from 'boxen';

function startCli() {
  // Display header
  function displayHeader() {
    console.clear();
    console.log(
      chalk.blue(
        figlet.textSync('XBot Content', { horizontalLayout: 'full' })
      )
    );
    
    const stats = contentOrchestrator.getSystemStats();
    const statusBox = boxen(
      chalk.green(`Content System Status:
• Personas: ${stats.persona.totalPersonas}
• Personality Traits: ${stats.persona.totalTraits}
• Strategies: ${stats.strategy.total}
• Rules: ${stats.rules.total}
• Rule Sets: ${stats.rules.ruleSetsCount}`),
      { padding: 1, margin: 1, borderStyle: 'round' }
    );
    console.log(statusBox);
  }

  // Main menu
  async function mainMenu() {
    try {
      displayHeader();

      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'main',
          message: 'What would you like to do?',
          choices: [
            { name: 'Generate Content with Current System', value: 'generate' },
            { name: 'Manage Personas', value: 'personas' },
            { name: 'Manage Strategies', value: 'strategies' },
            { name: 'Manage Rules', value: 'rules' },
            { name: 'View System Statistics', value: 'stats' },
            { name: 'Test Content Generation', value: 'test' },
            { name: 'View Current Trends', value: 'trends' },
            { name: 'Check Twitter API credentials', value: 'check_twitter_creds' },
            new inquirer.Separator(),
            { name: 'Exit', value: 'exit' },
          ],
          loop: false,
        },
      ]);

      switch (answer.main) {
        case 'generate':
          await handleContentGeneration();
          break;
        case 'personas':
          await handlePersonaManagement();
          break;
        case 'strategies':
          await handleStrategyManagement();
          break;
        case 'rules':
          await handleRuleManagement();
          break;
        case 'stats':
          await handleViewStats();
          break;
        case 'test':
          await handleTestGeneration();
          break;
        case 'trends':
          await handleViewTrends();
          break;
        case 'check_twitter_creds':
          await handleCheckTwitterCreds();
          break;
        case 'exit':
          console.log(chalk.blue('Exiting...'));
          return;
      }
      await mainMenu(); // Loop back to the main menu
    } catch (error: any) {
      console.error(chalk.red('An error occurred:'), error);
      await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to continue' });
      await mainMenu();
    }
  }

  // Handle content generation
  async function handleContentGeneration() {
    console.clear();
    console.log(chalk.yellow('Content Generation'));
    
    const options = contentOrchestrator.getAvailableOptions();
    
    // Show available personas
    console.log(chalk.cyan('\nAvailable Personas:'));
    options.personas.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} - ${p.description}`);
    });
    
    // Show available strategies
    console.log(chalk.cyan('\nAvailable Strategies:'));
    options.strategies.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} (${s.category}) - Effectiveness: ${(s.effectiveness * 100).toFixed(0)}%`);
    });
    
    // Show available rule sets
    console.log(chalk.cyan('\nAvailable Rule Sets:'));
    options.ruleSets.forEach((rs, i) => {
      console.log(`${i + 1}. ${rs.name} - ${rs.description}`);
    });
    
    const request = await inquirer.prompt([
      {
        type: 'list',
        name: 'personaId',
        message: 'Select a persona (or random):',
        choices: [
          { name: 'Random Persona', value: undefined },
          ...options.personas.map(p => ({ name: p.name, value: p.id }))
        ]
      },
      {
        type: 'list',
        name: 'strategyId',
        message: 'Select a strategy (or best for context):',
        choices: [
          { name: 'Best for Context', value: undefined },
          ...options.strategies.map(s => ({ name: `${s.name} (${s.category})`, value: s.id }))
        ]
      },
      {
        type: 'list',
        name: 'ruleSetId',
        message: 'Select a rule set (or required rules only):',
        choices: [
          { name: 'Required Rules Only', value: undefined },
          ...options.ruleSets.map(rs => ({ name: rs.name, value: rs.id }))
        ]
      },
      {
        type: 'input',
        name: 'topic',
        message: 'Topic (optional):',
      },
      {
        type: 'input',
        name: 'audience',
        message: 'Target audience (optional):',
      },
      {
        type: 'list',
        name: 'goal',
        message: 'Content goal:',
        choices: [
          { name: 'Engagement', value: 'engagement' },
          { name: 'Information', value: 'information' },
          { name: 'Entertainment', value: 'entertainment' },
          { name: 'Controversy', value: 'controversy' }
        ]
      }
    ]);
    
    const contentRequest: ContentRequest = {
      personaId: request.personaId,
      strategyId: request.strategyId,
      ruleSetId: request.ruleSetId,
      context: {
        topic: request.topic || undefined,
        audience: request.audience || undefined,
        goal: request.goal
      }
    };
    
    const generatedContent = await contentOrchestrator.generateContent(contentRequest);
    
    console.log(chalk.green('\n=== Generated Content ==='));
    console.log(chalk.cyan('Persona:'), generatedContent.persona.name);
    console.log(chalk.cyan('Strategy:'), generatedContent.strategy.name);
    console.log(chalk.cyan('Rules:'), generatedContent.rules.map((r: any) => r.name).join(', '));
    console.log(chalk.cyan('Estimated Effectiveness:'), `${(generatedContent.metadata.estimatedEffectiveness * 100).toFixed(0)}%`);
    
    // Show trend information if available
    if (generatedContent.metadata.trendContext) {
      console.log(chalk.cyan('\n=== Trend Context Used ==='));
      if (generatedContent.metadata.trendContext.trendingTopics.length > 0) {
        console.log(chalk.yellow('Trending Topics:'), generatedContent.metadata.trendContext.trendingTopics.slice(0, 3).join(', '));
      }
      if (generatedContent.metadata.trendContext.viralHashtags.length > 0) {
        console.log(chalk.yellow('Viral Hashtags:'), generatedContent.metadata.trendContext.viralHashtags.slice(0, 3).join(', '));
      }
      
      // Show trend sources summary
      const twitterApiCount = generatedContent.metadata.trendContext.trendSources.trendingTopics.filter(t => t.source === 'twitter_api').length +
                             generatedContent.metadata.trendContext.trendSources.viralHashtags.filter(t => t.source === 'twitter_api').length +
                             generatedContent.metadata.trendContext.trendSources.currentEvents.filter(t => t.source === 'twitter_api').length +
                             generatedContent.metadata.trendContext.trendSources.popularKeywords.filter(t => t.source === 'twitter_api').length;
      
      const staticBankCount = generatedContent.metadata.trendContext.trendSources.trendingTopics.filter(t => t.source === 'static_bank').length +
                             generatedContent.metadata.trendContext.trendSources.viralHashtags.filter(t => t.source === 'static_bank').length +
                             generatedContent.metadata.trendContext.trendSources.currentEvents.filter(t => t.source === 'static_bank').length +
                             generatedContent.metadata.trendContext.trendSources.popularKeywords.filter(t => t.source === 'static_bank').length;
      
      console.log(chalk.gray(`Trend Sources: ${chalk.green('Twitter API')} (${twitterApiCount}), ${chalk.blue('Static Bank')} (${staticBankCount})`));
    }
    
    console.log(chalk.yellow('\n=== Full Prompt ==='));
    console.log(generatedContent.fullPrompt);
    
    await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to continue' });
  }

  // Handle persona management
  async function handlePersonaManagement() {
    console.clear();
    console.log(chalk.yellow('Persona Management'));
    
    const personas = personaCreator.getPersonas();
    const traits = personaCreator.getPersonalityTraits();
    
    console.log(chalk.cyan('\nCurrent Personas:'));
    personas.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} - ${p.description}`);
    });
    
    console.log(chalk.cyan('\nAvailable Personality Traits:'));
    traits.forEach((t, i) => {
      console.log(`${i + 1}. ${t.name} (weight: ${t.weight}) - ${t.description}`);
    });
    
    const action = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Create New Persona from Traits', value: 'create' },
          { name: 'Add New Personality Trait', value: 'addTrait' },
          { name: 'Back to Main Menu', value: 'back' }
        ]
      }
    ]);
    
    if (action.action === 'back') return;
    
    if (action.action === 'create') {
      const traitIds = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'traitIds',
          message: 'Select traits to combine:',
          choices: traits.map(t => ({ name: t.name, value: t.id }))
        }
      ]);
      
      const name = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter persona name:'
        }
      ]);
      
      try {
        const newPersona = personaCreator.createPersonaFromTraits(name.name, traitIds.traitIds);
        console.log(chalk.green(`Created persona: ${newPersona.name}`));
      } catch (error) {
        console.log(chalk.red('Error creating persona:'), error);
      }
    }
    
    await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to continue' });
  }

  // Handle strategy management
  async function handleStrategyManagement() {
    console.clear();
    console.log(chalk.yellow('Strategy Management'));
    
    const strategies = strategyBank.getStrategies();
    const stats = strategyBank.getStrategyStats();
    
    console.log(chalk.cyan('\nStrategy Statistics:'));
    console.log(`Total Strategies: ${stats.total}`);
    console.log(`Average Effectiveness: ${(stats.averageEffectiveness * 100).toFixed(0)}%`);
    
    console.log(chalk.cyan('\nStrategies by Category:'));
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      console.log(`${category}: ${count}`);
    });
    
    console.log(chalk.cyan('\nCurrent Strategies:'));
    strategies.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} (${s.category}) - ${(s.effectiveness * 100).toFixed(0)}% effective`);
    });
    
    await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to continue' });
  }

  // Handle rule management
  async function handleRuleManagement() {
    console.clear();
    console.log(chalk.yellow('Rule Management'));
    
    const rules = rulesBank.getRules();
    const ruleSets = rulesBank.getRuleSets();
    const stats = rulesBank.getRulesStats();
    
    console.log(chalk.cyan('\nRule Statistics:'));
    console.log(`Total Rules: ${stats.total}`);
    console.log(`Required Rules: ${stats.requiredCount}`);
    console.log(`Rule Sets: ${stats.ruleSetsCount}`);
    
    console.log(chalk.cyan('\nRules by Category:'));
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      console.log(`${category}: ${count}`);
    });
    
    console.log(chalk.cyan('\nCurrent Rule Sets:'));
    ruleSets.forEach((rs, i) => {
      console.log(`${i + 1}. ${rs.name} - ${rs.description}`);
    });
    
    await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to continue' });
  }

  // Handle view statistics
  async function handleViewStats() {
    console.clear();
    console.log(chalk.yellow('System Statistics'));
    
    const stats = contentOrchestrator.getSystemStats();
    
    console.log(chalk.cyan('\nPersona System:'));
    console.log(`Total Personas: ${stats.persona.totalPersonas}`);
    console.log(`Total Traits: ${stats.persona.totalTraits}`);
    
    console.log(chalk.cyan('\nStrategy System:'));
    console.log(`Total Strategies: ${stats.strategy.total}`);
    console.log(`Average Effectiveness: ${(stats.strategy.averageEffectiveness * 100).toFixed(0)}%`);
    
    console.log(chalk.cyan('\nRules System:'));
    console.log(`Total Rules: ${stats.rules.total}`);
    console.log(`Required Rules: ${stats.rules.requiredCount}`);
    console.log(`Rule Sets: ${stats.rules.ruleSetsCount}`);
    
    await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to continue' });
  }

  // Handle test generation
  async function handleTestGeneration() {
    console.clear();
    console.log(chalk.yellow('Test Content Generation'));
    
    const contentRequest: ContentRequest = {
      context: {
        goal: 'engagement',
        tone: 'mixed'
      }
    };
    
    const generatedContent = await contentOrchestrator.generateContent(contentRequest);
    
    console.log(chalk.green('\n=== Generated Content ==='));
    console.log(chalk.cyan('Persona:'), generatedContent.persona.name);
    console.log(chalk.cyan('Strategy:'), generatedContent.strategy.name);
    console.log(chalk.cyan('Estimated Effectiveness:'), `${(generatedContent.metadata.estimatedEffectiveness * 100).toFixed(0)}%`);
    
    // Show trend information if available
    if (generatedContent.metadata.trendContext) {
      console.log(chalk.cyan('\n=== Trend Context Used ==='));
      if (generatedContent.metadata.trendContext.trendingTopics.length > 0) {
        console.log(chalk.yellow('Trending Topics:'), generatedContent.metadata.trendContext.trendingTopics.slice(0, 3).join(', '));
      }
      if (generatedContent.metadata.trendContext.viralHashtags.length > 0) {
        console.log(chalk.yellow('Viral Hashtags:'), generatedContent.metadata.trendContext.viralHashtags.slice(0, 3).join(', '));
      }
      
      // Show trend sources summary
      const twitterApiCount = generatedContent.metadata.trendContext.trendSources.trendingTopics.filter(t => t.source === 'twitter_api').length +
                             generatedContent.metadata.trendContext.trendSources.viralHashtags.filter(t => t.source === 'twitter_api').length +
                             generatedContent.metadata.trendContext.trendSources.currentEvents.filter(t => t.source === 'twitter_api').length +
                             generatedContent.metadata.trendContext.trendSources.popularKeywords.filter(t => t.source === 'twitter_api').length;
      
      const staticBankCount = generatedContent.metadata.trendContext.trendSources.trendingTopics.filter(t => t.source === 'static_bank').length +
                             generatedContent.metadata.trendContext.trendSources.viralHashtags.filter(t => t.source === 'static_bank').length +
                             generatedContent.metadata.trendContext.trendSources.currentEvents.filter(t => t.source === 'static_bank').length +
                             generatedContent.metadata.trendContext.trendSources.popularKeywords.filter(t => t.source === 'static_bank').length;
      
      console.log(chalk.gray(`Trend Sources: ${chalk.green('Twitter API')} (${twitterApiCount}), ${chalk.blue('Static Bank')} (${staticBankCount})`));
    }
    
    console.log(chalk.yellow('\n=== Generated Prompt ==='));
    console.log(generatedContent.fullPrompt);
    
    const shouldGenerate = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'generate',
        message: 'Would you like to generate a tweet with this prompt?',
        default: false
      }
    ]);
    
    if (shouldGenerate.generate) {
      try {
        console.log(chalk.yellow('\nGenerating tweet...'));
        const tweet = await generateTweet(generatedContent.fullPrompt, true);
        console.log(chalk.green('\n=== Generated Tweet ==='));
        console.log(tweet);
      } catch (error) {
        console.log(chalk.red('Error generating tweet:'), error);
      }
    }
    
    await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to continue' });
  }

  // Handle view trends
  async function handleViewTrends() {
    console.clear();
    console.log(chalk.yellow('Current Trends'));
    
    try {
      const trendInfo = await contentOrchestrator.getTrendInfo();
      
      if (trendInfo) {
        console.log(chalk.cyan('\n=== Trending Topics ==='));
        trendInfo.trendSources.trendingTopics.forEach((source, i) => {
          const sourceLabel = source.source === 'twitter_api' ? chalk.green('Twitter API') : 
                             source.source === 'static_bank' ? chalk.blue('Static Bank') : 
                             chalk.yellow('External API');
          const methodInfo = source.method ? chalk.gray(` (${source.method})`) : '';
          const engagementInfo = source.engagement ? chalk.cyan(` - Engagement: ${source.engagement}`) : '';
          const categoryInfo = source.category ? chalk.magenta(` - Category: ${source.category}`) : '';
          
          console.log(`${i + 1}. ${source.trend} [${sourceLabel}]${methodInfo}${engagementInfo}${categoryInfo}`);
        });
        
        console.log(chalk.cyan('\n=== Viral Hashtags ==='));
        trendInfo.trendSources.viralHashtags.forEach((source, i) => {
          const sourceLabel = source.source === 'twitter_api' ? chalk.green('Twitter API') : 
                             source.source === 'static_bank' ? chalk.blue('Static Bank') : 
                             chalk.yellow('External API');
          const engagementInfo = source.engagement ? chalk.cyan(` - Engagement: ${source.engagement}`) : '';
          
          console.log(`${i + 1}. ${source.trend} [${sourceLabel}]${engagementInfo}`);
        });
        
        console.log(chalk.cyan('\n=== Current Events ==='));
        trendInfo.trendSources.currentEvents.forEach((source, i) => {
          const sourceLabel = source.source === 'twitter_api' ? chalk.green('Twitter API') : 
                             source.source === 'static_bank' ? chalk.blue('Static Bank') : 
                             chalk.yellow('External API');
          
          console.log(`${i + 1}. ${source.trend} [${sourceLabel}]`);
        });
        
        console.log(chalk.cyan('\n=== Popular Keywords ==='));
        trendInfo.trendSources.popularKeywords.forEach((source, i) => {
          const sourceLabel = source.source === 'twitter_api' ? chalk.green('Twitter API') : 
                             source.source === 'static_bank' ? chalk.blue('Static Bank') : 
                             chalk.yellow('External API');
          const frequencyInfo = source.frequency ? chalk.cyan(` - Frequency: ${source.frequency}`) : '';
          
          console.log(`${i + 1}. ${source.trend} [${sourceLabel}]${frequencyInfo}`);
        });
        
        console.log(chalk.gray(`\nLast Updated: ${trendInfo.lastUpdated.toLocaleString()}`));
        
        // Summary statistics
        const twitterApiCount = trendInfo.trendSources.trendingTopics.filter(t => t.source === 'twitter_api').length +
                               trendInfo.trendSources.viralHashtags.filter(t => t.source === 'twitter_api').length +
                               trendInfo.trendSources.currentEvents.filter(t => t.source === 'twitter_api').length +
                               trendInfo.trendSources.popularKeywords.filter(t => t.source === 'twitter_api').length;
        
        const staticBankCount = trendInfo.trendSources.trendingTopics.filter(t => t.source === 'static_bank').length +
                               trendInfo.trendSources.viralHashtags.filter(t => t.source === 'static_bank').length +
                               trendInfo.trendSources.currentEvents.filter(t => t.source === 'static_bank').length +
                               trendInfo.trendSources.popularKeywords.filter(t => t.source === 'static_bank').length;
        
        console.log(chalk.cyan('\n=== Source Summary ==='));
        console.log(`${chalk.green('Twitter API')}: ${twitterApiCount} trends`);
        console.log(`${chalk.blue('Static Bank')}: ${staticBankCount} trends`);
        
      } else {
        console.log(chalk.red('Failed to get trend information'));
      }
    } catch (error) {
      console.log(chalk.red('Error getting trends:'), error);
    }
    
    await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to continue' });
  }

  // Add the handler for checking Twitter API credentials
  async function handleCheckTwitterCreds() {
    console.log(chalk.yellow('\n=== Twitter API Credentials Check ==='));
    console.log(chalk.cyan('TWITTER_API_KEY:'), process.env.TWITTER_API_KEY || chalk.red('[not set]'));
    console.log(chalk.cyan('TWITTER_API_SECRET:'), process.env.TWITTER_API_SECRET ? '[set]' : chalk.red('[not set]'));
    console.log(chalk.cyan('TWITTER_ACCESS_TOKEN:'), process.env.TWITTER_ACCESS_TOKEN ? '[set]' : chalk.red('[not set]'));
    console.log(chalk.cyan('TWITTER_ACCESS_TOKEN_SECRET:'), process.env.TWITTER_ACCESS_TOKEN_SECRET ? '[set]' : chalk.red('[not set]'));
    
    console.log(chalk.yellow('\n=== Free Tier Limitations ==='));
    console.log(chalk.red('• Post caps: 500 posts per month'));
    console.log(chalk.red('• Read requests: 100 per month'));
    console.log(chalk.red('• No access to search endpoints'));
    console.log(chalk.red('• No access to trends endpoints'));
    console.log(chalk.red('• No access to filtered streams'));
    
    console.log(chalk.green('\n=== Available Endpoints ==='));
    console.log(chalk.green('• POST /2/tweets - Post tweets'));
    console.log(chalk.green('• GET /2/users/me - Get user info'));
    console.log(chalk.green('• GET /2/tweets/:id - Get specific tweets'));
    
    console.log(chalk.blue('\n=== Bot Strategy ==='));
    console.log(chalk.blue('• Using static trend bank only'));
    console.log(chalk.blue('• No real-time trend monitoring'));
    console.log(chalk.blue('• Focus on content generation and posting'));
    
    console.log('');
    await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to continue' });
  }

  // Start the CLI
  if (require.main === module) {
    mainMenu().catch((error) => {
      console.error('Failed to start content CLI:', error);
      process.exit(1);
    });
  }
}

startCli(); 