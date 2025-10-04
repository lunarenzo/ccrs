export interface RetryOptions {
  retries?: number; // default 2
  baseDelayMs?: number; // default 300
}

export async function retryAsync<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 300;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt); // exponential backoff
      await new Promise((res) => setTimeout(res, delay));
      attempt++;
    }
  }

  throw lastError;
}
