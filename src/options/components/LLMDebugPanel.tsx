import React, { useState, useEffect } from 'react';
import { AIJqGenerator } from '../../lib/aiJqGenerator';

interface LLMDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LLMDebugPanel: React.FC<LLMDebugPanelProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temperature, setTemperature] = useState(0.1);
  const [maxTokens, setMaxTokens] = useState(100);
  const [isInitializing, setIsInitializing] = useState(false);
  const [modelStatus, setModelStatus] = useState<'not-initialized' | 'loading' | 'ready'>('not-initialized');
  const generator = AIJqGenerator.getInstance();

  // Update model status
  useEffect(() => {
    const updateStatus = () => {
      if (generator.isReady()) {
        setModelStatus('ready');
      } else if (generator.isModelLoading()) {
        setModelStatus('loading');
      } else {
        setModelStatus('not-initialized');
      }
    };

    updateStatus();
    // Check status every second while panel is open
    const interval = isOpen ? setInterval(updateStatus, 1000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, generator]);

  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);
    try {
      await generator.initialize();
      setModelStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize model');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setResponse('');

    try {
      const result = await generator.debugGenerateLLM(prompt, {
        temperature,
        max_new_tokens: maxTokens
      });
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            🐛 LLM Debug Panel
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {/* Controls */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temperature: {temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Tokens: {maxTokens}
              </label>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prompt (Ctrl+Enter to generate)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your prompt here..."
              className="w-full h-32 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              disabled={isGenerating}
            />
          </div>

          {/* Generate/Initialize Button */}
          {modelStatus === 'not-initialized' ? (
            <button
              onClick={handleInitialize}
              disabled={isInitializing}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitializing ? 'Initializing Model...' : 'Initialize Model'}
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || modelStatus !== 'ready'}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : modelStatus === 'loading' ? 'Model Loading...' : 'Generate'}
            </button>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                LLM Response
              </label>
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {response}
                </pre>
              </div>
            </div>
          )}

          {/* Debug Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>Model: HuggingFaceTB/SmolLM3-3B-ONNX (q4f16)</p>
            <p>Status: {
              modelStatus === 'ready' ? '✅ Ready' : 
              modelStatus === 'loading' ? '⏳ Loading...' : 
              '❌ Not initialized'
            }</p>
          </div>
        </div>
      </div>
    </div>
  );
};