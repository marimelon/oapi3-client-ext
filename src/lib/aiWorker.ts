import { pipeline, env, SmolLM3ForCausalLM } from '@huggingface/transformers';
import {
  LogitsProcessorList,
  TemperatureLogitsWarper,
  TopKLogitsWarper,
  TopPLogitsWarper,
  RepetitionPenaltyLogitsProcessor,
  NoRepeatNGramLogitsProcessor,
  MinLengthLogitsProcessor,
  ForcedBOSTokenLogitsProcessor,
  ForcedEOSTokenLogitsProcessor,
} from '@huggingface/transformers';
import * as ort from 'onnxruntime-web';

// @huggingface/transformers configuration not needed

// Configure ONNX Runtime for web worker environment
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;

// Set WASM paths explicitly for web worker context
// Use CDN for WASM files to avoid Vite bundling issues
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';

// Disable remote model loading for security
ort.env.logLevel = 'warning';


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
  session: ort.InferenceSession;
}

interface GeneratePayload {
  prompt: string | Array<{ role: string, content: string }>;
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

      // env.allowLocalModels = true;
      // env.localModelPath = 'http://127.0.0.1:8080';
      // env.remoteHost = 'http://127.0.0.1:8080';

      const textGenerator = await pipeline('text-generation', "HuggingFaceTB/SmolLM3-3B-ONNX", {
        device: 'webgpu',
        dtype: 'q4f16',
        use_external_data_format: true
      });

      const session = await ort.InferenceSession.create("https://huggingface.co/HuggingFaceTB/SmolLM3-3B-ONNX/resolve/main/onnx/model_q4f16.onnx", {
        // executionProviders: ['cpu'],
        // graphOptimizationLevel: 'all',
        // logSeverityLevel: 3, // Warning level
        // logVerbosityLevel: 0,
        externalData: [
          {
            path: "./model_q4f16.onnx_data",
            data: "https://huggingface.co/HuggingFaceTB/SmolLM3-3B-ONNX/resolve/main/onnx/model_q4f16.onnx_data" as any
          }
        ]
      });

      console.log('✅ Pipeline created successfully');

      this.modelSession = {
        pipeline: textGenerator,
        maxLength: payload.maxLength || 512,
        session: session
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
    const { pipeline, session } = this.modelSession;

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


      const model = new SmolLM3ForCausalLM({ is_encoder_decoder: false }, session, pipeline.tokenizer);
      const res = await model.generate({
        ...formattedTemplate,
        max_length: 100,
        temperature: 0.8,
        do_sample: true,
        top_k: 50,
        top_p: 0.95,
        repetition_penalty: 1.2,
        no_repeat_ngram_size: 3,
      });

      console.log('🔍 Generated text:', res);

      const generator = new TextGeneratorWithLogitsProcessor(
        session,
        pipeline.tokenizer,
        {
          max_length: 100,
          temperature: 0.8,
          do_sample: true,
          top_k: 50,
          top_p: 0.95,
          repetition_penalty: 1.2,
          no_repeat_ngram_size: 3,
          min_length: 10
        }
      );

      // 初期入力
      const input_text = "The future of AI is";
      const inputs2 = pipeline.tokenizer(input_text, {
        return_tensors: true,
        padding: true,
        truncation: true
      });

      // テキスト生成
      const generated_text = await generator.generate({
        input_ids: inputs2.input_ids,
        attention_mask: inputs2.attention_mask
      });

      console.log("Generated:", generated_text);

      return generated_text;

      // --- ここから ORT のコード ---

      const inputs = await pipeline.tokenizer(formattedTemplate, {
        return_tensors: true,
        padding: true,
        truncation: true,
        max_length: 256,
      });

      console.log('Inputs:', inputs);

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

      console.log('Prepared feeds for model:', feeds);

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
          const emptyTensor = new ort.Tensor('float16', (new Float16Array(0)) as any, [batchSize, numHeads, pastSeqLen, headDim]);
          feeds[inputName] = emptyTensor;
        }
      }

      console.log('Prepared feeds for model inputs:', Object.keys(feeds));

      console.log('Running ONNX inference...');
      const output = await session.run(feeds);

      console.log('ONNX inference completed');
      console.log('Output:', output);

      const decoded = pipeline.tokenizer.decode(output.logits);
      console.log('Decoded:', decoded);


      // --- ここまで ORT のコード ---

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



class TextGeneratorWithLogitsProcessor {
  constructor(session, tokenizer, generation_config = {}) {
    this.session = session;
    this.tokenizer = tokenizer;
    this.generation_config = {
      max_length: 50,
      temperature: 1.0,
      do_sample: false,
      top_k: 50,
      top_p: 1.0,
      repetition_penalty: 1.0,
      no_repeat_ngram_size: 0,
      min_length: 0,
      eos_token_id: this.tokenizer.eos_token_id,
      pad_token_id: this.tokenizer.pad_token_id,
      bos_token_id: this.tokenizer.bos_token_id,
      ...generation_config
    };
  }

