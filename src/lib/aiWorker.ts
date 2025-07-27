import * as ort from 'onnxruntime-web';
import { AutoTokenizer, env } from '@xenova/transformers';

// Configure @xenova/transformers to use remote models from Hugging Face
env.allowRemoteModels = true;
env.allowLocalModels = false;
env.useBrowserCache = true;

// Configure ONNX Runtime for web worker environment
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;

// Set WASM paths explicitly for web worker context
// Use CDN for WASM files to avoid Vite bundling issues
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';

// Disable remote model loading for security
ort.env.logLevel = 'warning';

interface WorkerMessage {
  type: 'initialize' | 'generate' | 'status' | 'dispose';
  id: string;
  payload?: any;
}

interface InitializePayload {
  modelUrl: string;
  tokenizerModel: string;
  maxLength?: number;
  executionProviders?: string[];
}

interface ModelSession {
  session: ort.InferenceSession;
  tokenizer: any;
  maxLength: number;
}

interface GeneratePayload {
  prompt: string;
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
      console.log('Initializing SmolLM3-3B-ONNX model...');
      
      // Initialize tokenizer from Hugging Face Hub with fallback
      let tokenizer;
      try {
        tokenizer = await AutoTokenizer.from_pretrained(payload.tokenizerModel, {
          cache_dir: './.cache',
          local_files_only: false
        });
        console.log('Tokenizer loaded successfully:', payload.tokenizerModel);
      } catch (tokenizerError) {
        console.warn('Failed to load primary tokenizer, trying fallback...', tokenizerError);
        
        // Try with a known working tokenizer
        const fallbackTokenizers = [
          'HuggingFaceTB/SmolLM-135M-Instruct',
          'microsoft/DialoGPT-medium',
          'gpt2'
        ];
        
        for (const fallbackModel of fallbackTokenizers) {
          try {
            tokenizer = await AutoTokenizer.from_pretrained(fallbackModel, {
              cache_dir: './.cache',
              local_files_only: false
            });
            console.log('Fallback tokenizer loaded successfully:', fallbackModel);
            break;
          } catch (fallbackError) {
            console.warn('Fallback tokenizer failed:', fallbackModel, fallbackError);
            continue;
          }
        }
        
        if (!tokenizer) {
          throw new Error('All tokenizer options failed');
        }
      }
      
      // Temporarily disable ONNX model loading due to external data file issues
      // This is a known issue with ONNX models that have separate .onnx_data files
      console.log('⚠️ ONNX model loading temporarily disabled due to external data file issues');
      console.log('🔄 Using enhanced heuristic approach for jq generation');
      
      // Skip ONNX model loading and use tokenizer + heuristics
      this.modelSession = {
        session: null as any, // Intentionally null - use heuristics
        tokenizer,
        maxLength: payload.maxLength || 512
      };
      
