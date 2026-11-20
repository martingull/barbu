import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OAuth2Client } from 'google-auth-library';
import { GoogleApi } from '../src/google.ts';
import { configSchema, contactRow, headers, type Contact } from '../src/model.ts';
import { newContact } from '../src/workflow.ts';
import type { Attempt } from '../src/store.ts';

const config = configSchema.parse({ sender: 'me@example.org', spreadsheetId: 'a'.repeat(30) });
class StubGoogle extends GoogleApi {
  calls: { url: string; method: string; body: unknown }[] = [];
  responses: unknown[] = [];
  constructor() { super(config, new OAuth2Client()); }
  override async request(url: string, method = 'GET', body?: unknown) {
    this.calls.push({ url, method, body });
    if (!this.responses.length) throw Error('Unexpected Google request');
    return this.responses.shift();
  }
}
const contact: Contact = { ...newContact({ organisation: 'Club', recipient: 'club@example.org', source: 'https://example.org/contact', subject: 'A free Whist learning tool', body: 'An original message with enough text to validate the contact schema.' }), eligibility: 'reviewed' };
const attempt: Attempt = { recipient: contact.recipient, contact_id: contact.id, batch: 'a'.repeat(64), day: '2026-11-20', message_id: '<abc@example.org>', state: 'sent', gmail_id: 'abc', thread_id: 'def', sent_at: '2026-11-20T12:00:00Z' };

test('real adapter verifies primary Gmail identity', async () => {
  const api = new StubGoogle(); api.responses = [{ emailAddress: 'another@example.org' }];
  await assert.rejects(api.identity(), /not the configured sender/);
  assert.match(api.calls[0].url, /users\/me\/profile$/);
});

test('duplicate search includes sent, received, spam and trash', async () => {
  const api = new StubGoogle(); api.responses = [{ messages: [{ id: 'old-message' }] }];
  assert.equal(await api.previousContact('club@example.org'), true);
  const url = new URL(api.calls[0].url);
  assert.equal(url.searchParams.get('includeSpamTrash'), 'true');
  assert.equal(url.searchParams.get('q'), 'in:anywhere {to:club@example.org from:club@example.org}');
});

test('setup preview does not mutate Google or overwrite existing tabs', async () => {
  const api = new StubGoogle(); api.responses = [{ sheets: [{ properties: { title: 'Sheet1' } }] }];
  assert.equal((await api.setup(false)).applied, false);
  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0].method, 'GET');
  api.responses = [{ sheets: [{ properties: { title: 'Outreach Queue' } }] }, { values: [['Wrong header']] }];
  await assert.rejects(api.setup(true), /different headers/);
  assert.equal(api.calls.filter(c => c.method !== 'GET').length, 0);
});

test('setup can finish an interrupted creation only when the queue is empty', async () => {
  const api = new StubGoogle(); api.responses = [{ sheets: [{ properties: { title: 'Outreach Queue' } }] }, {}, {}];
  await api.setup(true);
  assert.equal(api.calls.at(-1)?.method, 'PUT');
  assert.deepEqual(api.calls.at(-1)?.body, { range: "'Outreach Queue'!A1:L1", values: [headers] });
});

test('tracker repair locates UUID after row movement, writes RAW, preserves notes and replies', async () => {
  const api = new StubGoogle();
  const other: Contact = { ...contact, id: '851bc4b5-dff3-4bfe-8fad-49bcf7284b22', recipient: 'other@example.org' };
  const row = contactRow(contact); row[7] = 'replied-review'; row[11] = 'Operator note';
  api.responses = [{ values: [headers, contactRow(other), row] }, {}];
  await api.record(contact, attempt);
  const write = api.calls.at(-1)!;
  assert.equal(write.method, 'PUT');
  const body = write.body as { range: string; values: string[][] };
  assert.equal(body.range, "'Outreach Queue'!H3:K3");
  assert.equal(body.values[0][0], 'replied-review');
  assert.equal(new URL(write.url).searchParams.get('valueInputOption'), 'RAW');
});

test('tracker repair rejects recipient edits and does not override opt-outs', async () => {
  const api = new StubGoogle();
  await assert.rejects(api.record({ ...contact, recipient: 'changed@example.org' }, attempt), /Receipt does not belong/);
  const changed = contactRow({ ...contact, recipient: 'changed@example.org' });
  api.responses = [{ values: [headers, changed] }];
  await assert.rejects(api.record(contact, attempt), /Contact moved or changed/);
  const optedOut = contactRow({ ...contact, status: 'do-not-contact' });
  api.responses = [{ values: [headers, optedOut] }];
  await api.record(contact, attempt);
  assert.equal(api.calls.filter(c => c.method !== 'GET').length, 0);
});

test('incoming thread messages are review flags, not positive-response claims', async () => {
  const api = new StubGoogle();
  api.responses = [{ messages: [{ labelIds: ['SENT'] }] }, { messages: [{ labelIds: ['INBOX'], payload: { headers: [{ name: 'From', value: 'Person <club@example.org>' }] } }] }, { messages: [{ payload: { headers: [{ name: 'From', value: 'Mailer-Daemon <mailer-daemon@example.org>' }] } }] }];
  assert.equal(await api.conversationStatus('thread'), 'sent');
  assert.equal(await api.conversationStatus('thread'), 'replied-review');
  assert.equal(await api.conversationStatus('thread'), 'delivery-review');
});

test('HTTP send failure is never automatically retried', async t => {
  const auth = new OAuth2Client(); auth.setCredentials({ access_token: 'fake-test-token', expiry_date: Date.now() + 3600000 });
  const api = new GoogleApi(config, auth);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('{}', { status: 503 }); });
  await assert.rejects(api.send('fake-mime'), /HTTP 503/);
  assert.equal(calls, 1);
});
