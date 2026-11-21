import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export interface OptOutStore {
  register(tokenHash: string, recipientHash: string): Promise<void>;
  recipientFor(tokenHash: string): Promise<string | undefined>;
  blocked(recipientHash: string): Promise<boolean>;
  suppress(recipientHash: string): Promise<void>;
}

export type Request = { rawPath?: string; body?: string; isBase64Encoded?: boolean;
  headers?: Record<string, string | undefined>; requestContext?: { http?: { method?: string } } };
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const digestPattern = /^[a-f0-9]{64}$/;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function createHandler(store: OptOutStore, secret: () => Promise<string>) {
  return async (event: Request) => {
    const reply = (statusCode: number, body: unknown) => ({ statusCode,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }, body: JSON.stringify(body) });
    if (event.requestContext?.http?.method !== 'POST') return reply(405, { error: 'Use the confirmation form to stop outreach.' });
    const origin = event.headers?.origin;
    if (origin && !['https://siliciumveritas.com', 'https://www.siliciumveritas.com'].includes(origin)) return reply(403, { error: 'Origin not allowed.' });
    const route = event.rawPath;
    if (!['/register', '/check', '/suppress', '/unsubscribe'].includes(route ?? '')) return reply(404, { error: 'Not found.' });
    try {
      if (route !== '/unsubscribe') {
        if (origin) return reply(403, { error: 'Operator access only.' });
        const supplied = Buffer.from(event.headers?.authorization ?? '');
        const expected = Buffer.from(`Bearer ${await secret()}`);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return reply(401, { error: 'Operator access required.' });
      }
      const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : event.body ?? '';
      if (Buffer.byteLength(raw) > 2048) return reply(413, { error: 'Request too large.' });
      let body: Record<string, unknown>;
      try { body = JSON.parse(raw); } catch { return reply(400, { error: 'Invalid request.' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: 'Invalid request.' });
      if (route === '/unsubscribe') {
        if (Object.keys(body).some(key => key !== 'token') || typeof body.token !== 'string' || !tokenPattern.test(body.token)) return reply(400, { error: 'This link is invalid. Please reply to the original email instead.' });
        const recipientHash = await store.recipientFor(hash(body.token));
        if (!recipientHash) return reply(404, { error: 'This link is invalid. Please reply to the original email instead.' });
        await store.suppress(recipientHash);
        return reply(200, { unsubscribed: true });
      }
      if (Object.keys(body).some(key => !['recipientHash', 'token'].includes(key)) || typeof body.recipientHash !== 'string' || !digestPattern.test(body.recipientHash)) return reply(400, { error: 'Invalid recipient reference.' });
      if (route === '/suppress') {
        await store.suppress(body.recipientHash);
        return reply(200, { suppressed: true });
      }
      const suppressed = await store.blocked(body.recipientHash);
      if (route === '/register') {
        if (suppressed) return reply(409, { error: 'Recipient has opted out.' });
        const token = randomBytes(32).toString('base64url');
        await store.register(hash(token), body.recipientHash);
        return reply(200, { token });
      }
      const validToken = typeof body.token === 'string' && tokenPattern.test(body.token);
      const linkValid = !!validToken && await store.recipientFor(hash(body.token as string)) === body.recipientHash;
      return reply(200, { suppressed, linkValid });
    } catch {
      // Do not log tokens, request bodies, secrets or AWS responses.
      return reply(503, { error: 'The service is temporarily unavailable. Please try again or reply to the original email.' });
    }
  };
}
