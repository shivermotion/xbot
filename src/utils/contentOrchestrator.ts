import { personaCreator, GeneratedPersona } from './personaCreator';
import { strategyBank, ContentStrategy, StrategyContext } from './strategyBank';
import { rulesBank, TweetRule } from './rulesBank';
import { logger } from './logger';
import { initializeContentSystem } from './contentData';
import { trendMonitor } from './trendMonitor';

// Initialize the content system when the module is loaded
initializeContentSystem();
logger.info('Content system initialized with engagement-focused strategies');

export interface ContentRequest {
  personaId?: string;
  strategyId?: string;
  ruleSetId?: string;
  context?: {
    topic?: string;
    audience?: string;
    goal?: 'engagement' | 'information' | 'entertainment' | 'controversy';
    tone?: 'positive' | 'negative' | 'neutral' | 'mixed';
    riskLevel?: 'low' | 'medium' | 'high';
  };
  customRules?: string[];
  customInstructions?: string;
  useTrendingTopics?: boolean; // New option to use trending topics
}

export interface GeneratedContent {
  persona: GeneratedPersona;
  strategy: ContentStrategy;
  rules: TweetRule[];
  fullPrompt: string;
  metadata: {
    personaTraits: string[];
    strategyCategory: string;
    ruleCategories: string[];
    estimatedEffectiveness: number;
    trendContext?: {
      trendingTopics: string[];
      trendSources: {
        trendingTopics: Array<{
          trend: string;
          source: 'twitter_api' | 'static_bank' | 'external_api';
          method?: string;
          engagement?: number;
          frequency?: number;
          category?: string;
        }>;
      };
    };
  };
}

class ContentOrchestrator {
  // Generate content using the three systems
  async generateContent(request: ContentRequest): Promise<GeneratedContent> {
    // 1. Get or create persona
    const persona = this.getPersona(request.personaId);
    
    // 2. Get strategy
    const strategy = this.getStrategy(request.strategyId, request.context);
    
    // 3. Get rules
    const rules = this.getRules(request.ruleSetId, request.customRules, request.context);
    
    // 4. Enhance context with trending topics if requested
    let enhancedContext = { ...request.context };
    let trendContext = undefined;
    
    if (request.useTrendingTopics || !request.context?.topic) {
      try {
        const trendData = await trendMonitor.getTrendContext();
        trendContext = {
          trendingTopics: trendData.trendingTopics,
          trendSources: trendData.trendSources
        };
        
        // If no topic provided, use a trending topic
        if (!enhancedContext.topic) {
          const trendingTopic = await trendMonitor.getRandomTrendingTopic();
          if (trendingTopic) {
            enhancedContext.topic = trendingTopic;
            logger.info(`Using trending topic: ${trendingTopic}`);
          }
        }
        
        // If topic is provided, check if it's trending
        if (enhancedContext.topic) {
          const isTrending = await trendMonitor.isTopicTrending(enhancedContext.topic);
          if (isTrending) {
            logger.info(`Topic "${enhancedContext.topic}" is currently trending`);
          }
        }
      } catch (error) {
        logger.warn('Failed to get trend context:', error);
      }
    }
    
    // 5. Build the complete prompt
    const fullPrompt = this.buildCompletePrompt(persona, strategy, rules, { ...request, context: enhancedContext });

    // 6. Calculate metadata
    const metadata = this.calculateMetadata(persona, strategy, rules, trendContext);

    return {
      persona,
      strategy,
      rules,
      fullPrompt,
      metadata
    };
  }

  // Validate and clean the generated tweet
  private validateAndCleanTweet(tweet: string): string {
    let cleaned = tweet.trim();
    
    // Remove any numbering, bullet points, or list indicators
    cleaned = cleaned.replace(/^\d+\.\s*/, ''); // Remove "1. " at start
    cleaned = cleaned.replace(/^[-*•]\s*/, ''); // Remove "- " or "* " at start
    
    // Take only the first line if multiple lines were generated
    cleaned = cleaned.split('\n')[0].trim();
    
    // Ensure it's under 280 characters
    if (cleaned.length > 280) {
      cleaned = cleaned.slice(0, 277) + '...';
    }
    
    // Final validation
    if (cleaned.length === 0) {
      throw new Error('Generated tweet is empty after cleanup');
    }
    
    return cleaned;
  }

