// Optional bridge to a native GGUF runtime (`llama.rn`).
//
// The default build does NOT include the native runtime, so `require` here throws and
// every function degrades to a clear "no runtime" answer. If a build is ever made with
// `llama.rn` added (`npx expo install llama.rn` + rebuild), this module finds it at
// runtime and the model manager's inference step + free-form generation light up with
// no other code change.

export interface RuntimeProbe {
  available: boolean;
  /** Why it is not available, in plain language, when `available` is false. */
  reason: string;
}

type LlamaModule = {
  initLlama: (opts: { model: string; n_ctx?: number; n_gpu_layers?: number }) => Promise<LlamaContext>;
};
type LlamaContext = {
  completion: (opts: { prompt: string; n_predict?: number; temperature?: number; stop?: string[] }) => Promise<{ text: string }>;
  release: () => Promise<void>;
};

let cached: LlamaModule | null | undefined;

function loadModule(): LlamaModule | null {
  if (cached !== undefined) return cached;
  try {
    // Indirected so bundlers don't hard-require a module that is usually absent.
    const req = (0, eval)('require') as NodeRequire;
    cached = req('llama.rn') as LlamaModule;
  } catch {
    cached = null;
  }
  return cached;
}

export function probeRuntime(): RuntimeProbe {
  const mod = loadModule();
  if (!mod || typeof mod.initLlama !== 'function') {
    return {
      available: false,
      reason: 'অ্যাপের এই সংস্করণে on-device LLM রানটাইম যুক্ত নেই।',
    };
  }
  return { available: true, reason: '' };
}

export interface SmokeResult {
  ok: boolean;
  /** A short sample of generated text on success. */
  sample?: string;
  /** Failure reason on `ok === false`. */
  reason?: string;
  elapsedMs?: number;
}

/** Load the model, generate a few tokens, release. Used by the "Verify" flow. */
export async function smokeTest(modelPath: string, contextLength: number | null): Promise<SmokeResult> {
  const mod = loadModule();
  if (!mod) return { ok: false, reason: probeRuntime().reason };
  const started = Date.now();
  let ctx: LlamaContext | undefined;
  try {
    ctx = await mod.initLlama({
      model: modelPath,
      n_ctx: Math.min(contextLength ?? 2048, 2048),
      n_gpu_layers: 0,
    });
    const out = await ctx.completion({
      prompt: 'Reply with the single word: ready',
      n_predict: 8,
      temperature: 0,
      stop: ['\n'],
    });
    const sample = (out.text ?? '').trim();
    if (!sample) return { ok: false, reason: 'মডেল লোড হয়েছে কিন্তু কোনো টেক্সট তৈরি করেনি।', elapsedMs: Date.now() - started };
    return { ok: true, sample, elapsedMs: Date.now() - started };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `রানটাইম মডেলটি চালাতে পারেনি: ${message}`, elapsedMs: Date.now() - started };
  } finally {
    try { await ctx?.release(); } catch { /* noop */ }
  }
}

let liveCtx: { path: string; ctx: LlamaContext } | null = null;

/** Free-form generation for the pluggable AiEngine. Keeps one context warm per model. */
export async function generateWith(modelPath: string, contextLength: number | null, prompt: string, maxTokens: number): Promise<string> {
  const mod = loadModule();
  if (!mod) throw new Error(probeRuntime().reason);
  if (!liveCtx || liveCtx.path !== modelPath) {
    try { await liveCtx?.ctx.release(); } catch { /* noop */ }
    liveCtx = {
      path: modelPath,
      ctx: await mod.initLlama({ model: modelPath, n_ctx: Math.min(contextLength ?? 4096, 4096), n_gpu_layers: 0 }),
    };
  }
  const out = await liveCtx.ctx.completion({ prompt, n_predict: maxTokens, temperature: 0.4 });
  return (out.text ?? '').trim();
}
