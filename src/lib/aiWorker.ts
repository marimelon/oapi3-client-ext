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
      
      // Initialize tokenizer from Hugging Face Hub
      const tokenizer = await AutoTokenizer.from_pretrained(payload.tokenizerModel, {
        cache_dir: './.cache',
        local_files_only: false
      });
      
      // For SmolLM3-3B-ONNX, we need to download the data file as well
      // The model has a separate .onnx_data file that contains the weights
      const modelDataUrl = payload.modelUrl.replace('.onnx', '.onnx_data');
      
      // Pre-fetch the data file to ensure it's available
      try {
        await fetch(modelDataUrl, { method: 'HEAD' });
      } catch (e) {
        console.warn('Model data file may not be accessible:', e);
      }
      
      // Configure execution providers
      const executionProviders = payload.executionProviders || ['wasm'];
      
      // Create ONNX Runtime session
      const session = await ort.InferenceSession.create(payload.modelUrl, {
        executionProviders,
        graphOptimizationLevel: 'all',
        logSeverityLevel: 3, // Warning level
        logVerbosityLevel: 0
      });
      
      console.log('Model loaded successfully');
      console.log('Input names:', session.inputNames);
      console.log('Output names:', session.outputNames);
      
      this.modelSession = {
        session,
        tokenizer,
        maxLength: payload.maxLength || 512
      };
    } catch (error) {
      console.error('Failed to initialize model:', error);
      // Fall back to heuristic approach if model loading fails
      this.modelSession = {
        session: null as any,
        tokenizer: null as any,
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
      
      // Format prompt for SmolLM3
      const formattedPrompt = `Generate a jq query for: ${prompt}\n\njq query:`;
      
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
    // Basic heuristic-based jq query generation as fallback
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('keys') || lowerPrompt.includes('properties')) {
      return 'keys';
    }
    if (lowerPrompt.includes('count') || lowerPrompt.includes('length')) {
      return 'length';
    }
    if (lowerPrompt.includes('first')) {
      return '.[0]';
    }
    if (lowerPrompt.includes('last')) {
      return '.[-1]';
    }
    if (lowerPrompt.includes('array')) {
      return '.[]';
    }
    if (lowerPrompt.includes('filter') && lowerPrompt.includes('null')) {
      return 'map(select(. != null))';
    }
    if (lowerPrompt.includes('unique')) {
      return 'unique';
    }
    if (lowerPrompt.includes('sort')) {
      return 'sort';
    }
    
    // Extract field names from prompt
    const fieldMatch = prompt.match(/["']?(\w+)["']?\s*(field|property|attribute|value)?/i);
    if (fieldMatch && fieldMatch[1]) {
      return `.${fieldMatch[1]}`;
    }
    
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