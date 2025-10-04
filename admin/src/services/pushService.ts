/*
  Admin Push Service (Free Tier compliant)
  - Sends push notifications directly to Expo Push API from the admin client.
  - No Cloud Functions, Cloud Run, or server-side relay is used.
*/

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  // Android specific: notification channel to use (must exist on device)
  channelId?: string;
}

interface ExpoPushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

function isValidExpoToken(token: string): boolean {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}

const ENV: any = (import.meta as any)?.env || {};
const FORCE_PROXY = String(ENV?.VITE_USE_EXPO_PROXY || '').toLowerCase() === 'true';
const CUSTOM_BASE: string | undefined = ENV?.VITE_EXPO_PUSH_BASE;

function shouldUseDevProxy(): boolean {
  if (FORCE_PROXY) return true;
  // Prefer Vite's DEV flag, but also guard for preview/custom hosts
  const isViteDev = Boolean(ENV?.DEV);
  if (isViteDev) return true;
  if (typeof window === 'undefined') return false;
  const { hostname, port, protocol } = window.location;
  // Common local/private network scenarios
  const privateLan = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
  if (privateLan) return true;
  if (port === '5173') return true; // default Vite port
  if (protocol === 'http:') return true; // permissive for local http
  return false;
}

const EXPO_PUSH_URL = CUSTOM_BASE
  ? `${CUSTOM_BASE.replace(/\/$/, '')}/send`
  : (shouldUseDevProxy() ? '/expo-push/send' : 'https://exp.host/--/api/v2/push/send');

async function postToExpo(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const resp = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    // Helpful note for local dev when proxy is missing
    if (typeof window !== 'undefined' && (window as any).location && shouldUseDevProxy()) {
      throw new Error(`Expo push request failed: ${resp.status} ${resp.statusText}. If CORS error, ensure Vite proxy is configured in vite.config.ts and dev server restarted. You can force proxy via VITE_USE_EXPO_PROXY=true. URL used: ${EXPO_PUSH_URL}`);
    }
    throw new Error(`Expo push request failed: ${resp.status} ${resp.statusText} ${text}`);
  }

  const json = await resp.json().catch(() => null) as { data?: ExpoPushTicket[] } | null;
  if (!json || !Array.isArray(json.data)) return [];
  return json.data;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PushService {
  async sendPushNotification(token: string, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    if (!isValidExpoToken(token)) throw new Error('Invalid Expo push token');

    const message: ExpoPushMessage = {
      to: token,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
      channelId: 'assignment',
    };

    const tickets = await postToExpo([message]);
    const t = tickets[0];
    if (!t) return;
    if (t.status === 'error') {
      const code = t.details?.error || 'unknown_error';
      if (code === 'DeviceNotRegistered') {
        // Surface a specific error for UI so we can inform the admin
        throw new Error('Officer device not registered for push (stale token).');
      }
      throw new Error(`Expo push error: ${code}${t.message ? ` - ${t.message}` : ''}`);
    }
  }

  async sendBatch(tokens: string[], title: string, body: string, data?: Record<string, unknown>): Promise<{ ok: string[]; failed: Array<{ token: string; error: string }> }> {
    const ok: string[] = [];
    const failed: Array<{ token: string; error: string }> = [];

    const valid = tokens.filter(isValidExpoToken);
    const chunks: string[][] = [];
    for (let i = 0; i < valid.length; i += 99) chunks.push(valid.slice(i, i + 99));

    for (const chunk of chunks) {
      const msgs: ExpoPushMessage[] = chunk.map((to) => ({ to, title, body, data, sound: 'default', priority: 'high', channelId: 'assignment' }));
      try {
        const tickets = await postToExpo(msgs);
        tickets.forEach((t, idx) => {
          const tok = chunk[idx];
          if (t?.status === 'ok') ok.push(tok);
          else failed.push({ token: tok, error: t?.details?.error || t?.message || 'unknown_error' });
        });
      } catch (e: any) {
        // Network or 5xx — retry once after brief backoff
        await sleep(500);
        try {
          const tickets = await postToExpo(msgs);
          tickets.forEach((t, idx) => {
            const tok = chunk[idx];
            if (t?.status === 'ok') ok.push(tok);
            else failed.push({ token: tok, error: t?.details?.error || t?.message || 'unknown_error' });
          });
        } catch (err: any) {
          chunk.forEach((tok) => failed.push({ token: tok, error: err?.message || 'network_error' }));
        }
      }
      // Tiny delay between chunks to be respectful of rate limits
      await sleep(150);
    }

    return { ok, failed };
  }
}

export const pushService = new PushService();
