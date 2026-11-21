import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configSchema, contactRow, digest, headers, historyHeaders, type Batch, type Contact } from '../src/model.ts';
import { Ledger, type Attempt } from '../src/store.ts';
import { checkBatch, newContact, prepare, sendBatch } from '../src/workflow.ts';
import type { Services } from '../src/google.ts';

const date = new Date('2026-11-20T12:00:00Z');
const config = configSchema.parse({ sender: 'sender@example.org', spreadsheetId: 'a'.repeat(30) });
function fixture(index = 0): Contact {
  return { ...newContact({ organisation: `Club ${index}`, recipient: `club${index}@example.org`, source: 'https://example.org/contact', subject: 'A Whist lesson for your beginners',
    body: 'Please try one free lesson: https://play.google.com/store/apps/details?id=com.martin.barbu\nIf this is not relevant, let me know and I will stop contacting you.' }), eligibility: 'reviewed' };
}

class FakeApi implements Services {
  config = config;
  contacts = [fixture()];
  historyRows = [historyHeaders];
  previous = false;
  sendFailure = false;
  trackerFailure = false;
  identityFailure = false;
  sends = 0;
  records = 0;
  optedOut = false;
  optOutFailure = false;
  linkValid = true;
  async identity() { if (this.identityFailure) throw Error('Wrong account'); }
  async queue() { return [headers, ...this.contacts.map(contactRow)]; }
  async history() { return this.historyRows; }
  async previousContact() { return this.previous; }
  async send() { this.sends++; if (this.sendFailure) throw Error('Connection dropped after POST'); return { id: 'message1', threadId: 'thread1' }; }
  async record(_c: Contact, _a: Attempt) { this.records++; if (this.trackerFailure) throw Error('Sheets unavailable'); }
  async optOutStatus() { if (this.optOutFailure) throw Error('Unsubscribe unavailable'); return { suppressed: this.optedOut, linkValid: this.linkValid }; }
  async markOptOut(c: Contact) { this.contacts.find(contact => contact.id === c.id)!.status = 'do-not-contact'; }
}

function setup(t: { after: (f: () => void) => void }) {
  const home = mkdtempSync(join(tmpdir(), 'barbu-outreach-test-'));
  const ledger = new Ledger(home);
  t.after(() => { ledger.close(); rmSync(home, { recursive: true, force: true }); });
  return { api: new FakeApi(), ledger, home };
}

test('prepare is read-only and skips previously contacted history rows', async t => {
  const { api, ledger } = setup(t);
  api.contacts.push(fixture(1));
  api.historyRows.push(['Old club', api.contacts[0].recipient]);
  const batch = await prepare(api, ledger, [], date);
  assert.equal(batch.contacts.length, 1);
  assert.equal(batch.contacts[0].recipient, api.contacts[1].recipient);
  assert.equal(api.sends, 0);
  assert.equal(api.records, 0);
  assert.equal(ledger.approved(digest(batch)), false);
});

test('an explicitly selected historical contact is rejected', async t => {
  const { api, ledger } = setup(t);
  api.historyRows.push(['Old club', api.contacts[0].recipient]);
  await assert.rejects(prepare(api, ledger, [api.contacts[0].id], date), /already contacted/);
});

test('Gmail conversations block new outreach even without a tracker row', async t => {
  const { api, ledger } = setup(t);
  api.previous = true;
  await assert.rejects(prepare(api, ledger, [], date), /existing conversation/);
  assert.equal(api.sends, 0);
});

test('unreviewed contacts do not enter a batch', async t => {
  const { api, ledger } = setup(t);
  api.contacts[0].eligibility = 'needs-review';
  await assert.rejects(prepare(api, ledger, [], date), /No eligible/);
});

test('send requires explicit approval of the exact batch', async t => {
  const { api, ledger } = setup(t);
  const batch = await prepare(api, ledger, [], date);
  await assert.rejects(sendBatch(api, ledger, batch, () => date), /Explicit approval/);
  assert.equal(api.sends, 0);
});

test('a sent batch cannot be sent twice', async t => {
  const { api, ledger } = setup(t);
  const batch = await prepare(api, ledger, [], date);
  ledger.approve(batch);
  await sendBatch(api, ledger, batch, () => date);
  const result = await sendBatch(api, ledger, batch, () => date);
  assert.equal(api.sends, 1);
  assert.match(result[0].state, /already-sent/);
});

test('post-approval body, recipient, source and eligibility changes block sending', async t => {
  const { api, ledger } = setup(t);
  for (const change of [{ body: fixture().body + '\nAn additional sentence changes the approved content.' }, { recipient: 'changed@example.org' }, { source: 'https://example.org/elsewhere' }, { eligibility: 'needs-review' as const }]) {
    const original = fixture(); api.contacts = [original];
    const batch = await prepare(api, ledger, [], date); ledger.approve(batch);
    api.contacts = [{ ...original, ...change }];
    await assert.rejects(sendBatch(api, ledger, batch, () => date), /changed after preview/);
  }
  assert.equal(api.sends, 0);
});

