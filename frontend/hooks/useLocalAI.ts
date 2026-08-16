'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../services/api';

export interface LocalAIOptions {
  systemPrompt?: string;
  onToken?: (text: string) => void;
  onComplete?: (text: string) => void;
  onError?: (error: string) => void;
}

export function useLocalAI(options: LocalAIOptions = {}) {
  const [isReady, setIsReady] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (prompt: string, systemPrompt?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}` : prompt;
        
        const { data } = await api.post('/bot/ask', {
          question: fullPrompt,
        });

        const answer = data?.answer || 'No response from copilot.';
        options.onToken?.(answer);
        setIsLoading(false);
        setIsReady(true);
        options.onComplete?.(answer);
      } catch (err: any) {
        const message = err?.message || 'Failed to reach copilot service.';
        setError(message);
        setIsLoading(false);
        options.onError?.(message);
      }
    },
    [options]
  );

  return {
    generate,
    isReady,
    isLoading,
    error,
  };
}
