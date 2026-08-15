'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface LocalAIOptions {
  systemPrompt?: string;
  onToken?: (text: string) => void;
  onComplete?: (text: string) => void;
  onError?: (error: string) => void;
}

export function useLocalAI(options: LocalAIOptions = {}) {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initWorker = async () => {
      try {
        const worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), {
          type: 'module',
        });

        worker.onmessage = (event) => {
          const { type, text, error } = event.data;
          switch (type) {
            case 'token':
              options.onToken?.(text);
              break;
            case 'complete':
              setIsLoading(false);
              setIsReady(true);
              options.onComplete?.(text);
              break;
            case 'error':
              setError(error);
              setIsLoading(false);
              options.onError?.(error);
              break;
          }
        };

        worker.onerror = (err) => {
          setError(err.message);
          setIsLoading(false);
          options.onError?.(err.message);
        };

        workerRef.current = worker;
      } catch (err: any) {
        setError(err.message);
        options.onError?.(err.message);
      }
    };

    initWorker();

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const generate = useCallback(
    (prompt: string, systemPrompt?: string) => {
      if (!workerRef.current) {
        setError('AI worker not initialized');
        return;
      }

      setIsLoading(true);
      setError(null);

      workerRef.current.postMessage({
        prompt,
        systemPrompt: systemPrompt || options.systemPrompt,
      });
    },
    [options.systemPrompt]
  );

  return {
    generate,
    isReady,
    isLoading,
    error,
  };
}
