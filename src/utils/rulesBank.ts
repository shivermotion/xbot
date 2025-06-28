export interface TweetRule {
  id: string;
  name: string;
  description: string;
  rule: string;
  category: 'content' | 'format' | 'safety' | 'engagement' | 'branding' | 'legal';
  priority: 'high' | 'medium' | 'low';
  isRequired: boolean; // Whether this rule must always be applied
  examples: string[];
}

export interface RuleSet {
  id: string;
  name: string;
  description: string;
  rules: string[]; // IDs of rules in this set
  useCases: string[];
}

class RulesBank {
  private rules: TweetRule[] = [];
  private ruleSets: RuleSet[] = [];

  // Add rules to the bank
  addRule(rule: TweetRule): void {
    this.rules.push(rule);
  }

  // Add rule sets to the bank
  addRuleSet(ruleSet: RuleSet): void {
    this.ruleSets.push(ruleSet);
  }

  // Get all rules
  getRules(): TweetRule[] {
    return [...this.rules];
  }

  // Get all rule sets
  getRuleSets(): RuleSet[] {
    return [...this.ruleSets];
  }

  // Get rules by category
  getRulesByCategory(category: TweetRule['category']): TweetRule[] {
    return this.rules.filter(rule => rule.category === category);
  }

  // Get required rules (always applied)
  getRequiredRules(): TweetRule[] {
    return this.rules.filter(rule => rule.isRequired);
  }

  // Get a rule set by ID
  getRuleSet(ruleSetId: string): RuleSet | undefined {
    return this.ruleSets.find(rs => rs.id === ruleSetId);
  }

  // Get rules from a rule set
  getRulesFromSet(ruleSetId: string): TweetRule[] {
    const ruleSet = this.getRuleSet(ruleSetId);
    if (!ruleSet) {
      throw new Error(`Rule set ${ruleSetId} not found`);
    }

    return this.rules.filter(rule => ruleSet.rules.includes(rule.id));
  }

  // Get a random rule set
  getRandomRuleSet(): RuleSet {
    return this.ruleSets[Math.floor(Math.random() * this.ruleSets.length)];
  }

  // Get rules by priority
  getRulesByPriority(priority: TweetRule['priority']): TweetRule[] {
    return this.rules.filter(rule => rule.priority === priority);
  }

  // Apply rules to create a rules prompt
  applyRules(ruleIds: string[]): string {
    const selectedRules = this.rules.filter(rule => ruleIds.includes(rule.id));
    
    if (selectedRules.length === 0) {
      return '';
    }

    const rulesText = selectedRules
      .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority))
      .map(rule => `${rule.name}: ${rule.rule}`)
      .join('; ');

    return `Rules: ${rulesText}`;
  }

  // Apply a rule set
  applyRuleSet(ruleSetId: string): string {
    const rules = this.getRulesFromSet(ruleSetId);
    const ruleIds = rules.map(rule => rule.id);
    return this.applyRules(ruleIds);
  }

  // Get all required rules plus optional rules
  getRulesWithRequired(optionalRuleIds: string[] = []): string {
    const requiredRules = this.getRequiredRules();
    const optionalRules = this.rules.filter(rule => 
      optionalRuleIds.includes(rule.id) && !rule.isRequired
    );

    const allRules = [...requiredRules, ...optionalRules];
    const ruleIds = allRules.map(rule => rule.id);
    
    return this.applyRules(ruleIds);
  }

  // Get rules for a specific context
  getRulesForContext(context: {
    audience?: string;
    topic?: string;
    goal?: string;
    riskLevel?: 'low' | 'medium' | 'high';
  }): TweetRule[] {
    let filteredRules = this.rules;

    // Filter by risk level
    if (context.riskLevel) {
      const priorityMap = { low: ['low'], medium: ['low', 'medium'], high: ['low', 'medium', 'high'] };
      const allowedPriorities = priorityMap[context.riskLevel];
      filteredRules = filteredRules.filter(rule => allowedPriorities.includes(rule.priority));
    }

    // Always include required rules
    const requiredRules = this.getRequiredRules();
    const optionalRules = filteredRules.filter(rule => !rule.isRequired);

    return [...requiredRules, ...optionalRules];
  }

  // Validate rules (check for conflicts, etc.)
  validateRules(ruleIds: string[]): {
    isValid: boolean;
    conflicts: string[];
    warnings: string[];
  } {
    const selectedRules = this.rules.filter(rule => ruleIds.includes(rule.id));
    const conflicts: string[] = [];
    const warnings: string[] = [];

    // Check for potential conflicts (simplified)
    const safetyRules = selectedRules.filter(rule => rule.category === 'safety');
    const engagementRules = selectedRules.filter(rule => rule.category === 'engagement');

    if (safetyRules.length > 3) {
      warnings.push('Many safety rules may limit creativity');
    }

    if (engagementRules.length === 0) {
      warnings.push('No engagement rules specified');
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings
    };
  }

  // Get rules statistics
  getRulesStats(): {
    total: number;
    byCategory: Record<TweetRule['category'], number>;
    byPriority: Record<TweetRule['priority'], number>;
    requiredCount: number;
    ruleSetsCount: number;
  } {
    const byCategory: Record<TweetRule['category'], number> = {
      content: 0,
      format: 0,
      safety: 0,
      engagement: 0,
      branding: 0,
      legal: 0
    };

    const byPriority: Record<TweetRule['priority'], number> = {
      high: 0,
      medium: 0,
      low: 0
    };

    this.rules.forEach(rule => {
      byCategory[rule.category]++;
      byPriority[rule.priority]++;
    });

    return {
      total: this.rules.length,
      byCategory,
      byPriority,
      requiredCount: this.getRequiredRules().length,
      ruleSetsCount: this.ruleSets.length
    };
  }

  private getPriorityWeight(priority: TweetRule['priority']): number {
    const weights = { high: 3, medium: 2, low: 1 };
    return weights[priority];
  }
}

export const rulesBank = new RulesBank(); 