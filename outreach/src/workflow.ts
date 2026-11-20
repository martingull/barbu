import { randomUUID } from 'node:crypto';
import { assertEligible, dayKey, digest, historicalAttemptsToday, historyRecipients, rawMessage, readQueue, type Batch, type Config, type Contact } from './model.ts';
import { Ledger } from './store.ts';
import type { Services } from './google.ts';

export function checkBatch(batch: Batch, config: Config, now = new Date()) {
  if (JSON.stringify(batch.config) !== JSON.stringify(config)) throw Error('Account or tracker configuration changed; prepare again');
  const age = now.getTime() - Date.parse(batch.createdAt);
  if (age < 0 || age > 86400000) throw Error('Batch is older than 24 hours or has an invalid timestamp; prepare again');
  if (batch.contacts.length > config.dailyLimit || new Set(batch.contacts.map(c => c.recipient)).size !== batch.contacts.length) throw Error('Batch size or recipients invalid');
  for (const contact of batch.contacts) assertEligible(contact);
}

export async function prepare(api: Services, ledger: Ledger, ids: string[], now = new Date()): Promise<Batch> {
  await api.identity();
  const queue = readQueue(await api.queue());
  const history = historyRecipients(await api.history());
  const selected = ids.length ? ids.map(id => {
    const contact = queue.find(c => c.id === id);
    if (!contact) throw Error(`Unknown contact ID ${id}`);
    return contact;
  }) : queue.filter(c => c.status === 'draft' && c.eligibility === 'reviewed' && !ledger.blocked(c.recipient) && !history.has(c.recipient)).slice(0, api.config.dailyLimit);
  if (!selected.length) throw Error('No eligible drafts. Import contacts and review eligibility first');
  const batch: Batch = { version: 1, createdAt: now.toISOString(), config: api.config, contacts: selected };
  checkBatch(batch, api.config, now);
  for (const c of selected) {
    if (c.recipient === api.config.sender || ledger.blocked(c.recipient) || history.has(c.recipient)) throw Error(`Contact ${c.id} was already contacted or is suppressed`);
    if (await api.previousContact(c.recipient)) throw Error(`Gmail has an existing conversation for ${c.id}; review it manually, do not send a new invitation`);
  }
  return batch;
}

export async function sendBatch(api: Services, ledger: Ledger, batch: Batch, now = () => new Date()) {
  checkBatch(batch, api.config, now());
  const hash = digest(batch);
  if (!ledger.approved(hash)) throw Error('Explicit approval required; preview and approve the exact batch first');
  await api.identity();
  const results: { contactId: string; state: string }[] = [];
  for (const c of batch.contacts) {
    checkBatch(batch, api.config, now());
    const old = ledger.attempts().find(a => a.recipient === c.recipient);
    if (old?.batch === hash && old.state === 'sent') { results.push({ contactId: c.id, state: 'already-sent; use sync for tracker repair' }); continue; }
    if (ledger.blocked(c.recipient)) throw Error(`Contact ${c.id} already attempted or suppressed; no retry`);
    const current = readQueue(await api.queue()).find(row => row.id === c.id);
    if (JSON.stringify(current) !== JSON.stringify(c)) throw Error(`Contact ${c.id} changed after preview; approval no longer applies`);
    const history = await api.history();
    if (historyRecipients(history).has(c.recipient) || await api.previousContact(c.recipient)) throw Error(`Existing contact for ${c.id}; sending stopped`);
    const day = dayKey(now(), api.config.timezone);
    const messageId = ledger.reserve(c, hash, day, api.config.dailyLimit, api.config.sender, historicalAttemptsToday(history, day));
    let receipt: { id: string; threadId: string };
    try {
      receipt = await api.send(rawMessage(api.config.sender, c, messageId));
      ledger.sent(c.recipient, receipt.id, receipt.threadId, now().toISOString());
    } catch {
      ledger.uncertain(c.recipient);
      throw Error(`Send result for ${c.id} is uncertain. No automatic retry. Inspect Gmail and reconcile before further action`);
    }
    // Gmail and Sheets are not a transaction. Persist the receipt before touching Sheets.
    const attempt = ledger.attempts().find(a => a.recipient === c.recipient)!;
    try { await api.record(c, attempt); }
    catch { throw Error(`Gmail accepted ${c.id}, but tracker update failed. Do not resend; run sync to repair the tracker`); }
    results.push({ contactId: c.id, state: 'sent; delivery and reading unconfirmed' });
  }
  return results;
}

export function newContact(input: Omit<Contact, 'id' | 'status' | 'eligibility'>): Contact {
  return { ...input, id: randomUUID(), status: 'draft', eligibility: 'needs-review' };
}
