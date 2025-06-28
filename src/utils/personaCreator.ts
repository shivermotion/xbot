export interface PersonalityTrait {
  id: string;
  name: string;
  description: string;
  examples: string[];
  weight: number; // 0-1, how strongly this trait should be applied
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  baseTraits: string[]; // IDs of personality traits
  voiceCharacteristics: string[];
  commonTopics: string[];
  writingStyle: string;
  tone: 'formal' | 'casual' | 'sarcastic' | 'enthusiastic' | 'critical' | 'humorous' | 'serious';
  vocabulary: 'simple' | 'moderate' | 'complex' | 'technical' | 'slang';
}

export interface GeneratedPersona {
  id: string;
  name: string;
  description: string;
  traits: PersonalityTrait[];
  voicePrompt: string;
  writingInstructions: string;
}

class PersonaCreator {
  private personalityTraits: PersonalityTrait[] = [];
  private personas: Persona[] = [];

  // Add personality traits to the bank
  addPersonalityTrait(trait: PersonalityTrait): void {
    this.personalityTraits.push(trait);
  }

  // Add personas to the bank
  addPersona(persona: Persona): void {
    this.personas.push(persona);
  }

  // Get all available traits
  getPersonalityTraits(): PersonalityTrait[] {
    return [...this.personalityTraits];
  }

  // Get all available personas
  getPersonas(): Persona[] {
    return [...this.personas];
  }

  // Create a persona by combining traits
  createPersonaFromTraits(
    name: string,
    traitIds: string[],
    additionalInstructions?: string
  ): GeneratedPersona {
    const selectedTraits = this.personalityTraits.filter(trait => 
      traitIds.includes(trait.id)
    );

    if (selectedTraits.length === 0) {
      throw new Error('No valid traits found');
    }

    const voicePrompt = this.buildVoicePrompt(selectedTraits);
    const writingInstructions = this.buildWritingInstructions(selectedTraits, additionalInstructions);

    return {
      id: `generated-${Date.now()}`,
      name,
      description: `Generated persona combining: ${selectedTraits.map(t => t.name).join(', ')}`,
      traits: selectedTraits,
      voicePrompt,
      writingInstructions
    };
  }

  // Use an existing persona as a base and modify it
  createPersonaFromBase(
    basePersonaId: string,
    modifications: {
      additionalTraits?: string[];
      voiceModifications?: string[];
      writingStyleChanges?: string;
    }
  ): GeneratedPersona {
    const basePersona = this.personas.find(p => p.id === basePersonaId);
    if (!basePersona) {
      throw new Error(`Base persona ${basePersonaId} not found`);
    }

    const baseTraits = this.personalityTraits.filter(trait => 
      basePersona.baseTraits.includes(trait.id)
    );

    const additionalTraits = modifications.additionalTraits 
      ? this.personalityTraits.filter(trait => 
          modifications.additionalTraits!.includes(trait.id)
        )
      : [];

    const allTraits = [...baseTraits, ...additionalTraits];
    const voicePrompt = this.buildVoicePrompt(allTraits);
    
    let writingInstructions = this.buildWritingInstructions(allTraits);
    if (modifications.writingStyleChanges) {
      writingInstructions += ` ${modifications.writingStyleChanges}`;
    }

    return {
      id: `modified-${basePersonaId}-${Date.now()}`,
      name: `Modified ${basePersona.name}`,
      description: `Modified version of ${basePersona.name}`,
      traits: allTraits,
      voicePrompt,
      writingInstructions
    };
  }

  // Get a random persona
  getRandomPersona(): GeneratedPersona {
    const randomPersona = this.personas[Math.floor(Math.random() * this.personas.length)];
    const traits = this.personalityTraits.filter(trait => 
      randomPersona.baseTraits.includes(trait.id)
    );

    return {
      id: randomPersona.id,
      name: randomPersona.name,
      description: randomPersona.description,
      traits,
      voicePrompt: this.buildVoicePrompt(traits),
      writingInstructions: this.buildWritingInstructions(traits)
    };
  }

  private buildVoicePrompt(traits: PersonalityTrait[]): string {
    const traitDescriptions = traits.map(trait => 
      `${trait.name}: ${trait.description}`
    ).join('; ');

    const examples = traits
      .filter(trait => trait.examples.length > 0)
      .map(trait => trait.examples[Math.floor(Math.random() * trait.examples.length)])
      .join(' ');

    return `Voice: ${traitDescriptions}. Examples: ${examples}`;
  }

  private buildWritingInstructions(traits: PersonalityTrait[], additionalInstructions?: string): string {
    const instructions = traits.map(trait => 
      `Incorporate ${trait.name} (weight: ${trait.weight})`
    ).join('; ');

    return `${instructions}${additionalInstructions ? `; ${additionalInstructions}` : ''}`;
  }
}

export const personaCreator = new PersonaCreator(); 