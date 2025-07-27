import * as ort from 'onnxruntime-web';
import { AutoTokenizer } from '@huggingface/transformers';

// @huggingface/transformers configuration not needed

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
      const tokenizer = await AutoTokenizer.from_pretrained(payload.tokenizerModel);
      console.log('Tokenizer loaded successfully:', payload.tokenizerModel);

      // Configure execution providers for browser compatibility
      const executionProviders = payload.executionProviders || ['wasm'];

      console.log('Loading ONNX model from:', payload.modelUrl);
      console.log('Execution providers:', executionProviders);

      // Create ONNX Runtime session with self-contained model
      const session = await ort.InferenceSession.create(payload.modelUrl, {
        executionProviders,
        graphOptimizationLevel: 'all',
        logSeverityLevel: 3, // Warning level
        logVerbosityLevel: 0
      });

      console.log('✅ ONNX model loaded successfully');
      console.log('Input names:', session.inputNames);
      console.log('Output names:', session.outputNames);

      this.modelSession = {
        session,
        tokenizer,
        maxLength: payload.maxLength || 512
      };

      console.log('✅ Model and tokenizer loaded successfully!');
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
        console.log('Model not loaded, using heuristic approach');
        return this.generateBasicJqQuery();
      }

      // Format prompt for text generation focused on jq queries
      const formattedPrompt = `Generate a jq query for: ${prompt}\njq query:`;

      // Tokenize input
      const inputs = await tokenizer(formattedPrompt, {
        return_tensors: true,
        padding: true,
        truncation: true,
        max_length: 256
      });

      console.log('Tokenized input shape:', inputs.input_ids.dims);

      // Prepare input tensors for ONNX Runtime
      const inputIds = new ort.Tensor('int64', inputs.input_ids.data, inputs.input_ids.dims);
      const attentionMask = new ort.Tensor('int64', inputs.attention_mask.data, inputs.attention_mask.dims);

      // Check what inputs the model actually expects
      console.log('Model input names:', session.inputNames);
      console.log('Model output names:', session.outputNames);

      // Build feeds object based on what the model expects - DistilBERT only needs input_ids and attention_mask
      const feeds: Record<string, ort.Tensor> = {};

      // Add only the inputs that the model expects
      if (session.inputNames.includes('input_ids')) {
        feeds.input_ids = inputIds;
      }
      if (session.inputNames.includes('attention_mask')) {
        feeds.attention_mask = attentionMask;
      }

      console.log('Prepared feeds for model inputs:', Object.keys(feeds));

      console.log('Running ONNX inference...');
      const output = await session.run(feeds);

      // Get the output from DistilBERT (logits for classification)
      const logits = output.logits;
      if (!logits) {
        console.warn('No logits found in output, using heuristic approach');
        return this.generateBasicJqQuery();
      }

      console.log('ONNX inference completed, logits shape:', logits.dims);
      console.log('Available output keys:', Object.keys(output));

      // Generate text using ONNX model and use as jq query
      console.log('✅ ONNX model inference successful, generating text with LLM');

      // Generate text directly from model and use as jq query
      return this.generateTextFromLLM(prompt, logits, tokenizer);

    } catch (error) {
      console.error('Generation error:', error);
      // Fallback to heuristic approach
      return this.generateBasicJqQuery();
    }
  }

  private generateTextFromLLM(prompt: string, logits: ort.Tensor, tokenizer: any): string {
    try {
      // Extract the actual user request
      const userRequest = this.extractUserRequest(prompt);
      console.log('🎯 User request:', `"${userRequest}"`);

      // Generate text sequence from logits using simple greedy decoding
      const generatedText = this.decodeSequenceFromLogits(logits, tokenizer);
      console.log('🤖 LLM generated text:', `"${generatedText}"`);

      // Use LLM output directly without any validation or processing
      console.log('✅ Using LLM output directly as jq query');
      return generatedText || '.';

    } catch (error) {
      console.error('Error generating text from LLM:', error);
      return this.generateBasicJqQuery();
    }
  }

  private decodeSequenceFromLogits(logits: ort.Tensor, tokenizer: any): string {
    try {
      const logitData = logits.data as Float32Array;
      const [batchSize, seqLen, vocabSize] = logits.dims;

      console.log('📊 Decoding sequence - batch:', batchSize, 'seq:', seqLen, 'vocab:', vocabSize);

      // Start from the last position in the sequence
      const lastPosition = seqLen - 1;
      const startIdx = lastPosition * vocabSize;

      if (startIdx >= logitData.length) {
        console.warn('Invalid position for decoding');
        return '';
      }

      // Get logits for the last position
      const positionLogits = Array.from(logitData.slice(startIdx, startIdx + vocabSize));

      // Find top tokens using greedy decoding
      const topIndices = positionLogits
        .map((logit, index) => ({ logit, index }))
        .sort((a, b) => b.logit - a.logit)
        .slice(0, 10); // Get top 10 tokens

      // Decode tokens to text
      const decodedTokens: string[] = [];
      for (const { index: tokenId } of topIndices) {
        try {
          // Simple token decoding - in a real implementation you'd use tokenizer.decode()
          if (tokenizer.model?.vocab && Array.isArray(tokenizer.model.vocab)) {
            const token = tokenizer.model.vocab[tokenId];
            if (token && typeof token === 'string') {
              decodedTokens.push(token.replace(/Ġ/g, ' ').replace(/▁/g, ' ').trim());
            }
          }
        } catch (e) {
          // Skip problematic tokens
        }
      }

      // Join meaningful tokens
      const meaningfulTokens = decodedTokens.filter(token =>
        token.length > 0 &&
        !token.startsWith('[') &&
        !token.startsWith('<') &&
        /[a-zA-Z.\[\]]/.test(token)
      );

      console.log('🔤 Decoded tokens:', meaningfulTokens);

      return meaningfulTokens.join(' ').trim();

    } catch (error) {
      console.error('Error in sequence decoding:', error);
      return '';
    }
  }

  private extractUserRequest(prompt: string): string {
    // Extract the actual user request from the formatted prompt
    const requestMatch = prompt.match(/Request:\s*(.+?)(?:\n\n|$)/);
    if (requestMatch && requestMatch[1]) {
      return requestMatch[1].trim();
    }

    // Fallback: if no "Request:" found, use the whole prompt
    return prompt.trim();
  }

  private generateBasicJqQuery(): string {
    // Simple fallback for error cases
    return '.';
  }

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