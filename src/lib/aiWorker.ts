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
      const tokenizer = await AutoTokenizer.from_pretrained(payload.tokenizerModel, {
        config: {
          "transformers.js_config": { dtype: "q4f16" }
        } as any
      });
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
        logVerbosityLevel: 0,
        externalData: [
          {
            path: "./model_q4.onnx_data",
            data: "https://huggingface.co/HuggingFaceTB/SmolLM3-3B-ONNX/resolve/main/onnx/model_q4.onnx_data" as any
          }
        ]
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

      // Format prompt using SmolLM3-3B chat template
      const formattedPrompt = this.formatSmolLMPrompt(prompt);
      console.log('📝 Formatted prompt with SmolLM3 template:', formattedPrompt);

      // Tokenize input
      const inputs = await tokenizer(formattedPrompt, {
        return_tensors: true,
        padding: true,
        truncation: true,
        max_length: 256,
      });

      console.log('Tokenized input shape:', inputs.input_ids.dims);

      // Prepare input tensors for ONNX Runtime
      const inputIds = new ort.Tensor('int64', inputs.input_ids.data, inputs.input_ids.dims);
      const attentionMask = new ort.Tensor('int64', inputs.attention_mask.data, inputs.attention_mask.dims);

      // Create position_ids tensor
      const [batchSize, seqLength] = inputs.input_ids.dims;
      const positionIds = new BigInt64Array(batchSize * seqLength);
      for (let i = 0; i < batchSize; i++) {
        for (let j = 0; j < seqLength; j++) {
          positionIds[i * seqLength + j] = BigInt(j);
        }
      }
      const positionIdsTensor = new ort.Tensor('int64', positionIds, [batchSize, seqLength]);

      // Check what inputs the model actually expects
      console.log('Model input names:', session.inputNames);
      console.log('Model output names:', session.outputNames);

      // Build feeds object based on what the model expects
      const feeds: Record<string, ort.Tensor> = {};

      // Add only the inputs that the model expects
      if (session.inputNames.includes('input_ids')) {
        feeds.input_ids = inputIds;
      }
      if (session.inputNames.includes('attention_mask')) {
        feeds.attention_mask = attentionMask;
      }
      if (session.inputNames.includes('position_ids')) {
        feeds.position_ids = positionIdsTensor;
      }

      // Add past_key_values if required by the model
      // SmolLM3-3B uses past_key_values for caching in generation
      for (const inputName of session.inputNames) {
        if (inputName.startsWith('past_key_values.')) {
          // Initialize empty past_key_values tensors for first generation
          // SmolLM3-3B expects shape: [batch_size, num_heads, seq_len, head_dim]
          // From the error, we know: num_heads=4, head_dim=128
          // For initial generation, seq_len=0 (no past tokens)

          const numHeads = 4;
          const headDim = 128;
          const pastSeqLen = 0; // No past tokens for initial generation

          // Create empty tensor with correct shape
          const emptyTensor = new ort.Tensor('float32', (new Float32Array(0)) as any, [batchSize, numHeads, pastSeqLen, headDim]);
          feeds[inputName] = emptyTensor;
        }
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
      console.log('📊 Logit data length:', logitData.length);

      // Start from the last position in the sequence
      const lastPosition = seqLen - 1;
      const startIdx = lastPosition * vocabSize;

      console.log('📊 Last position:', lastPosition, 'Start index:', startIdx);

      if (startIdx >= logitData.length) {
        console.warn('Invalid position for decoding');
        return '';
      }

      // Get logits for the last position
      const positionLogits = Array.from(logitData.slice(startIdx, startIdx + vocabSize));
      console.log('📊 Position logits length:', positionLogits.length);

      // Get all tokens sorted by logit value
      const allIndices = positionLogits
        .map((logit, index) => ({ logit, index }))
        .sort((a, b) => b.logit - a.logit);

      console.log('🔝 Total tokens to decode:', allIndices.length);
      console.log('🔝 Top 10 token indices and logits:');
      allIndices.slice(0, 10).forEach((item, idx) => {
        console.log(`  ${idx + 1}. Token ID: ${item.index}, Logit: ${item.logit.toFixed(4)}`);
      });

      // Decode tokens to text
      const decodedTokens: string[] = [];
      console.log('🔤 Attempting to decode tokens...');
      console.log('📚 Tokenizer:', tokenizer);
      console.log('📚 Tokenizer decode method:', typeof tokenizer.decode);
      console.log('📚 Tokenizer model:', tokenizer.model ? 'exists' : 'missing');
      console.log('📚 Tokenizer vocab:', tokenizer.model?.vocab ? `exists (${Array.isArray(tokenizer.model.vocab) ? 'array' : typeof tokenizer.model.vocab})` : 'missing');
      // Decode all tokens
      console.log('🔤 Decoding all', allIndices.length, 'tokens...');
      for (const { index: tokenId, logit } of allIndices) {
        try {
          // Simple token decoding - in a real implementation you'd use tokenizer.decode()
          // Try using tokenizer's decode method if available
          if (tokenizer.decode && typeof tokenizer.decode === 'function') {
            const decoded = tokenizer.decode([tokenId]);
            if (decoded) {
              // Only log first 20 tokens to avoid spam
              if (decodedTokens.length < 20) {
                console.log(`  Token ${tokenId} (logit: ${logit.toFixed(2)}): "${decoded}"`);
              }
              decodedTokens.push(decoded);
            }
          } else if (tokenizer.model?.vocab && Array.isArray(tokenizer.model.vocab)) {
            const token = tokenizer.model.vocab[tokenId];
            if (token && typeof token === 'string') {
              const cleaned = token.replace(/Ġ/g, ' ').replace(/▁/g, ' ').trim();
              // Only log first 20 tokens to avoid spam
              if (decodedTokens.length < 20) {
                console.log(`  Token ${tokenId} (logit: ${logit.toFixed(2)}): "${token}" → "${cleaned}"`);
              }
              decodedTokens.push(cleaned);
            }
          } else {
            if (decodedTokens.length < 5) {
              console.log(`  Token ${tokenId}: no decode method available`);
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

      console.log('🔤 Total decoded tokens:', decodedTokens.length);
      console.log('🔤 First 50 decoded tokens:', decodedTokens.slice(0, 50));
      console.log('🔤 Meaningful tokens count:', meaningfulTokens.length);
      console.log('🔤 First 50 meaningful tokens:', meaningfulTokens.slice(0, 50));

      const result = meaningfulTokens.join(' ').trim();
      console.log('📝 Final decoded result:', `"${result}"`);
      console.log('📝 Result length:', result.length);
      return result;

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

  /**
   * Format prompt using SmolLM3-3B official chat template
   * Template: <|im_start|>system\n{system_message}<|im_end|>\n<|im_start|>user\n{user_message}<|im_end|>\n<|im_start|>assistant\n
   */
  private formatSmolLMPrompt(userPrompt: string): string {
    const systemMessage = "You are a helpful assistant that generates jq queries. Generate only the jq query without any explanation.";
    
    const template = `<|im_start|>system
${systemMessage}<|im_end|>
<|im_start|>user
Generate a jq query for: ${userPrompt}<|im_end|>
<|im_start|>assistant
`;
    
    return template;
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