// Types and interfaces
interface WorkerResponse {
  type: 'success' | 'error';
  id: string;
  result?: any;
  error?: string;
}

interface WorkerMessage {
  type: string;
  id: string;
  payload?: any;
}

interface PendingMessage {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

interface ModelConfig {
  modelId: string;
  maxLength: number;
  device: string;
}

interface GenerationOptions {
  max_new_tokens: number;
  temperature: number;
  do_sample: boolean;
  top_p: number;
}

// Constants - Use HuggingFaceTB/SmolLM3-3B with transformers.js
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  modelId: 'HuggingFaceTB/SmolLM3-3B-ONNX', // Use the base model for transformers.js
  maxLength: 512,
  device: 'webgpu'
};

const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  max_new_tokens: 100,
  temperature: 0.1,
  do_sample: true,
  top_p: 0.95
};

const JSON_SAMPLE_MAX_LENGTH = 500;

/**
 * AI-powered jq query generator using a web worker for model inference.
 * Implements singleton pattern to ensure only one instance manages the AI model.
 */
export class AIJqGenerator {
  private static instance: AIJqGenerator | null = null;
  private worker: Worker | null = null;
  private isLoading = false;
  private modelReady = false;
  private loadingPromise: Promise<void> | null = null;
  private messageId = 0;
  private pendingMessages = new Map<string, PendingMessage>();

  private constructor() {
    // Expose debug method to window for console testing
    if (typeof window !== 'undefined') {
      (window as any).__llmDebug = async (prompt: string, options?: any, useTemplate: boolean = true) => {
        console.log('🐛 Initializing LLM if needed...');
        try {
          await this.initialize();
          return await this.debugGenerateLLM(prompt, options, useTemplate);
        } catch (error) {
          console.error('🐛 Debug error:', error);
          throw error;
        }
      };
      (window as any).__llmGenerator = this;
      console.log('🐛 LLM Debug: Use window.__llmDebug(prompt, options?) in console');
      console.log('🐛 LLM Generator instance: window.__llmGenerator');
    }
  }

  /**
   * Get the singleton instance of AIJqGenerator.
   * @returns The singleton instance
   */
  static getInstance(): AIJqGenerator {
    if (!AIJqGenerator.instance) {
      AIJqGenerator.instance = new AIJqGenerator();
    }
    return AIJqGenerator.instance;
  }

