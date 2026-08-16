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
        
        let friendlyMessage = message;
        if (message.includes('image') || message.includes('image.png')) {
          friendlyMessage = 'The AI model is currently unavailable. Please try again in a moment.';
        } else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
          friendlyMessage = 'Request timed out. The copilot is taking too long to respond.';
        } else if (message.includes('Network') || message.includes('ECONNREFUSED')) {
          friendlyMessage = 'Cannot reach the copilot service. Check your connection.';
        } else if (message.includes('401') || message.includes('403')) {
          friendlyMessage = 'Authentication failed. Please log in again.';
        } else if (message.includes('429')) {
          friendlyMessage = 'Too many requests. Please wait a moment before trying again.';
        }
        
        setError(friendlyMessage);
        setIsLoading(false);
        options.onError?.(friendlyMessage);
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
