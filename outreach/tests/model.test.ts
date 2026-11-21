import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertEligible, configSchema, contactSchema, dayKey, email, headers, historyHeaders, historyRecipients, rawMessage, readQueue } from '../src/model.ts';
import { validCallback } from '../src/google.ts';

test('recipient/header injection and invalid daily limits are rejected', () => {
  for (const value of ['one@example.org\r\nBcc:two@example.org', 'one@example.org,two@example.org', 'Name <one@example.org>']) assert.equal(email.safeParse(value).success, false);
  assert.equal(configSchema.safeParse({ sender: 'me@example.org', spreadsheetId: 'a'.repeat(30), dailyLimit: 11 }).success, false);
});

test('queue and historical headers fail closed on missing or shifted columns', () => {
  assert.throws(() => readQueue([]), /headers/);
  assert.throws(() => readQueue([headers.slice(1)]), /headers/);
  assert.throws(() => historyRecipients([['Email']]), /headers/);
  assert.deepEqual(historyRecipients([historyHeaders, ['Club', 'CLUB@example.org']]), new Set(['club@example.org']));
});

test('OAuth callbacks require the exact path and state', () => {
  assert.equal(validCallback(new URL('http://127.0.0.1/oauth2callback?state=abc'), 'abc'), true);
  assert.equal(validCallback(new URL('http://127.0.0.1/oauth2callback?state=abd'), 'abc'), false);
  assert.equal(validCallback(new URL('http://127.0.0.1/other?state=abc'), 'abc'), false);
  assert.equal(validCallback(new URL('http://127.0.0.1/oauth2callback'), 'abc'), false);
});

test('daily accounting uses the configured local date, including DST', () => {
  assert.equal(dayKey(new Date('2026-11-20T23:30:00Z'), 'Europe/Oslo'), '2026-11-21');
  assert.equal(dayKey(new Date('2026-06-20T22:30:00Z'), 'Europe/Oslo'), '2026-06-21');
});

test('eligibility accepts the explicit no-contact-again opt-out but still requires an opt-out', () => {
  const base = 'A free Whist lesson: https://play.google.com/store/apps/details?id=com.martin.barbu';
  const contact = contactSchema.parse({ id: '7f297fba-58d4-4aa1-a880-b794f9b1b3c4', organisation: 'Club', recipient: 'club@example.org',
    source: 'https://example.org/contact', eligibility: 'reviewed', status: 'draft', subject: 'A free Whist lesson',
    body: `${base}\nIf this is not relevant, let me know and I will not contact you again.` });
  assert.doesNotThrow(() => assertEligible(contact));
  assert.throws(() => assertEligible({ ...contact, body: base }), /opt-out/);
  assert.throws(() => assertEligible({ ...contact, body: `${base}\nThere is no automatic follow-up.` }), /opt-out/);
  assert.throws(() => assertEligible({ ...contact, eligibility: 'needs-review' }), /not eligible/);
});

test('MIME encodes Unicode subjects and bodies without modifying the direct Play link', () => {
  const c = contactSchema.parse({ id: '7f297fba-58d4-4aa1-a880-b794f9b1b3c4', organisation: 'Club', recipient: 'club@example.org',
    source: 'https://example.org/contact', eligibility: 'reviewed', status: 'draft', subject: 'A trick with Q\u2660',
    body: 'A free Whist lesson: https://play.google.com/store/apps/details?id=com.martin.barbu\nPlease opt out if this is not relevant.' });
  const mime = Buffer.from(rawMessage('me@example.org', c, '<01234567-abcd@example.org>'), 'base64url').toString('utf8');
  const [head, body] = mime.split('\r\n\r\n');
  assert.match(head, /Content-Transfer-Encoding: base64/);
  assert.match(head, /Message-ID: <01234567-abcd@example.org>/);
  assert.equal(Buffer.from(body.replaceAll('\r\n', ''), 'base64').toString('utf8'), c.body.replaceAll('\n', '\r\n'));
});

test('Norwegian invitations require an explicit opt-out, review and the Play link', () => {
  const link = 'https://play.google.com/store/apps/details?id=com.martin.barbu';
  const contact = contactSchema.parse({ id: '7f297fba-58d4-4aa1-a880-b794f9b1b3c4', organisation: 'Club', recipient: 'club@example.org',
    source: 'https://example.org/contact', eligibility: 'reviewed', status: 'draft', subject: 'Et gratis kortkurs',
    body: `Et gratis kortkurs: ${link}\nHvis dette ikke er relevant, gi beskjed, s\u00e5 kontakter jeg dere ikke igjen. Ingen automatisk oppf\u00f8lging.` });
  assert.doesNotThrow(() => assertEligible(contact));
  assert.throws(() => assertEligible({ ...contact, body: `Et gratis kortkurs: ${link}\nIngen automatisk oppf\u00f8lging.` }), /opt-out/);
  assert.throws(() => assertEligible({ ...contact, eligibility: 'needs-review' }), /not eligible/);
  assert.throws(() => assertEligible({ ...contact, body: contact.body.replace(link, '') }), /Google Play link/);
});
