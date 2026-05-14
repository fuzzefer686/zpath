const DEFAULT_SUPABASE_TIMEOUT_MS = 8000;

function getSupabaseTimeoutMs() {
  const rawValue = process.env.NEXT_PUBLIC_SUPABASE_TIMEOUT_MS;
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_SUPABASE_TIMEOUT_MS;
}

export const fetchWithSupabaseTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const upstreamSignal = init?.signal;
  const timeoutMs = getSupabaseTimeoutMs();
  let didTimeout = false;

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  const abortFromUpstream = () => {
    controller.abort(upstreamSignal?.reason);
  };

  if (upstreamSignal?.aborted) {
    abortFromUpstream();
  } else {
    upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (didTimeout) {
      throw new Error(`Supabase request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
};
