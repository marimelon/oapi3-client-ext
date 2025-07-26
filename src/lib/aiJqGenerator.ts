interface WorkerResponse {
  type: 'success' | 'error';
  id: string;
  result?: any;
  error?: string;
}

export class AIJqGenerator {
  private static instance: AIJqGenerator | null = null;
  private worker: Worker | null = null;
  private isLoading = false;
  private modelReady = false;
  private loadingPromise: Promise<void> | null = null;
  private messageId = 0;
  private pendingMessages = new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>();

  private constructor() {}

  static getInstance(): AIJqGenerator {
    if (!AIJqGenerator.instance) {
      AIJqGenerator.instance = new AIJqGenerator();
    }
    return AIJqGenerator.instance;
  }

  async initialize(): Promise<void> {
    if (this.modelReady) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.isLoading = true;
    this.loadingPromise = this._initializeWorker();
    
    try {
      await this.loadingPromise;
    } finally {
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }

  private async _initializeWorker(): Promise<void> {
    try {
      // Create worker from the worker file
      this.worker = new Worker(new URL('./aiWorker.ts', import.meta.url), {
        type: 'module'
      });

      // Set up message handler
      this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
        const { type, id, result, error } = event.data;
        const pending = this.pendingMessages.get(id);
        
        if (pending) {
          this.pendingMessages.delete(id);
          if (type === 'success') {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error || 'Unknown worker error'));
          }
        }
      });

      // Initialize the model in the worker
      await this.sendMessage('initialize', {
        model: 'HuggingFaceTB/SmolLM3-3B-ONNX',
        device: 'webgpu',
        dtype: 'q4f16'
      });

      this.modelReady = true;
    } catch (error) {
      console.error('Failed to initialize AI worker:', error);
      throw new Error('Failed to initialize AI model');
    }
  }

  private sendMessage(type: string, payload?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = (++this.messageId).toString();
      this.pendingMessages.set(id, { resolve, reject });

      this.worker.postMessage({ type, id, payload });
    });
  }

  async generateJqQuery(naturalLanguageInput: string, jsonSample?: any): Promise<string> {
    if (!this.modelReady) {
      await this.initialize();
    }

    if (!this.modelReady) {
      throw new Error('Model not initialized');
    }

    const prompt = this.buildPrompt(naturalLanguageInput, jsonSample);
    
    try {
      const generatedText = await this.sendMessage('generate', {
        prompt,
        options: {
          max_new_tokens: 100,
          temperature: 0.1,
          do_sample: true,
          top_p: 0.95,
        }
      });

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
    return this.modelReady;
  }

  isModelLoading(): boolean {
    return this.isLoading;
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.modelReady = false;
    this.isLoading = false;
    this.pendingMessages.clear();
  }
}