test('Gmail success followed by Sheets failure retains the receipt and never resends', async t => {
  const { api, ledger } = setup(t);
  const batch = await prepare(api, ledger, [], date); ledger.approve(batch);
  api.trackerFailure = true;
  await assert.rejects(sendBatch(api, ledger, batch, () => date), /Gmail accepted.*tracker update failed/);
  assert.equal(ledger.attempts()[0].state, 'sent');
  api.trackerFailure = false;
  await sendBatch(api, ledger, batch, () => date);
  assert.equal(api.sends, 1);
  await api.record(api.contacts[0], ledger.attempts()[0]);
  assert.equal(api.records, 2);
});

test('uncertain POST failure stops the batch and is never retried', async t => {
  const { api, ledger } = setup(t); api.contacts.push(fixture(1));
  const batch = await prepare(api, ledger, [], date); ledger.approve(batch); api.sendFailure = true;
  await assert.rejects(sendBatch(api, ledger, batch, () => date), /uncertain/);
  assert.equal(api.sends, 1);
  assert.equal(ledger.attempts()[0].state, 'uncertain');
  await assert.rejects(sendBatch(api, ledger, batch, () => date), /no retry/);
  assert.equal(api.sends, 1);
});

test('a newly recorded opt-out blocks an already approved batch', async t => {
  const { api, ledger } = setup(t);
  const batch = await prepare(api, ledger, [], date); ledger.approve(batch);
  ledger.suppress(api.contacts[0].recipient, 'Asked not to be contacted');
  await assert.rejects(sendBatch(api, ledger, batch, () => date), /no retry/);
  assert.equal(api.sends, 0);
});

test('wrong account and newly found Gmail history block approved sending', async t => {
  const { api, ledger } = setup(t);
  const batch = await prepare(api, ledger, [], date); ledger.approve(batch);
  api.identityFailure = true;
  await assert.rejects(sendBatch(api, ledger, batch, () => date), /Wrong account/);
  api.identityFailure = false; api.previous = true;
  await assert.rejects(sendBatch(api, ledger, batch, () => date), /Existing contact/);
  assert.equal(api.sends, 0);
});

test('hosted opt-outs override an approved batch and stale tracker eligibility', async t => {
  const { api, ledger } = setup(t);
  const batch = await prepare(api, ledger, [], date); ledger.approve(batch);
  api.optedOut = true;
  await assert.rejects(sendBatch(api, ledger, batch, () => date), /opted out/);
  assert.equal(api.sends, 0);
  assert.equal(ledger.blocked(api.contacts[0].recipient), true);
  assert.equal(api.contacts[0].status, 'do-not-contact');
});

test('unavailable unsubscribe service and invalid links fail before reserving or sending', async t => {
  const { api, ledger } = setup(t);
  const batch = await prepare(api, ledger, [], date); ledger.approve(batch);
  api.optOutFailure = true;
  await assert.rejects(sendBatch(api, ledger, batch, () => date), /Unsubscribe unavailable/);
  assert.equal(ledger.attempts().length, 0);
  api.optOutFailure = false; api.linkValid = false;
  await assert.rejects(sendBatch(api, ledger, batch, () => date), /unsubscribe link/);
  await assert.rejects(prepare(api, ledger, [], date), /unsubscribe link/);
  assert.equal(api.sends, 0);
});

test('daily cap covers all batches and uncertain attempts', t => {
  const { ledger } = setup(t);
  const batch: Batch = { version: 1, config, createdAt: date.toISOString(), contacts: [fixture()] };
  ledger.approve(batch);
  for (let i = 0; i < 10; i++) {
    const c = fixture(i);
    ledger.reserve(c, digest(batch), '2026-11-20', 10, config.sender);
    ledger.uncertain(c.recipient);
  }
  assert.throws(() => ledger.reserve(fixture(11), digest(batch), '2026-11-20', 10, config.sender), /limit reached/);
  assert.equal(ledger.attempts().length, 10);
  ledger.reserve(fixture(12), digest(batch), '2026-11-21', 10, config.sender);
});

test('concurrent ledger instances cannot reserve the same recipient', t => {
  const { ledger, home } = setup(t);
  const batch: Batch = { version: 1, config, createdAt: date.toISOString(), contacts: [fixture()] };
  ledger.approve(batch);
  ledger.reserve(batch.contacts[0], digest(batch), '2026-11-20', 10, config.sender);
  const other = new Ledger(home);
  try { assert.throws(() => other.reserve(batch.contacts[0], digest(batch), '2026-11-20', 10, config.sender), /already attempted/); }
  finally { other.close(); }
});

test('manual outreach already recorded today counts against the daily cap', async t => {
  const { api, ledger } = setup(t);
  api.historyRows.push(...Array.from({ length: 10 }, (_, i) => [`Historical ${i}`, `old${i}@example.org`, '', '2026-11-20']));
  const batch = await prepare(api, ledger, [], date); ledger.approve(batch);
  await assert.rejects(sendBatch(api, ledger, batch, () => date), /limit reached/);
  assert.equal(api.sends, 0);
});

test('expired batches and account/tracker changes invalidate approval', () => {
  const batch: Batch = { version: 1, config, createdAt: date.toISOString(), contacts: [fixture()] };
  assert.throws(() => checkBatch(batch, config, new Date('2026-11-22T00:00:00Z')), /older than/);
  assert.throws(() => checkBatch(batch, { ...config, sender: 'different@example.org' }, date), /configuration changed/);
  assert.throws(() => checkBatch(batch, { ...config, spreadsheetId: 'b'.repeat(30) }, date), /configuration changed/);
});
