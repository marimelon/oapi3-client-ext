import { pipeline } from '@huggingface/transformers';

// Configure transformers.js for web worker environment
// Models will be downloaded from Hugging Face Hub

interface WorkerMessage {
  type: 'initialize' | 'generate' | 'status' | 'dispose';
  id: string;
  payload?: any;
}

interface InitializePayload {
  modelId: string;
  maxLength?: number;
  device?: string;
}

interface ModelSession {
  pipeline: any; // Use any to avoid complex union types
  maxLength: number;
}

interface GeneratePayload {
  prompt: string | Array<{role: string, content: string}>;
  options: {
    max_new_tokens?: number;
    temperature?: number;
    do_sample?: boolean;
    top_p?: number;
  };
}

class AIWorker {
  private modelSession: ModelSession | null = null;
  private isLoading = false;

  async initialize(payload: InitializePayload): Promise<void> {
    if (this.modelSession) return;
    if (this.isLoading) throw new Error('Model is already loading');

    this.isLoading = true;

    try {
      console.log('Initializing SmolLM3-3B model with transformers.js pipeline...');
      console.log('Model ID:', payload.modelId);

      // Create text generation pipeline
      const pipelineConfig: any = {
        device: payload.device || 'webgpu',
        dtype: 'q4f16'
      };

      const textGenerator = await pipeline('text-generation', payload.modelId, pipelineConfig);

      console.log('✅ Pipeline created successfully');

      this.modelSession = {
        pipeline: textGenerator,
        maxLength: payload.maxLength || 512
      };

      console.log('✅ SmolLM3-3B pipeline loaded successfully!');
    } catch (error) {
      console.error('❌ Failed to initialize pipeline:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });

      // Don't fallback, let the error propagate
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async generate(payload: GeneratePayload): Promise<string> {
    if (!this.modelSession) {
      throw new Error('Model not initialized');
    }

    const { prompt, options } = payload;
    const { pipeline } = this.modelSession;

    try {
      // Prepare messages based on prompt type
      let messages;
      if (typeof prompt === 'string') {
        // If prompt is a string, create default jq query messages
        messages = [
          {
            "role": "system",
            "content": "You are a helpful assistant that generates jq queries. Generate only the jq query without any explanation.",
          },
          { "role": "user", "content": `Generate a jq query for: ${prompt}` },
        ];
      } else {
        // If prompt is already messages array, use it directly
        messages = prompt;
      }

      // Log the chat template for debugging
      const formattedTemplate = pipeline.tokenizer.apply_chat_template(messages);
      console.log('📝 Chat template output:', formattedTemplate);

      // Generate text using transformers.js pipeline
      console.log('🚀 Running text generation with pipeline...');
      const result = await pipeline(messages, {
        max_new_tokens: options.max_new_tokens || 50,
        temperature: options.temperature || 0.1,
        do_sample: options.do_sample !== undefined ? options.do_sample : true,
        top_p: options.top_p || 0.95,
        return_full_text: false, // Only return generated text, not the input
      });

      console.log('✅ Pipeline generation completed');
      console.log('🔍 Raw pipeline result:', result);

      // Extract generated text from pipeline result
      let generatedText = '';
      if (Array.isArray(result) && result.length > 0) {
        generatedText = (result[0] as any).generated_text || '';
        if (Array.isArray(generatedText)) {
          // 最後の要素を取得する
          generatedText = generatedText[generatedText.length - 1].content;
        }
      } else if (typeof result === 'object' && (result as any).generated_text) {
        generatedText = (result as any).generated_text;
      } else {
        console.warn('Unexpected pipeline result format:', result);
        return this.generateBasicJqQuery();
      }

      console.log('📝 Generated text:', `"${generatedText}"`);

      // Clean up the output - remove thinking tags and extra whitespace
      const cleanedText = this.cleanGeneratedText(generatedText);
      console.log('✨ Cleaned text:', `"${cleanedText}"`);

      return cleanedText || '.';

    } catch (error) {
      console.error('Generation error:', error);
      // Fallback to basic query
      return this.generateBasicJqQuery();
    }
  }

  /**
   * Clean generated text by removing thinking tags and extra whitespace
   * @private
   */
  private cleanGeneratedText(text: string): string {
    // Remove <think></think> tags and their content
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '');

    // Remove extra whitespace and newlines
    cleaned = cleaned.trim();

    // If the text is empty or just whitespace, return fallback
    if (!cleaned) {
      return '.';
    }

    return cleaned;
  }

  private generateBasicJqQuery(): string {
    // Simple fallback for error cases
    return '.';
  }


  getStatus() {
    return {
      isLoading: this.isLoading,
      isReady: this.modelSession !== null,
      modelType: 'transformers.js-pipeline',
      device: this.modelSession?.pipeline ? 'loaded' : 'not-loaded'
    };
  }

  dispose(): void {
    if (this.modelSession) {
      try {
        // Pipeline cleanup is handled automatically by transformers.js
        console.log('Disposing pipeline resources...');
        this.modelSession = null;
      } catch (e) {
        console.warn('Error disposing pipeline:', e);
      }
    }
  }
}

const worker = new AIWorker();

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = event.data;

  try {
    switch (type) {
      case 'initialize':
        await worker.initialize(payload as InitializePayload);
        self.postMessage({ type: 'success', id, result: 'Model initialized' });
        break;

      case 'generate':
        const result = await worker.generate(payload as GeneratePayload);
        self.postMessage({ type: 'success', id, result });
        break;

      case 'status':
        const status = worker.getStatus();
        self.postMessage({ type: 'success', id, result: status });
        break;

      case 'dispose':
        worker.dispose();
        self.postMessage({ type: 'success', id, result: 'Worker disposed' });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});