  // Get a persona (random if not specified)
  private getPersona(personaId?: string): GeneratedPersona {
    if (personaId) {
      // Try to get existing persona first
      const existingPersona = personaCreator.getPersonaById(personaId);
      
      if (existingPersona) {
        return existingPersona;
      }
      
      logger.warn(`Persona ${personaId} not found, using random persona`);
    }
    
    // Return random persona if no valid ID provided
    return personaCreator.getRandomPersona();
  }

  // Get available personas for selection
  getAvailablePersonas(): GeneratedPersona[] {
    const personas = personaCreator.getPersonas();
    return personas.map(persona => {
      const traits = personaCreator.getPersonalityTraits().filter(trait => 
        persona.baseTraits.includes(trait.id)
      );
      
      return {
        id: persona.id,
        name: persona.name,
        description: persona.description,
        traits,
        voicePrompt: personaCreator['buildVoicePrompt'](traits),
        writingInstructions: personaCreator['buildWritingInstructions'](traits)
      };
    });
  }

  // Get a specific persona by name (case-insensitive)
  getPersonaByName(name: string): GeneratedPersona | null {
    const personas = personaCreator.getPersonas();
    const persona = personas.find(p => 
      p.name.toLowerCase().includes(name.toLowerCase()) ||
      p.id.toLowerCase().includes(name.toLowerCase())
    );
    
    if (persona) {
      return personaCreator.getPersonaById(persona.id);
    }
    
    return null;
  }

  // Get a specific persona by ID
  getPersonaById(personaId: string): GeneratedPersona | null {
    return personaCreator.getPersonaById(personaId);
  }

  // Get a strategy (best for context if not specified)
  private getStrategy(strategyId?: string, context?: StrategyContext): ContentStrategy {
    if (strategyId) {
      const strategies = strategyBank.getStrategies();
      const strategy = strategies.find(s => s.id === strategyId);
      
      if (strategy) {
        return strategy;
      }
      
      logger.warn(`Strategy ${strategyId} not found, using best for context`);
    }
    
    // Get best strategy for context, or random if no context
    return context ? strategyBank.getBestStrategyForContext(context) : strategyBank.getRandomStrategy();
  }

  // Get rules (from rule set or custom selection)
  private getRules(
    ruleSetId?: string, 
    customRules?: string[], 
    context?: ContentRequest['context']
  ): TweetRule[] {
    if (ruleSetId) {
      return rulesBank.getRulesFromSet(ruleSetId);
    }
    
    if (customRules && customRules.length > 0) {
      return rulesBank.getRules().filter(rule => customRules.includes(rule.id));
    }
    
    // Get rules for context, or all required rules
    return context ? rulesBank.getRulesForContext(context) : rulesBank.getRequiredRules();
  }

  // Build the complete prompt combining all elements
  private buildCompletePrompt(
    persona: GeneratedPersona,
    strategy: ContentStrategy,
    rules: TweetRule[],
    request: ContentRequest
  ): string {
    const parts: string[] = [];

    // 1. Clear instruction to generate a single tweet
    parts.push('Generate ONE single tweet. Do not create examples, lists, or multiple tweets.');
    
    // 2. Character limit enforcement
    parts.push('CRITICAL: Your response must be exactly ONE tweet under 280 characters. No exceptions.');
    
    // 3. Hashtag and emoji guidance
    parts.push('Use hashtags and emojis sparingly and naturally. Not every tweet needs them. When you do use them, keep it to 1-2 hashtags max.');
    
    // 4. Persona voice
    parts.push(persona.voicePrompt);
    
    // 5. Strategy
    const strategyPrompt = strategyBank.applyStrategy(strategy.id, request.context);
    parts.push(`Strategy: ${strategyPrompt}`);
    
    // 6. Rules
    const ruleIds = rules.map(rule => rule.id);
    const rulesPrompt = rulesBank.applyRules(ruleIds);
    if (rulesPrompt) {
      parts.push(rulesPrompt);
    }
    
    // 7. Writing instructions
    parts.push(`Writing Style: ${persona.writingInstructions}`);
    
    // 8. Custom instructions
    if (request.customInstructions) {
      parts.push(`Additional Instructions: ${request.customInstructions}`);
    }
    
    // 9. Context information
    if (request.context?.topic) {
      parts.push(`Topic: ${request.context.topic}`);
    }
    
    if (request.context?.audience) {
      parts.push(`Target Audience: ${request.context.audience}`);
    }

    // 10. Final reminder
    parts.push('Remember: Generate exactly ONE tweet under 280 characters. No examples, no lists, no multiple tweets.');

    return parts.join('\n\n');
  }

