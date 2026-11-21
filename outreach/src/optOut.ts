import { z } from 'zod';
import { email, type Contact } from './model.ts';
import { hash } from './unsubscribe/handler.ts';

export const optOutConfigSchema = z.object({
  apiUrl: z.url().refine(value => { const u = new URL(value); return u.protocol === 'https:' && u.pathname === '/' && !u.search && !u.hash && !u.username && !u.password; }),
  pageUrl: z.literal('https://siliciumveritas.com/unsubscribe.html'),
  adminKey: z.string().min(32),
}).strict();

export class OptOutClient {
  readonly config: z.infer<typeof optOutConfigSchema>;
  constructor(config: z.infer<typeof optOutConfigSchema>) { this.config = config; }
  async request(route: string, body: unknown) {
    let response: Response;
    try {
      response = await fetch(new URL(route, this.config.apiUrl), { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.adminKey}` }, body: JSON.stringify(body) });
    } catch { throw Error('Unsubscribe service unavailable; sending is blocked. No automatic retry.'); }
    if (!response.ok) throw Error(`Unsubscribe service returned HTTP ${response.status}; sending is blocked. No automatic retry.`);
    try { return await response.json(); }
    catch { throw Error('Invalid unsubscribe service response; sending is blocked.'); }
  }
  token(contact: Contact): string | undefined {
    const matches = contact.body.match(/https:\/\/siliciumveritas\.com\/unsubscribe\.html#token=([A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])/g) ?? [];
    return matches.length === 1 ? matches[0].split('#token=')[1] : undefined;
  }
  async register(contact: Contact) {
    const result = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).parse(await this.request('/register', { recipientHash: hash(email.parse(contact.recipient)) }));
    return `${this.config.pageUrl}#token=${result.token}`;
  }
  async status(contact: Contact) {
    return z.object({ suppressed: z.boolean(), linkValid: z.boolean() }).parse(await this.request('/check', {
      recipientHash: hash(email.parse(contact.recipient)), token: this.token(contact),
    }));
  }
  async suppress(recipient: string) {
    z.object({ suppressed: z.literal(true) }).parse(await this.request('/suppress', { recipientHash: hash(email.parse(recipient)) }));
  }
}
