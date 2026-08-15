import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

let generator: any = null;

async function getGenerator() {
  if (!generator) {
    generator = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat', {
      device: 'webgpu',
    });
  }
  return generator;
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { prompt, systemPrompt } = event.data;
  try {
    const pipe = await getGenerator();
    const messages = [
      { role: 'system', content: systemPrompt || 'You are a tactical running copilot.' },
      { role: 'user', content: prompt },
    ];

    const output = await pipe(messages, {
      max_new_tokens: 120,
      temperature: 0.7,
      do_sample: true,
      callback_function: (beams: any) => {
        const tokenText = beams[0].text;
        self.postMessage({ type: 'token', text: tokenText });
      },
    });

    self.postMessage({ type: 'complete', text: output[0].generated_text });
  } catch (err: any) {
    self.postMessage({ type: 'error', error: err.message });
  }
});