  /**
   * Initialize the AI model worker. Safe to call multiple times.
   * @throws {Error} If model initialization fails
   */
  async initialize(): Promise<void> {
    if (this.modelReady) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.isLoading = true;
    this.loadingPromise = this.initializeWorker();

    try {
      await this.loadingPromise;
    } catch (error) {
      this.handleInitializationError(error);
      throw error;
    } finally {
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }

  /**
   * Initialize the web worker and AI model.
   * @private
   */
  private async initializeWorker(): Promise<void> {
    this.createWorker();
    this.setupWorkerMessageHandler();
    await this.initializeModel();
    this.modelReady = true;
  }

  /**
   * Create the web worker instance.
   * @private
   */
  private createWorker(): void {
    this.worker = new Worker(new URL('./aiWorker.ts', import.meta.url), {
      type: 'module'
    });
  }

  /**
   * Set up message handler for worker communication.
   * @private
   */
  private setupWorkerMessageHandler(): void {
    if (!this.worker) {
      throw new Error('Worker not created');
    }

    this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(event.data);
    });
  }

  /**
   * Handle incoming messages from the worker.
   * @private
   */
  private handleWorkerMessage(data: WorkerResponse): void {
    const { type, id, result, error } = data;
    const pending = this.pendingMessages.get(id);

    if (pending) {
      this.pendingMessages.delete(id);
      if (type === 'success') {
        pending.resolve(result);
      } else {
        pending.reject(new Error(error || 'Unknown worker error'));
      }
    }
  }

  /**
   * Initialize the AI model in the worker.
   * @private
   */
  private async initializeModel(): Promise<void> {
    await this.sendMessage('initialize', DEFAULT_MODEL_CONFIG);
  }

  /**
   * Handle initialization errors.
   * @private
   */
  private handleInitializationError(error: unknown): void {
    console.error('Failed to initialize AI worker:', error);
    this.cleanup();
  }

  /**
   * Clean up resources after an error.
   * @private
   */
  private cleanup(): void {
    if (this.worker) {
      // Send dispose message to worker before terminating
      try {
        this.sendMessage('dispose').catch(() => { });
      } catch (e) {
        // Ignore errors during cleanup
      }
      this.worker.terminate();
      this.worker = null;
    }
    this.modelReady = false;
    this.pendingMessages.clear();
  }

  /**
   * Send a message to the worker and wait for response.
   * @private
   */
  private sendMessage(type: string, payload?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = this.generateMessageId();
      this.pendingMessages.set(id, { resolve, reject });

      const message: WorkerMessage = { type, id, payload };
      this.worker.postMessage(message);
    });
  }

  /**
   * Generate a unique message ID.
   * @private
   */
  private generateMessageId(): string {
    return (++this.messageId).toString();
  }

  /**
   * Generate a jq query from natural language input.
   * @param naturalLanguageInput The user's natural language description
   * @param jsonSample Optional JSON sample to provide context
   * @returns A jq query string
   * @throws {Error} If query generation fails
   */
  async generateJqQuery(naturalLanguageInput: string, jsonSample?: any): Promise<string> {
    await this.ensureModelReady();

    const prompt = this.buildPrompt(naturalLanguageInput, jsonSample);

    try {
      const generatedText = await this.generateText(prompt);
      return this.extractJqQuery(generatedText);
    } catch (error) {
      console.error('Failed to generate jq query:', error);
      throw new Error('Failed to generate jq query');
    }
  }

  /**
   * Ensure the model is ready for use.
   * @private
   */
  private async ensureModelReady(): Promise<void> {
    if (!this.modelReady) {
      await this.initialize();
    }

    if (!this.modelReady) {
      throw new Error('Model not initialized');
    }
  }

  /**
   * Generate text using the AI model.
   * @private
   */
  private async generateText(prompt: string): Promise<string> {
    return await this.sendMessage('generate', {
      prompt,
      options: DEFAULT_GENERATION_OPTIONS
    });
  }

  /**
   * Build the prompt for the AI model.
   * @private
   */
  private buildPrompt(naturalLanguageInput: string, jsonSample?: any): string {
    const basePrompt = this.getBasePrompt(naturalLanguageInput);
    const samplePrompt = this.buildJsonSamplePrompt(jsonSample);
    const instructionPrompt = this.getInstructionPrompt();

    return basePrompt + samplePrompt + instructionPrompt;
  }

  /**
   * Get the base prompt with the user's request.
   * @private
   */
  private getBasePrompt(naturalLanguageInput: string): string {
    return `You are a jq query generator. Generate a jq query for the following request.

Request: ${naturalLanguageInput}

`;
  }

  /**
   * Build the JSON sample part of the prompt.
   * @private
   */
  private buildJsonSamplePrompt(jsonSample?: any): string {
    if (!jsonSample) {
      return '';
    }

    const sampleStr = this.formatJsonSample(jsonSample);
    const truncatedSample = this.truncateJsonSample(sampleStr);

    return `JSON sample:
\`\`\`json
${truncatedSample}
\`\`\`

`;
  }

  /**
   * Format JSON sample as string.
   * @private
   */
  private formatJsonSample(jsonSample: any): string {
    return typeof jsonSample === 'string'
      ? jsonSample
      : JSON.stringify(jsonSample, null, 2);
  }

  /**
   * Truncate JSON sample if too long.
   * @private
   */
  private truncateJsonSample(sampleStr: string): string {
    return sampleStr.length > JSON_SAMPLE_MAX_LENGTH
      ? sampleStr.substring(0, JSON_SAMPLE_MAX_LENGTH) + '...'
      : sampleStr;
  }

  /**
   * Get the instruction part of the prompt.
   * @private
   */
  private getInstructionPrompt(): string {
    return `Generate only the jq query without any explanation. The query should be valid jq syntax.

jq query:`;
  }

  /**
   * Use LLM generated text directly without any processing
   * @private
   */
  private extractJqQuery(generatedText: string): string {
    // Use LLM output directly as requested
    console.log('📝 Using LLM output directly:', generatedText);
    return generatedText;
  }


  /**
   * Debug method to directly use LLM for testing purposes.
   * This bypasses the normal jq query prompt formatting.
   * @param prompt Raw prompt to send to the LLM
   * @param options Optional generation options
   * @returns Raw LLM output
   * @throws {Error} If generation fails
   */
  async debugGenerateLLM(
    prompt: string,
    options?: Partial<GenerationOptions>,
    useTemplate: boolean = true
  ): Promise<string> {
    await this.ensureModelReady();

    console.log('🐛 DEBUG: Direct LLM generation');
    console.log('🐛 DEBUG: Original prompt:', prompt);
    console.log('🐛 DEBUG: Use template:', useTemplate);
    console.log('🐛 DEBUG: Options:', options || 'default');

    try {
      const generationOptions = {
        ...DEFAULT_GENERATION_OPTIONS,
        ...options
      };

      // Use chat template via transformers.js pipeline
      const messages = useTemplate ? [
        {
          role: "system",
          content: "You are a helpful assistant. Respond directly and concisely."
        },
        { role: "user", content: prompt }
      ] : prompt;

      const result = await this.sendMessage('generate', {
        prompt: messages,
        options: generationOptions
      });

      console.log('🐛 DEBUG: Raw LLM output:', result);
      return result;
    } catch (error) {
      console.error('🐛 DEBUG: LLM generation failed:', error);
      throw new Error(`Debug LLM generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  /**
   * Check if the model is ready for use.
   * @returns True if model is initialized and ready
   */
  isReady(): boolean {
    return this.modelReady;
  }

  /**
   * Check if the model is currently loading.
   * @returns True if model is being loaded
   */
  isModelLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Dispose of all resources and terminate the worker.
   * Call this when the generator is no longer needed.
   */
  dispose(): void {
    this.terminateWorker();
    this.resetState();
  }

  /**
   * Terminate the worker if it exists.
   * @private
   */
  private terminateWorker(): void {
    if (this.worker) {
      // Send dispose message to worker before terminating
      try {
        this.sendMessage('dispose').catch(() => { });
      } catch (e) {
        // Ignore errors during cleanup
      }
      setTimeout(() => {
        if (this.worker) {
          this.worker.terminate();
          this.worker = null;
        }
      }, 100); // Give worker time to clean up
    }
  }

  /**
   * Reset internal state.
   * @private
   */
  private resetState(): void {
    this.modelReady = false;
    this.isLoading = false;
    this.pendingMessages.clear();
    this.loadingPromise = null;
  }
}