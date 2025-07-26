import { pipeline, type TextGenerationPipeline } from '@huggingface/transformers';

export class AIJqGenerator {
  private static instance: AIJqGenerator | null = null;
  private pipeline: TextGenerationPipeline | null = null;
  private isLoading = false;
  private loadingPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): AIJqGenerator {
    if (!AIJqGenerator.instance) {
      AIJqGenerator.instance = new AIJqGenerator();
    }
    return AIJqGenerator.instance;
  }

  async initialize(): Promise<void> {
    if (this.pipeline) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.isLoading = true;
    this.loadingPromise = this._loadModel();
    
    try {
      await this.loadingPromise;
    } finally {
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }

  private async _loadModel(): Promise<void> {
    try {
      this.pipeline = await pipeline(
        'text-generation',
        'HuggingFaceTB/SmolLM3-3B-ONNX',
        { 
          device: 'webgpu',
          dtype: 'q8'
        }
      );
    } catch (error) {
      console.error('Failed to load AI model:', error);
      throw new Error('Failed to initialize AI model');
    }
  }

  async generateJqQuery(naturalLanguageInput: string, jsonSample?: any): Promise<string> {
    if (!this.pipeline) {
      await this.initialize();
    }

    if (!this.pipeline) {
      throw new Error('Model not initialized');
    }

    const prompt = this.buildPrompt(naturalLanguageInput, jsonSample);
    
    try {
      const result = await this.pipeline(prompt, {
        max_new_tokens: 100,
        temperature: 0.1,
        do_sample: true,
        top_p: 0.95,
      });

      const generatedText = result[0].generated_text;
      const jqQuery = this.extractJqQuery(generatedText);
      
      return jqQuery;
    } catch (error) {
      console.error('Failed to generate jq query:', error);
      throw new Error('Failed to generate jq query');
    }
  }

  private buildPrompt(naturalLanguageInput: string, jsonSample?: any): string {
    let prompt = `You are a jq query generator. Generate a jq query for the following request.

Request: ${naturalLanguageInput}

`;

    if (jsonSample) {
      const sampleStr = typeof jsonSample === 'string' 
        ? jsonSample 
        : JSON.stringify(jsonSample, null, 2);
      
      prompt += `JSON sample:
\`\`\`json
${sampleStr.substring(0, 500)}${sampleStr.length > 500 ? '...' : ''}
\`\`\`

`;
    }

    prompt += `Generate only the jq query without any explanation. The query should be valid jq syntax.

jq query:`;

    return prompt;
  }

  private extractJqQuery(generatedText: string): string {
    const lines = generatedText.split('\n');
    const queryLine = lines.find(line => 
      line.includes('jq query:') || 
      line.includes('Query:') || 
      line.trim().startsWith('.')
    );

    if (queryLine) {
      const query = queryLine
        .replace(/^.*?(jq query:|Query:)\s*/i, '')
        .replace(/```.*$/g, '')
        .trim();
      
      return query || '.';
    }

    const trimmed = generatedText.trim();
    if (trimmed.startsWith('.') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
      return trimmed.split('\n')[0].trim();
    }

    return '.';
  }

  isReady(): boolean {
    return this.pipeline !== null;
  }

  isModelLoading(): boolean {
    return this.isLoading;
  }
}