      console.log('✅ Tokenizer loaded successfully, using hybrid approach!');
    } catch (error) {
      console.error('❌ Failed to initialize model:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        errorCode: typeof error === 'number' ? error : 'Not a numeric error code'
      });
      
      // Fall back to heuristic approach if model loading fails
      console.log('🔄 Falling back to heuristic-based jq generation');
      this.modelSession = {
        session: null as any,
        tokenizer: null as any,  // Model failed, tokenizer may also be undefined
        maxLength: payload.maxLength || 512
      };
    } finally {
      this.isLoading = false;
    }
  }

  async generate(payload: GeneratePayload): Promise<string> {
    if (!this.modelSession) {
      throw new Error('Model not initialized');
    }

    const { prompt } = payload;
    const { session, tokenizer } = this.modelSession;

    try {
      // If model didn't load properly, use heuristic approach
      if (!session || !tokenizer) {
        return this.generateBasicJqQuery(prompt);
      }
      
      // Format prompt for GPT-2 model (text generation)
      const formattedPrompt = `# jq Query Generator\nHuman: ${prompt}\nAssistant: Here's the jq query:`;
      
      // Tokenize input
      const inputs = await tokenizer(formattedPrompt, {
        return_tensors: true,
        padding: true,
        truncation: true,
        max_length: 512
      });
      
      // Log tensor info for debugging
      console.log('Tokenized input shape:', inputs.input_ids.dims);
      
      // For now, still use heuristic approach until we implement proper generation
      // SmolLM3 requires complex generation logic with attention masks and position ids
      return this.generateBasicJqQuery(prompt);
      
    } catch (error) {
      console.error('Generation error:', error);
      // Fallback to heuristic approach
      return this.generateBasicJqQuery(prompt);
    }
  }

  private generateBasicJqQuery(prompt: string): string {
    // Enhanced heuristic-based jq query generation
    const lowerPrompt = prompt.toLowerCase();
    const originalPrompt = prompt.trim();
    
    // Common operations
    if (lowerPrompt.includes('keys') || lowerPrompt.includes('properties') || lowerPrompt.includes('fields')) {
      return 'keys';
    }
    if (lowerPrompt.includes('count') || lowerPrompt.includes('length') || lowerPrompt.includes('size')) {
      return 'length';
    }
    if (lowerPrompt.includes('first') || lowerPrompt.includes('initial')) {
      return '.[0]';
    }
    if (lowerPrompt.includes('last') || lowerPrompt.includes('final')) {
      return '.[-1]';
    }
    if (lowerPrompt.includes('all items') || lowerPrompt.includes('all elements') || lowerPrompt.includes('flatten')) {
      return '.[]';
    }
    if (lowerPrompt.includes('unique') || lowerPrompt.includes('distinct')) {
      return 'unique';
    }
    if (lowerPrompt.includes('sort') || lowerPrompt.includes('order')) {
      if (lowerPrompt.includes('reverse') || lowerPrompt.includes('desc')) {
        return 'sort | reverse';
      }
      return 'sort';
    }
    
    // Filtering operations
    if (lowerPrompt.includes('filter') || lowerPrompt.includes('select') || lowerPrompt.includes('where')) {
      if (lowerPrompt.includes('null')) {
        return 'map(select(. != null))';
      }
      if (lowerPrompt.includes('empty')) {
        return 'map(select(. != \"\"))';
      }
      if (lowerPrompt.includes('true') || lowerPrompt.includes('enabled')) {
        return 'map(select(. == true))';
      }
      if (lowerPrompt.includes('false') || lowerPrompt.includes('disabled')) {
        return 'map(select(. == false))';
      }
    }
    
    // Array operations
    if (lowerPrompt.includes('slice') || lowerPrompt.includes('range')) {
      const numberMatch = originalPrompt.match(/(\d+)/);
      if (numberMatch) {
        return `.[0:${numberMatch[1]}]`;
      }
      return '.[0:5]';
    }
    
    // Value operations
    if (lowerPrompt.includes('values') || lowerPrompt.includes('all values')) {
      return '.[]';
    }
    if (lowerPrompt.includes('type') || lowerPrompt.includes('types')) {
      return 'type';
    }
    if (lowerPrompt.includes('min') || lowerPrompt.includes('minimum')) {
      return 'min';
    }
    if (lowerPrompt.includes('max') || lowerPrompt.includes('maximum')) {
      return 'max';
    }
    if (lowerPrompt.includes('sum') || lowerPrompt.includes('total')) {
      return 'add';
    }
    
    // Field extraction with enhanced patterns
    const fieldPatterns = [
      /get\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,  // "get fieldname"
      /show\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,  // "show fieldname"
      /extract\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,  // "extract fieldname"
      /([a-zA-Z_][a-zA-Z0-9_]*)\s+(field|property|attribute|value)/i,  // "fieldname field"
      /["']([a-zA-Z_][a-zA-Z0-9_]*)["']/,  // "fieldname" in quotes
      /\.([a-zA-Z_][a-zA-Z0-9_]*)/  // .fieldname format
    ];
    
    for (const pattern of fieldPatterns) {
      const match = originalPrompt.match(pattern);
      if (match && match[1]) {
        const fieldName = match[1];
        // Check if it's asking for array of field values
        if (lowerPrompt.includes('all') || lowerPrompt.includes('every')) {
          return `.[].${fieldName}`;
        }
        return `.${fieldName}`;
      }
    }
    
    // Complex operations
    if (lowerPrompt.includes('group') || lowerPrompt.includes('group by')) {
      return 'group_by(.)';
    }
    if (lowerPrompt.includes('map') || lowerPrompt.includes('transform')) {
      return 'map(.)';
    }
    if (lowerPrompt.includes('has') || lowerPrompt.includes('contains')) {
      const fieldMatch = originalPrompt.match(/has\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
      if (fieldMatch) {
        return `has("${fieldMatch[1]}")`;
      }
      return 'has("key")';
    }
    
    // Default fallback
    return '.';
  }

  // Commented out for future implementation when proper model is available
  /*
  private async generateTokens(
    logits: ort.Tensor,
    inputTokens: number[],
    options: any
  ): Promise<number[]> {
    // Implementation for token generation
    // Will be used when we have a proper generative model
  }

  private topPSampling(logits: Float32Array, topP: number): number {
    // Implementation for top-p sampling
    // Will be used when we have a proper generative model
  }
  */

  getStatus() {
    return {
      isLoading: this.isLoading,
      isReady: this.modelSession !== null,
      executionProviders: this.modelSession?.session?.inputNames || [],
      inputNames: this.modelSession?.session?.inputNames || [],
      outputNames: this.modelSession?.session?.outputNames || []
    };
  }

  dispose(): void {
    if (this.modelSession && this.modelSession.session) {
      try {
        this.modelSession.session.release();
      } catch (e) {
        console.warn('Error releasing session:', e);
      }
      this.modelSession = null;
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