  // Calculate metadata about the generated content
  private calculateMetadata(
    persona: GeneratedPersona,
    strategy: ContentStrategy,
    rules: TweetRule[],
    trendContext?: GeneratedContent['metadata']['trendContext']
  ) {
    const personaTraits = persona.traits.map(trait => trait.name);
    const ruleCategories = [...new Set(rules.map(rule => rule.category))];
    
    // Calculate estimated effectiveness based on strategy effectiveness and rule balance
    const ruleBalance = this.calculateRuleBalance(rules);
    let estimatedEffectiveness = (strategy.effectiveness + ruleBalance) / 2;
    
    // Boost effectiveness if using trending topics
    if (trendContext && trendContext.trendingTopics.length > 0) {
      estimatedEffectiveness = Math.min(estimatedEffectiveness * 1.2, 1.0); // Boost by 20%
    }
    
    return {
      personaTraits,
      strategyCategory: strategy.category,
      ruleCategories,
      estimatedEffectiveness,
      trendContext
    };
  }

  // Calculate rule balance (how well the rules work together)
  private calculateRuleBalance(rules: TweetRule[]): number {
    if (rules.length === 0) return 0.5;
    
    const categories = rules.map(rule => rule.category);
    const categoryCounts = categories.reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Balance is better when we have a mix of categories
    const uniqueCategories = Object.keys(categoryCounts).length;
    const totalRules = rules.length;
    
    // More categories = better balance (up to a point)
    const categoryBalance = Math.min(uniqueCategories / 6, 1);
    
    // Some rules are better than none, but too many can be restrictive
    const ruleCountBalance = Math.min(totalRules / 5, 1);
    
    return (categoryBalance + ruleCountBalance) / 2;
  }

  // Get available options for building content
  getAvailableOptions() {
    return {
      personas: personaCreator.getPersonas().map(p => ({ id: p.id, name: p.name, description: p.description })),
      personalityTraits: personaCreator.getPersonalityTraits().map(t => ({ id: t.id, name: t.name, description: t.description })),
      strategies: strategyBank.getStrategies().map(s => ({ id: s.id, name: s.name, category: s.category, effectiveness: s.effectiveness })),
      ruleSets: rulesBank.getRuleSets().map(rs => ({ id: rs.id, name: rs.name, description: rs.description })),
      rules: rulesBank.getRules().map(r => ({ id: r.id, name: r.name, category: r.category, priority: r.priority, isRequired: r.isRequired }))
    };
  }

  // Get statistics about the content system
  getSystemStats() {
    return {
      persona: {
        totalPersonas: personaCreator.getPersonas().length,
        totalTraits: personaCreator.getPersonalityTraits().length
      },
      strategy: strategyBank.getStrategyStats(),
      rules: rulesBank.getRulesStats()
    };
  }

  // Get current trend information
  async getTrendInfo() {
    try {
      const trendContext = await trendMonitor.getTrendContext();
      return {
        trendingTopics: trendContext.trendingTopics,
        lastUpdated: trendContext.lastUpdated,
        trendSources: trendContext.trendSources
      };
    } catch (error) {
      logger.error('Error getting trend info:', error);
      return null;
    }
  }
}

export const contentOrchestrator = new ContentOrchestrator(); 