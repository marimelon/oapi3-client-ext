import { pipeline, type TextGenerationPipeline } from '@huggingface/transformers';

interface WorkerMessage {
  type: 'initialize' | 'generate' | 'status';
  id: string;
  payload?: any;
}

interface InitializePayload {
  model: string;
  device?: 'webgpu' | 'auto' | 'gpu' | 'cpu' | 'wasm' | 'cuda' | 'dml' | 'webnn' | 'webnn-npu' | 'webnn-gpu' | 'webnn-cpu';
  dtype?: 'q8' | 'auto' | 'fp32' | 'fp16' | 'int8' | 'uint8' | 'q4' | 'bnb4' | 'q4f16';
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
  private pipeline: TextGenerationPipeline | null = null;
  private isLoading = false;

  async initialize(payload: InitializePayload): Promise<void> {
    if (this.pipeline) return;
    if (this.isLoading) throw new Error('Model is already loading');

    this.isLoading = true;
    
    try {
      // Use any to avoid complex union type issues with transformers.js
      const pipelineCreator = pipeline as any;
      this.pipeline = await pipelineCreator('text-generation', payload.model, { 
        device: payload.device || 'webgpu',
        dtype: payload.dtype || 'q8'
      });
    } finally {
      this.isLoading = false;
    }
  }

  async generate(payload: GeneratePayload): Promise<string> {
    if (!this.pipeline) {
      throw new Error('Model not initialized');
    }

    const result = await this.pipeline(payload.prompt, payload.options);
    
    // Handle different response formats from transformers.js
    if (Array.isArray(result)) {
      return (result[0] as any)?.generated_text || '';
    }
    
    // Handle single response format
    if (typeof result === 'object' && result && 'generated_text' in result) {
      return (result as any).generated_text || '';
    }
    
    return '';
  }

  getStatus() {
    return {
      isLoading: this.isLoading,
      isReady: this.pipeline !== null
    };
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