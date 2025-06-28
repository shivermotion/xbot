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
    while (true) {
      console.clear();
      console.log(chalk.yellow('=== Persona Management ==='));
      
      const personas = contentOrchestrator.getAvailablePersonas();
      
      console.log(chalk.cyan('\n📋 Available Personas:'));
      personas.forEach((persona, i) => {
        console.log(chalk.bold(`\n${i + 1}. ${persona.name}`));
        console.log(chalk.gray(`   ID: ${persona.id}`));
        console.log(chalk.white(`   ${persona.description}`));
        
        const basePersona = personaCreator.getPersonas().find(p => p.id === persona.id);
        if (basePersona) {
          console.log(chalk.cyan(`   Tone: ${basePersona.tone}`));
          console.log(chalk.cyan(`   Vocabulary: ${basePersona.vocabulary}`));
        }
        
        console.log(chalk.yellow(`   Traits:`));
        persona.traits.forEach((trait: any) => {
          console.log(chalk.gray(`     • ${trait.name} (${(trait.weight * 100).toFixed(0)}%): ${trait.description}`));
        });
        
        console.log(chalk.blue(`   Voice Characteristics:`));
        if (basePersona) {
          basePersona.voiceCharacteristics.forEach((char: string) => {
            console.log(chalk.gray(`     • ${char}`));
          });
        }
        
        console.log(chalk.green(`   Common Topics:`));
        if (basePersona) {
          basePersona.commonTopics.forEach((topic: string) => {
            console.log(chalk.gray(`     • ${topic}`));
          });
        }
      });
      
      console.log(chalk.yellow('\n🎭 Character Archetypes:'));
      console.log(chalk.cyan('1. Rage Bait Vigilante (@IFindRetards style)'));
      console.log(chalk.gray('   • Blunt, provocative posts targeting cultural stupidity'));
      console.log(chalk.gray('   • "Found one" format with visual targets'));
      console.log(chalk.gray('   • Zero nuance, maximum outrage potential'));
      
      console.log(chalk.cyan('\n2. Conspiracy Theorist (@RealAlexJones style)'));
      console.log(chalk.gray('   • Bombastic truth-teller exposing hidden agendas'));
      console.log(chalk.gray('   • ALL CAPS delivery with dramatic claims'));
      console.log(chalk.gray('   • Links everything to grand conspiracy narratives'));
      
      console.log(chalk.cyan('\n3. Bitter Tech Insider (@yacineMTB style)'));
      console.log(chalk.gray('   • Personal rants with insider tech knowledge'));
      console.log(chalk.gray('   • Vulnerable authenticity mixed with snark'));
      console.log(chalk.gray('   • Leverages industry credibility for engagement'));
      
      const ans = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Choose an action',
          choices: [
            { name: 'Test Specific Persona', value: 'test' },
            { name: 'View Persona Details', value: 'details' },
            { name: 'Generate Content with Persona', value: 'generate' },
            new inquirer.Separator(),
            { name: 'Back to Main Menu', value: 'back' },
          ],
          loop: false,
        },
      ]);

      switch (ans.action) {
        case 'test': {
          const { personaId } = await inquirer.prompt([
            {
              type: 'list',
              name: 'personaId',
              message: 'Select persona to test:',
              choices: personas.map(p => ({ name: p.name, value: p.id }))
            }
          ]);
          
          const persona = contentOrchestrator.getPersonaById(personaId);
          if (persona) {
            console.log(chalk.yellow('\n=== Persona Test ==='));
            console.log(chalk.bold(`Testing: ${persona.name}`));
            console.log(chalk.cyan('\nVoice Prompt:'));
            console.log(chalk.white(persona.voicePrompt));
            console.log(chalk.cyan('\nWriting Instructions:'));
            console.log(chalk.white(persona.writingInstructions));
            
            const { topic } = await inquirer.prompt([
              {
                type: 'input',
                name: 'topic',
                message: 'Enter a topic to test with:',
                default: 'current events'
              }
            ]);
            
            const content = await contentOrchestrator.generateContent({
              personaId: persona.id,
              context: { topic, goal: 'engagement' },
              useTrendingTopics: false
            });
            
            console.log(chalk.green('\n=== Generated Content ==='));
            console.log(chalk.white(content.fullPrompt));
            
            console.log(chalk.cyan('\n=== Metadata ==='));
            console.log(chalk.gray(`Persona: ${content.persona.name}`));
            console.log(chalk.gray(`Strategy: ${content.strategy.name}`));
            console.log(chalk.gray(`Rules Applied: ${content.rules.length}`));
            console.log(chalk.gray(`Estimated Effectiveness: ${(content.metadata.estimatedEffectiveness * 100).toFixed(0)}%`));
          }
          break;
        }
        
        case 'details': {
          const { personaId } = await inquirer.prompt([
            {
              type: 'list',
              name: 'personaId',
              message: 'Select persona for detailed view:',
              choices: personas.map(p => ({ name: p.name, value: p.id }))
            }
          ]);
          
          const persona = contentOrchestrator.getPersonaById(personaId);
          if (persona) {
            console.log(chalk.yellow('\n=== Detailed Persona Analysis ==='));
            console.log(chalk.bold(`${persona.name}`));
            console.log(chalk.white(persona.description));
            
            console.log(chalk.cyan('\n🎭 Personality Traits:'));
            persona.traits.forEach((trait: any) => {
              console.log(chalk.bold(`\n${trait.name} (${(trait.weight * 100).toFixed(0)}% weight)`));
              console.log(chalk.white(trait.description));
              console.log(chalk.gray('Examples:'));
              trait.examples.forEach((example: string) => {
                console.log(chalk.gray(`  • "${example}"`));
              });
            });
            
            const basePersona = personaCreator.getPersonas().find(p => p.id === persona.id);
            if (basePersona) {
              console.log(chalk.cyan('\n📝 Writing Style:'));
              console.log(chalk.white(basePersona.writingStyle));
              
              console.log(chalk.cyan('\n🎯 Common Topics:'));
              basePersona.commonTopics.forEach(topic => {
                console.log(chalk.gray(`  • ${topic}`));
              });
            }
          }
          break;
        }
        
        case 'generate': {
          const { personaId } = await inquirer.prompt([
            {
              type: 'list',
              name: 'personaId',
              message: 'Select persona for content generation:',
              choices: personas.map(p => ({ name: p.name, value: p.id }))
            }
          ]);
          
          const { topic, useTrends } = await inquirer.prompt([
            {
              type: 'input',
              name: 'topic',
              message: 'Enter topic (or leave blank for random):',
            },
            {
              type: 'confirm',
              name: 'useTrends',
              message: 'Use trending topics?',
              default: true
            }
          ]);
          
          const content = await contentOrchestrator.generateContent({
            personaId,
            context: { topic: topic || undefined, goal: 'engagement' },
            useTrendingTopics: useTrends
          });
          
          console.log(chalk.green('\n=== Generated Content ==='));
          console.log(chalk.white(content.fullPrompt));
          
          const { generateTweet } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'generateTweet',
              message: 'Generate actual tweet with this content?',
              default: false
            }
          ]);
          
          if (generateTweet) {
            try {
              console.log(chalk.yellow('\nGenerating tweet...'));
              const tweet = await generateTweet(content.fullPrompt, true); // dry run
              console.log(chalk.green('\n=== Generated Tweet ==='));
              console.log(chalk.white(tweet));
            } catch (error) {
              console.error(chalk.red('Error generating tweet:'), error);
            }
          }
          break;
        }
        
        case 'back':
          return;
      }
      
      await inquirer.prompt({ type: 'input', name: 'continue', message: 'Press Enter to continue' });
    }
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