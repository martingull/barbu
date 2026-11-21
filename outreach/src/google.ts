import { OAuth2Client, CodeChallengeMethod, type Credentials } from 'google-auth-library';
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';
import { z } from 'zod';
import { configSchema, headers, type Config, type Contact } from './model.ts';
import { readInputJson, readPrivate, writePrivate, type Attempt } from './store.ts';
import { existsSync } from 'node:fs';
import { OptOutClient, optOutConfigSchema } from './optOut.ts';

export const scopes = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/spreadsheets',
];
const clientSchema = z.object({ installed: z.object({ client_id: z.string().min(1), client_secret: z.string().min(1) }) });
const savedAuth = z.object({ client: z.object({ client_id: z.string(), client_secret: z.string() }), tokens: z.object({ refresh_token: z.string().min(1) }).passthrough() });

export function validCallback(url: URL, expectedState: string): boolean {
  const received = Buffer.from(url.searchParams.get('state') || '');
  const expected = Buffer.from(expectedState);
  return url.pathname === '/oauth2callback' && received.length === expected.length && timingSafeEqual(received, expected);
}

export async function authorize(home: string, clientPath: string, config: Config): Promise<void> {
  const client = clientSchema.parse(readInputJson(clientPath)).installed;
  const state = randomBytes(32).toString('hex');
  const auth = new OAuth2Client(client.client_id, client.client_secret);
  const verifier = await auth.generateCodeVerifierAsync();
  let resolveCode!: (code: string) => void;
  let rejectCode!: (error: Error) => void;
  const codePromise = new Promise<string>((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (!validCallback(url, state)) { res.writeHead(400).end('Invalid callback'); return; }
    const code = url.searchParams.get('code');
    if (!code) { res.writeHead(400).end('Authorization was not completed'); rejectCode(Error('Google authorization was not completed')); return; }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Authorization received. Check the terminal for the verified account. You can close this tab.');
    resolveCode(code);
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Could not start local OAuth callback');
  const redirect = `http://127.0.0.1:${address.port}/oauth2callback`;
  const url = auth.generateAuthUrl({
    redirect_uri: redirect, access_type: 'offline', prompt: 'consent', scope: scopes,
    state, login_hint: config.sender, code_challenge: verifier.codeChallenge, code_challenge_method: CodeChallengeMethod.S256,
  });
  console.log(`Open this Google consent URL in your browser and choose ${config.sender}:\n${url}`);
  const timer = setTimeout(() => rejectCode(Error('Authorization timed out after five minutes')), 300000);
  try {
    const code = await codePromise;
    let tokens: Credentials;
    try { ({ tokens } = await auth.getToken({ code, redirect_uri: redirect, codeVerifier: verifier.codeVerifier })); }
    catch { throw Error('Google authorization failed; check the OAuth client, account and enabled APIs. Consent codes and responses were not logged'); }
    if (!tokens.refresh_token || !scopes.every(scope => tokens.scope?.split(' ').includes(scope))) throw Error('Required permissions or refresh token missing; reconnect and grant the listed scopes');
    auth.setCredentials(tokens);
    const api = new GoogleApi(config, auth);
    await api.identity();
    writePrivate(join(home, 'auth.json'), { client, tokens });
    writePrivate(join(home, 'config.json'), config);
    console.log('Account verified and credentials saved privately. No email sent and no spreadsheet changed.');
  } finally {
    clearTimeout(timer);
    await new Promise<void>(resolve => server.close(() => resolve()));
    server.closeAllConnections();
  }
}

export function connect(home: string): GoogleApi {
  const config = configSchema.parse(readPrivate(join(home, 'config.json')));
  const saved = savedAuth.parse(readPrivate(join(home, 'auth.json')));
  const auth = new OAuth2Client(saved.client.client_id, saved.client.client_secret);
  auth.setCredentials(saved.tokens as Credentials);
  auth.on('tokens', tokens => {
    const refresh = tokens.refresh_token || saved.tokens.refresh_token;
    Object.assign(saved.tokens, tokens, { refresh_token: refresh });
    writePrivate(join(home, 'auth.json'), saved);
  });
  const optOutPath = join(home, 'unsubscribe.json');
  const optOut = existsSync(optOutPath) ? new OptOutClient(optOutConfigSchema.parse(readPrivate(optOutPath))) : undefined;
  return new GoogleApi(config, auth, optOut);
}

export interface Services {
  config: Config;
  identity(): Promise<void>;
  queue(): Promise<string[][]>;
  history(): Promise<string[][]>;
  previousContact(recipient: string): Promise<boolean>;
  send(raw: string): Promise<{ id: string; threadId: string }>;
  record(contact: Contact, attempt: Attempt, status?: string): Promise<void>;
  optOutStatus(contact: Contact): Promise<{ suppressed: boolean; linkValid: boolean }>;
  markOptOut(contact: Contact): Promise<void>;
}

export class GoogleApi implements Services {
  config: Config;
  auth: OAuth2Client;
  readonly optOut?: OptOutClient;
  constructor(config: Config, auth: OAuth2Client, optOut?: OptOutClient) { this.config = config; this.auth = auth; this.optOut = optOut; }

  async optOutStatus(contact: Contact) {
    if (!this.optOut) throw Error('Configure the hosted unsubscribe service before preparing or sending invitations.');
    return this.optOut.status(contact);
  }
  async markOptOut(contact: Contact) {
    const values = await this.queue();
    const contacts = values.map((row, index) => ({ row, index })).filter(x => x.row[0] === contact.id && x.row[2]?.trim().toLowerCase() === contact.recipient);
    if (JSON.stringify(values[0]) !== JSON.stringify(headers) || contacts.length !== 1) throw Error('Cannot safely update opted-out contact');
    await this.write(this.range(this.config.queueSheet, `H${contacts[0].index + 1}`), [['do-not-contact']]);
  }

  async request(url: string, method = 'GET', body?: unknown): Promise<unknown> {
    const { token } = await this.auth.getAccessToken();
    if (!token) throw Error('Google authentication is missing; run auth');
    // No automatic retries: a failed POST can already have sent a message.
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000), redirect: 'error' });
    if (!response.ok) throw Error(`Google API returned HTTP ${response.status}; request not retried`);
    return response.json();
  }
  sheetUrl(suffix = '') { return `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}${suffix}`; }
  range(title: string, cells: string) { return `'${title.replaceAll("'", "''")}'!${cells}`; }
  async values(title: string, cells: string): Promise<string[][]> {
    const result = z.object({ values: z.array(z.array(z.union([z.string(), z.number(), z.boolean()]))).optional() })
      .parse(await this.request(this.sheetUrl(`/values/${encodeURIComponent(this.range(title, cells))}`)));
    return (result.values || []).map(row => row.map(String));
  }
  async identity() {
    const profile = z.object({ emailAddress: z.string() }).parse(await this.request('https://gmail.googleapis.com/gmail/v1/users/me/profile'));
    if (profile.emailAddress.toLowerCase() !== this.config.sender) throw Error('Connected Gmail account is not the configured sender');
  }
  queue() { return this.values(this.config.queueSheet, 'A:L'); }
  history() { return this.values(this.config.historySheet, 'A:J'); }
  async previousContact(recipient: string) {
    const q = `in:anywhere {to:${recipient} from:${recipient}}`;
    const response = z.object({ messages: z.array(z.object({ id: z.string() })).optional() }).parse(await this.request(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({ q, maxResults: '1', includeSpamTrash: 'true' })}`));
    return !!response.messages?.length;
  }
  async send(raw: string) {
    return z.object({ id: z.string().min(1), threadId: z.string().min(1) }).parse(await this.request(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', 'POST', { raw }));
  }
  async write(range: string, values: string[][]) {
    return this.request(this.sheetUrl(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`), 'PUT', { range, values });
  }
  async setup(apply: boolean) {
    const metadata = z.object({ sheets: z.array(z.object({ properties: z.object({ title: z.string() }) })) }).parse(
      await this.request(this.sheetUrl('?fields=sheets.properties.title')));
    const found = metadata.sheets.some(s => s.properties.title === this.config.queueSheet);
    if (found) {
      const current = await this.queue();
      if (current.length === 0) {
        if (apply) await this.write(this.range(this.config.queueSheet, 'A1:L1'), [headers]);
        return { action: 'initialize the existing empty queue tab', applied: apply };
      }
      if (JSON.stringify(current[0]) !== JSON.stringify(headers)) throw Error('Existing queue has different headers; no changes made');
      return { action: 'already configured', applied: false };
    }
    if (apply) {
      await this.request(this.sheetUrl(':batchUpdate'), 'POST', { requests: [{ addSheet: { properties: { title: this.config.queueSheet, gridProperties: { frozenRowCount: 1 } } } }] });
      await this.write(this.range(this.config.queueSheet, 'A1:L1'), [headers]);
    }
    return { action: 'create Outreach Queue tab; preserve the history tab', applied: apply };
  }
  async append(rows: string[][]) {
    return this.request(this.sheetUrl(`/values/${encodeURIComponent(this.range(this.config.queueSheet, 'A:L'))}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`), 'POST', { values: rows });
  }
  async record(contact: Contact, attempt: Attempt, status = 'sent') {
    if (contact.id !== attempt.contact_id || contact.recipient !== attempt.recipient) throw Error('Receipt does not belong to the current contact; manual review required');
    const values = await this.queue();
    if (JSON.stringify(values[0]) !== JSON.stringify(headers)) throw Error('Queue headers changed; tracker update stopped');
    const matching = values.map((row, index) => ({ row, index })).filter(x => x.row[0] === contact.id);
    if (matching.length !== 1 || matching[0].row[2]?.trim().toLowerCase() !== contact.recipient) throw Error('Contact moved or changed; tracker update needs review');
    const row = matching[0];
    const existingStatus = row.row[7];
    if (existingStatus === 'do-not-contact') return;
    // Reconciliation must not erase a later reply/delivery review.
    const nextStatus = status === 'sent' && ['replied-review', 'delivery-review'].includes(existingStatus) ? existingStatus : status;
    await this.write(this.range(this.config.queueSheet, `H${row.index + 1}:K${row.index + 1}`), [[
      nextStatus, attempt.sent_at || '', `https://mail.google.com/mail/u/0/#all/${attempt.thread_id}`, new Date().toISOString(),
    ]]);
  }
  async conversationStatus(threadId: string): Promise<'sent' | 'replied-review' | 'delivery-review'> {
    if (!/^[a-zA-Z0-9_-]+$/.test(threadId)) throw Error('Invalid thread ID');
    const message = z.object({ payload: z.object({ mimeType: z.string().optional(), headers: z.array(z.object({ name: z.string(), value: z.string() })).optional() }).optional(), labelIds: z.array(z.string()).optional() });
    const thread = z.object({ messages: z.array(message) }).parse(await this.request(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata`));
    const incoming = thread.messages.filter(m => !m.labelIds?.includes('SENT') && !m.labelIds?.includes('DRAFT'));
    if (incoming.some(m => m.payload?.headers?.some(h => h.name.toLowerCase() === 'from' && /mailer-daemon|postmaster/i.test(h.value)))) return 'delivery-review';
    return incoming.length ? 'replied-review' : 'sent';
  }
}
