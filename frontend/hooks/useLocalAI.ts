'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
      const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
      if (!apiKey) {
        const err = 'Missing NEXT_PUBLIC_GROQ_API_KEY';
        setError(err);
        options.onError?.(err);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt || 'You are a tactical running copilot.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 120,
            stream: true,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Groq error ${res.status}: ${text}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                options.onToken?.(fullText);
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        setIsLoading(false);
        setIsReady(true);
        options.onComplete?.(fullText);
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
        options.onError?.(err.message);
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
