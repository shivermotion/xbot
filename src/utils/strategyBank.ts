export interface ContentStrategy {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
  category: 'engagement' | 'information' | 'entertainment' | 'controversy' | 'community' | 'personal';
  effectiveness: number; // 0-1, how effective this strategy typically is
  useCases: string[];
  examples: string[];
}

export interface StrategyContext {
  topic?: string;
  audience?: string;
  goal?: 'engagement' | 'information' | 'entertainment' | 'controversy';
  tone?: 'positive' | 'negative' | 'neutral' | 'mixed';
}

class StrategyBank {
  private strategies: ContentStrategy[] = [];

  // Add strategies to the bank
  addStrategy(strategy: ContentStrategy): void {
    this.strategies.push(strategy);
  }

  // Get all strategies
  getStrategies(): ContentStrategy[] {
    return [...this.strategies];
  }

  // Get strategies by category
  getStrategiesByCategory(category: ContentStrategy['category']): ContentStrategy[] {
    return this.strategies.filter(strategy => strategy.category === category);
  }

  // Get a random strategy
  getRandomStrategy(): ContentStrategy {
    return this.strategies[Math.floor(Math.random() * this.strategies.length)];
  }

  // Get a random strategy by category
  getRandomStrategyByCategory(category: ContentStrategy['category']): ContentStrategy {
    const categoryStrategies = this.getStrategiesByCategory(category);
    if (categoryStrategies.length === 0) {
      throw new Error(`No strategies found for category: ${category}`);
    }
    return categoryStrategies[Math.floor(Math.random() * categoryStrategies.length)];
  }

  // Get the best strategy for a given context
  getBestStrategyForContext(context: StrategyContext): ContentStrategy {
    let filteredStrategies = this.strategies;

    // Filter by goal if specified
    if (context.goal) {
      filteredStrategies = filteredStrategies.filter(strategy => 
        strategy.category === context.goal || 
        strategy.useCases.some(useCase => useCase.includes(context.goal!))
      );
    }

    // Filter by tone if specified
    if (context.tone) {
      filteredStrategies = filteredStrategies.filter(strategy => {
        const strategyTone = this.getStrategyTone(strategy);
        return strategyTone === context.tone || strategyTone === 'mixed';
      });
    }

    if (filteredStrategies.length === 0) {
      return this.getRandomStrategy();
    }

    // Sort by effectiveness and return the best
    return filteredStrategies.sort((a, b) => b.effectiveness - a.effectiveness)[0];
  }

  // Apply a strategy to create a prompt
  applyStrategy(strategyId: string, context: StrategyContext = {}): string {
    const strategy = this.strategies.find(s => s.id === strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    let prompt = strategy.promptTemplate;

    // Replace placeholders with context values
    if (context.topic) {
      prompt = prompt.replace('{topic}', context.topic);
    }
    if (context.audience) {
      prompt = prompt.replace('{audience}', context.audience);
    }
    if (context.goal) {
      prompt = prompt.replace('{goal}', context.goal);
    }

    // Remove any remaining placeholders
    prompt = prompt.replace(/\{[\w]+\}/g, '');

    return prompt;
  }

  // Get multiple strategies and combine them
  getStrategyCombination(
    count: number = 2,
    categories?: ContentStrategy['category'][]
  ): ContentStrategy[] {
    let availableStrategies = this.strategies;
    
    if (categories) {
      availableStrategies = availableStrategies.filter(strategy => 
        categories.includes(strategy.category)
      );
    }

    if (availableStrategies.length === 0) {
      throw new Error('No strategies available for the specified criteria');
    }

    const selected: ContentStrategy[] = [];
    const shuffled = [...availableStrategies].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      selected.push(shuffled[i]);
    }

    return selected;
  }

  // Get strategy statistics
  getStrategyStats(): {
    total: number;
    byCategory: Record<ContentStrategy['category'], number>;
    averageEffectiveness: number;
  } {
    const byCategory: Record<ContentStrategy['category'], number> = {
      engagement: 0,
      information: 0,
      entertainment: 0,
      controversy: 0,
      community: 0,
      personal: 0
    };

    this.strategies.forEach(strategy => {
      byCategory[strategy.category]++;
    });

    const averageEffectiveness = this.strategies.reduce((sum, strategy) => 
      sum + strategy.effectiveness, 0
    ) / this.strategies.length;

    return {
      total: this.strategies.length,
      byCategory,
      averageEffectiveness
    };
  }

  private getStrategyTone(strategy: ContentStrategy): 'positive' | 'negative' | 'neutral' | 'mixed' {
    const description = strategy.description.toLowerCase();
    const examples = strategy.examples.join(' ').toLowerCase();

    const positiveWords = ['positive', 'happy', 'excited', 'great', 'amazing', 'love', 'enjoy'];
    const negativeWords = ['negative', 'angry', 'frustrated', 'hate', 'terrible', 'awful', 'disappointed'];

    const positiveCount = [...positiveWords, ...negativeWords].filter(word => 
      description.includes(word) || examples.includes(word)
    ).length;

    if (positiveCount > 0) return 'mixed';
    if (description.includes('controversy') || description.includes('criticism')) return 'negative';
    if (description.includes('celebration') || description.includes('praise')) return 'positive';
    
    return 'neutral';
  }
}

export const strategyBank = new StrategyBank(); 