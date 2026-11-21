import { chromium, webkit, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { OptOutClient, optOutConfigSchema } from '../src/optOut.ts';
import { privateHome, readPrivate, writePrivate, Ledger } from '../src/store.ts';
import { configSchema, headers, historyHeaders, contactRow } from '../src/model.ts';
import { newContact, prepare, sendBatch } from '../src/workflow.ts';

// No Gmail adapter or real tracker is used. Synthetic opt-outs are intentionally retained.
const home = privateHome();
const client = new OptOutClient(optOutConfigSchema.parse(readPrivate(join(home, 'unsubscribe.json'))));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const captures = join(root, 'release/website/unsubscribe-smoke', stamp);
mkdirSync(captures, { recursive: true });
const results = [];
for (const [name, engine, viewport] of [['chromium', chromium, { width: 360, height: 740 }], ['webkit', webkit, { width: 393, height: 852 }]]) {
  const contact = { ...newContact({ organisation: 'Synthetic verification, not a real club', recipient: `unsubscribe-check-${randomUUID()}@example.invalid`, source: 'https://example.invalid/',
    subject: 'Synthetic verification only', body: 'No email is sent. https://play.google.com/store/apps/details?id=com.martin.barbu\nPlease opt out if this is not relevant.' }), eligibility: 'reviewed' };
  const link = await client.register(contact);
  contact.body += `\nStop further Barbu outreach: ${link}`;
  assert.deepEqual(await client.status(contact), { suppressed: false, linkValid: true });
  const path = mkdtempSync(join(tmpdir(), 'barbu-optout-smoke-'));
  const ledger = new Ledger(path);
  let sendCalls = 0;
  let trackerBlocked = false;
  const api = {
    config: configSchema.parse({ sender: 'operator@example.invalid', spreadsheetId: 'x'.repeat(30) }),
    async identity() {}, async history() { return [historyHeaders]; },
    async queue() { return [headers, contactRow(contact)]; }, async previousContact() { return false; },
    async optOutStatus(c) { return client.status(c); }, async markOptOut() { trackerBlocked = true; },
    async send() { sendCalls++; throw Error('A smoke check must never send email'); }, async record() { throw Error('A smoke check must never write a real tracker'); },
  };
  const browser = await engine.launch();
  try {
    const batch = await prepare(api, ledger, []);
    ledger.approve(batch); // Local fake-ledger approval, never a real outreach approval.
    const page = await browser.newPage({ viewport });
    let browserPosts = 0;
    page.on('request', request => { if (request.url().startsWith(client.config.apiUrl) && request.method() === 'POST') browserPosts++; });
    const response = await page.goto(link);
    assert.equal(response.status(), 200);
    await expect(page.getByRole('button', { name: 'Stop Barbu outreach', exact: true })).toBeEnabled();
    assert.equal(browserPosts, 0);
    assert.equal((await client.status(contact)).suppressed, false);
    await page.screenshot({ path: join(captures, `${name}-confirmation.png`), fullPage: true });
    await page.getByRole('button', { name: 'Stop Barbu outreach', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('You are unsubscribed.', { timeout: 20000 });
    assert.equal(browserPosts, 1);
    assert.equal((await client.status(contact)).suppressed, true);
    await page.screenshot({ path: join(captures, `${name}-success.png`), fullPage: true });
    const token = client.token(contact);
    const repeat = await fetch(new URL('/unsubscribe', client.config.apiUrl), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
    assert.equal(repeat.status, 200);
    await assert.rejects(sendBatch(api, ledger, batch), /opted out/);
    assert.equal(sendCalls, 0);
    assert.equal(ledger.attempts().length, 0);
    assert.equal(ledger.blocked(contact.recipient), true);
    assert.equal(trackerBlocked, true);
    results.push({ browser: name, noAutomaticPost: true, confirmationPersisted: true, repeatedConfirmationSafe: true, approvedBatchBlocked: true, emailsSent: 0 });
  } finally {
    await browser.close();
    ledger.close();
    rmSync(path, { recursive: true, force: true });
  }
}
writePrivate(join(home, `unsubscribe-smoke-${stamp}.json`), { checkedAt: new Date().toISOString(), results, captures });
console.log(JSON.stringify({ results, captures }, null, 2));