  /**
   * LogitsProcessorListを作成
   */
  getLogitsProcessor() {
    const processors = [];

    // 温度適用
    if (this.generation_config.temperature &&
      this.generation_config.temperature !== 1.0) {
      processors.push(new
        TemperatureLogitsWarper(this.generation_config.temperature));
    }

    // Top-k適用
    if (this.generation_config.top_k && this.generation_config.top_k
      > 0) {
      processors.push(new
        TopKLogitsWarper(this.generation_config.top_k));
    }

    // Top-p適用
    if (this.generation_config.top_p && this.generation_config.top_p
      < 1.0) {
      processors.push(new
        TopPLogitsWarper(this.generation_config.top_p));
    }

    // 繰り返しペナルティ
    if (this.generation_config.repetition_penalty &&
      this.generation_config.repetition_penalty !== 1.0) {
      processors.push(new RepetitionPenaltyLogitsProcessor(this.generation_config.repetition_penalty));
    }

    // N-gram繰り返し防止
    if (this.generation_config.no_repeat_ngram_size &&
      this.generation_config.no_repeat_ngram_size > 0) {
      processors.push(new NoRepeatNGramLogitsProcessor(this.generation_config.no_repeat_ngram_size));
    }

    // 最小長
    if (this.generation_config.min_length &&
      this.generation_config.min_length > 0) {
      processors.push(new MinLengthLogitsProcessor(
        this.generation_config.min_length,
        this.generation_config.eos_token_id
      ));
    }

    return new LogitsProcessorList(...processors);
  }

  /**
   * ONNXセッションの出力からテキストを生成
   */
  async generate(initial_feeds, options = {}) {
    // generation_configを更新
    const config = { ...this.generation_config, ...options };

    // LogitsProcessorを準備
    const logitsProcessor = this.getLogitsProcessor();

    // 入力の準備
    let feeds = { ...initial_feeds };
    let input_ids = Array.isArray(feeds.input_ids.data)
      ? feeds.input_ids.data.map(id => Number(id))
      : Array.from(feeds.input_ids.data).map(id => Number(id));

    const all_input_ids = [[...input_ids]];

    // 生成ループ
    for (let step = 0; step < config.max_length - input_ids.length;
      step++) {
      // モデル実行
      const output = await this.session.run(feeds);

      // logitsを取得
      const logits_output = output.logits || output.output;
      const vocab_size =
        logits_output.dims[logits_output.dims.length - 1];
      const seq_length = logits_output.dims[1];

      // 最後のトークンのlogitsをTensorとして作成
      const last_token_logits_data = new Float32Array(vocab_size);
      const offset = (seq_length - 1) * vocab_size;
      for (let i = 0; i < vocab_size; i++) {
        last_token_logits_data[i] = logits_output.data[offset + i];
      }

      const logits = new ort.Tensor(
        'float32',
        last_token_logits_data,
        [1, vocab_size]
      );

      // LogitsProcessorを適用
      const processed_logits = logitsProcessor(all_input_ids,
        logits);

      // トークン選択
      let next_token_id;
      if (config.do_sample) {
        next_token_id = this.sampleFromLogits(processed_logits);
      } else {
        // Greedy
        const logits_array = Array.from(processed_logits.data);
        next_token_id =
          logits_array.indexOf(Math.max(...logits_array));
      }

      // 生成されたトークンを追加
      all_input_ids[0].push(next_token_id);

      // 終了条件チェック
      if (next_token_id === config.eos_token_id) {
        break;
      }

      // 次のステップの入力を準備
      feeds = this.prepareNextInputs(feeds, next_token_id,
        all_input_ids[0].length);
    }

    // デコード
    const generated_text = this.tokenizer.decode(all_input_ids[0], {
      skip_special_tokens: true,
      clean_up_tokenization_spaces: true
    });

    return generated_text;
  }

  /**
   * 処理済みlogitsからサンプリング
   */
  sampleFromLogits(logits) {
    const probs = this.softmax(Array.from(logits.data));

    const random = Math.random();
    let cumsum = 0;
    for (let i = 0; i < probs.length; i++) {
      cumsum += probs[i];
      if (random < cumsum) {
        return i;
      }
    }
    return probs.length - 1;
  }

  /**
   * Softmax関数
   */
  softmax(logits) {
    const max_logit = Math.max(...logits);
    const exp_logits = logits.map(x => Math.exp(x - max_logit));
    const sum_exp = exp_logits.reduce((a, b) => a + b, 0);
    return exp_logits.map(x => x / sum_exp);
  }

  /**
   * 次のステップの入力を準備
   */
  prepareNextInputs(current_feeds, next_token_id, total_length) {
    const new_feeds = {};

    // input_ids
    new_feeds.input_ids = {
      dims: [1, 1],
      type: 'int64',
      data: new BigInt64Array([BigInt(next_token_id)])
    };

    // attention_mask
    if (current_feeds.attention_mask) {
      new_feeds.attention_mask = {
        dims: [1, total_length],
        type: 'int64',
        data: new BigInt64Array(total_length).fill(1n)
      };
    }

    // past_key_valuesがある場合は引き継ぐ
    for (const key in current_feeds) {
      if (key.startsWith('past_key_values') ||
        key.startsWith('present')) {
        new_feeds[key] = current_feeds[key];
      }
    }

    return new_feeds;
  }
}