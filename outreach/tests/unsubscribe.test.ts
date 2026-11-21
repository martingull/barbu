import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, hash, type OptOutStore, type Request } from '../src/unsubscribe/handler.ts';
import { OptOutClient, optOutConfigSchema } from '../src/optOut.ts';
import { newContact } from '../src/workflow.ts';

function fixture() {
  const tokens = new Map<string, string>();
  const blocked = new Set<string>();
  const store: OptOutStore = {
    async register(token, recipient) { tokens.set(token, recipient); },
    async recipientFor(token) { return tokens.get(token); },
    async blocked(recipient) { return blocked.has(recipient); },
    async suppress(recipient) { blocked.add(recipient); },
  };
  const secret = 'a'.repeat(64);
  return { tokens, blocked, store, secret, handle: createHandler(store, async () => secret) };
}
const event = (rawPath: string, body: unknown, headers: Record<string, string> = {}): Request =>
  ({ rawPath, body: JSON.stringify(body), headers, requestContext: { http: { method: 'POST' } } });

test('page/scanner GET requests never register links or unsubscribe recipients', async () => {
  const { handle, tokens, blocked } = fixture();
  for (const method of ['GET', 'HEAD', 'OPTIONS']) {
    assert.equal((await handle({ rawPath: '/unsubscribe', requestContext: { http: { method } } })).statusCode, 405);
  }
  assert.equal(tokens.size, 0);
  assert.equal(blocked.size, 0);
});

test('only the operator can register, inspect or suppress recipients', async () => {
  const { handle, tokens, blocked, secret } = fixture();
  for (const route of ['/register', '/check', '/suppress']) {
    assert.equal((await handle(event(route, { recipientHash: hash('club@example.org') }))).statusCode, 401);
    assert.equal((await handle(event(route, { recipientHash: hash('club@example.org') }, { authorization: 'Bearer wrong' }))).statusCode, 401);
    assert.equal((await handle(event(route, { recipientHash: hash('club@example.org') }, { authorization: `Bearer ${secret}`, origin: 'https://siliciumveritas.com' }))).statusCode, 403);
  }
  assert.equal(tokens.size, 0);
  assert.equal(blocked.size, 0);
});

test('opaque links bind to one recipient and confirmation is idempotent and persistent', async () => {
  const { handle, secret, tokens } = fixture();
  const recipientHash = hash('club@example.org');
  const auth = { authorization: `Bearer ${secret}` };
  const registration = await handle(event('/register', { recipientHash }, auth));
  assert.equal(registration.statusCode, 200);
  const { token } = JSON.parse(registration.body);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(tokens.has(hash(token)), true);
  assert.equal(registration.body.includes('club@example.org'), false);
  assert.deepEqual(JSON.parse((await handle(event('/check', { recipientHash, token }, auth))).body), { suppressed: false, linkValid: true });
  assert.deepEqual(JSON.parse((await handle(event('/check', { recipientHash: hash('other@example.org'), token }, auth))).body), { suppressed: false, linkValid: false });
  for (let i = 0; i < 2; i++) {
    const response = await handle(event('/unsubscribe', { token }, { origin: 'https://siliciumveritas.com' }));
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.deepEqual(JSON.parse(response.body), { unsubscribed: true });
  }
  assert.deepEqual(JSON.parse((await handle(event('/check', { recipientHash, token }, auth))).body), { suppressed: true, linkValid: true });
  assert.equal((await handle(event('/register', { recipientHash }, auth))).statusCode, 409);
});

test('invalid tokens, cross-origin requests, extra fields and oversized payloads cannot suppress', async () => {
  const { handle, secret, blocked } = fixture();
  for (const token of ['', 'a'.repeat(42), 'a'.repeat(44), '<script>', 'club@example.org']) {
    assert.equal((await handle(event('/unsubscribe', { token }))).statusCode, 400);
  }
  assert.equal((await handle(event('/unsubscribe', { token: 'a'.repeat(43) }))).statusCode, 404);
  assert.equal((await handle(event('/unsubscribe', { token: 'a'.repeat(43), recipient: 'victim@example.org' }))).statusCode, 400);
  assert.equal((await handle(event('/unsubscribe', { token: 'a'.repeat(43) }, { origin: 'https://evil.example' }))).statusCode, 403);
  assert.equal((await handle(event('/register', { recipientHash: 'club@example.org' }, { authorization: `Bearer ${secret}` }))).statusCode, 400);
  assert.equal((await handle(event('/unsubscribe', { token: 'x'.repeat(3000) }))).statusCode, 413);
  assert.equal((await handle({ ...event('/unsubscribe', {}), body: '{' })).statusCode, 400);
  assert.equal(blocked.size, 0);
});

test('service failures never claim successful unsubscribe or leak private errors', async () => {
  const { store } = fixture();
  store.recipientFor = async () => { throw Error('private token and database details'); };
  const response = await createHandler(store, async () => 'secret')(event('/unsubscribe', { token: 'a'.repeat(43) }));
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.includes('private token'), false);
});

test('operator suppression works even for contacts without a newly issued link', async () => {
  const { handle, secret, blocked } = fixture();
  const recipientHash = hash('legacy@example.org');
  assert.equal((await handle(event('/suppress', { recipientHash }, { authorization: `Bearer ${secret}` }))).statusCode, 200);
  assert.equal(blocked.has(recipientHash), true);
});

test('client sends only recipient hashes and validates links against the intended recipient', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const { handle, secret } = fixture();
  const requests: Array<{ url: string; body: string }> = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), body: String(init?.body) });
    const reply = await handle(event(new URL(String(url)).pathname, JSON.parse(String(init?.body)), init?.headers as Record<string, string>));
    return new Response(reply.body, { status: reply.statusCode });
  };
  const client = new OptOutClient({ apiUrl: 'https://api.example.org/', pageUrl: 'https://siliciumveritas.com/unsubscribe.html', adminKey: secret });
  const contact = newContact({ organisation: 'Club', recipient: 'club@example.org', source: 'https://example.org/', subject: 'A lesson', body: 'A longer invitation body for an example club.' });
  const link = await client.register(contact);
  const withLink = { ...contact, body: `${contact.body}\n${link}` };
  assert.deepEqual(await client.status(withLink), { suppressed: false, linkValid: true });
  assert.deepEqual(await client.status({ ...withLink, recipient: 'other@example.org' }), { suppressed: false, linkValid: false });
  assert.equal(client.token({ ...withLink, body: `${withLink.body}\n${link}` }), undefined);
  assert.equal(requests.some(r => r.body.includes('club@example.org')), false);
  assert.equal(link.includes('club@example.org'), false);
  await client.suppress(contact.recipient);
  assert.equal((await client.status(withLink)).suppressed, true);
});

test('client network failures fail closed and never retry', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw Error('Private network diagnostics'); };
  const client = new OptOutClient({ apiUrl: 'https://api.example.org/', pageUrl: 'https://siliciumveritas.com/unsubscribe.html', adminKey: 'x'.repeat(64) });
  await assert.rejects(client.suppress('club@example.org'), /sending is blocked/);
  assert.equal(calls, 1);
  assert.equal(optOutConfigSchema.safeParse({ ...client.config, apiUrl: 'http://example.org/' }).success, false);
  assert.equal(optOutConfigSchema.safeParse({ ...client.config, apiUrl: 'https://example.org/?key=secret' }).success, false);
});
