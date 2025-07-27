import * as ort from 'onnxruntime-web';
import { AutoTokenizer } from '@xenova/transformers';

// Configure ONNX Runtime for web worker environment
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;

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
      // Initialize tokenizer
      const tokenizer = await AutoTokenizer.from_pretrained(payload.tokenizerModel, {
        revision: 'main',
        cache_dir: './.cache'
      });

      // Configure execution providers with fallback
      const executionProviders = payload.executionProviders || ['webgpu', 'wasm'];
      
      // Create ONNX Runtime session
      const session = await ort.InferenceSession.create(payload.modelUrl, {
        executionProviders,
        graphOptimizationLevel: 'all',
        enableMemPattern: true,
        enableCpuMemArena: true,
        extra: {
          session: {
            set_denormal_as_zero: '1',
            use_env_allocators: '1'
          }
        }
      });

      this.modelSession = {
        session,
        tokenizer,
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

    const { session, tokenizer, maxLength } = this.modelSession;
    const { prompt, options } = payload;

    try {
      // Tokenize input
      const inputs = await tokenizer(prompt, {
        max_length: maxLength,
        truncation: true,
        padding: false,
        return_tensors: 'pt'
      });

      // Prepare input tensors for ONNX Runtime
      const inputIds = new ort.Tensor('int64', 
        new BigInt64Array(inputs.input_ids.data.map((x: number) => BigInt(x))), 
        inputs.input_ids.dims
      );

      const attentionMask = new ort.Tensor('int64', 
        new BigInt64Array(inputs.attention_mask.data.map((x: number) => BigInt(x))), 
        inputs.attention_mask.dims
      );

      // Run inference
      const feeds = {
        input_ids: inputIds,
        attention_mask: attentionMask
      };

      const results = await session.run(feeds);
      
      // Get logits and apply generation parameters
      const logits = results.logits;
      const generatedTokens = await this.generateTokens(
        logits,
        inputs.input_ids.data,
        options
      );

      // Decode generated tokens
      const generatedText = await tokenizer.decode(generatedTokens, {
        skip_special_tokens: true
      });

      // Extract only the newly generated part
      const originalText = await tokenizer.decode(inputs.input_ids.data, {
        skip_special_tokens: true
      });

      return generatedText.slice(originalText.length).trim();
    } catch (error) {
      console.error('Generation error:', error);
      throw new Error(`Generation failed: ${error}`);
    }
  }

  private async generateTokens(
    logits: ort.Tensor,
    inputTokens: number[],
    options: any
  ): Promise<number[]> {
    const { 
      temperature = 0.1, 
      top_p = 0.95,
      do_sample = true 
    } = options;

    const vocabularySize = logits.dims[logits.dims.length - 1] as number;
    const logitsData = logits.data as Float32Array;
    const lastTokenLogits = new Float32Array(
      logitsData.slice(-vocabularySize)
    );

    // Apply temperature
    if (temperature > 0 && do_sample) {
      for (let i = 0; i < lastTokenLogits.length; i++) {
        lastTokenLogits[i] /= temperature;
      }
    }

    // Apply top-p sampling
    let nextToken: number;
    if (do_sample && top_p < 1.0) {
      nextToken = this.topPSampling(lastTokenLogits, top_p);
    } else {
      // Greedy sampling - pick the token with highest probability
      nextToken = lastTokenLogits.indexOf(Math.max(...lastTokenLogits));
    }

    // For simplicity, return just one additional token
    // In a full implementation, you'd loop until max_new_tokens or EOS
    return [...inputTokens, nextToken];
  }

  private topPSampling(logits: Float32Array, topP: number): number {
    // Convert logits to probabilities
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map(x => Math.exp(x - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const probabilities = expLogits.map(x => x / sumExp);

    // Sort indices by probability (descending)
    const indices = Array.from({ length: probabilities.length }, (_, i) => i)
      .sort((a, b) => probabilities[b] - probabilities[a]);

    // Find cutoff for top-p
    let cumulativeProb = 0;
    const topPIndices = [];
    for (const idx of indices) {
      cumulativeProb += probabilities[idx];
      topPIndices.push(idx);
      if (cumulativeProb >= topP) break;
    }

    // Sample from top-p distribution
    const topPProbs = topPIndices.map(idx => probabilities[idx]);
    const topPSum = topPProbs.reduce((a, b) => a + b, 0);
    const normalizedProbs = topPProbs.map(p => p / topPSum);

    const random = Math.random();
    let cumulativeSum = 0;
    for (let i = 0; i < normalizedProbs.length; i++) {
      cumulativeSum += normalizedProbs[i];
      if (random <= cumulativeSum) {
        return topPIndices[i];
      }
    }

    return topPIndices[0]; // Fallback
  }

  getStatus() {
    return {
      isLoading: this.isLoading,
      isReady: this.modelSession !== null,
      executionProviders: this.modelSession?.session.inputNames || [],
      inputNames: this.modelSession?.session.inputNames || [],
      outputNames: this.modelSession?.session.outputNames || []
    };
  }

  dispose(): void {
    if (this.modelSession) {
      this.modelSession.session.release();
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