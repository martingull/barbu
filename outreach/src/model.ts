import { createHash } from 'node:crypto';
import { z } from 'zod';

export const email = z.string().trim().toLowerCase().regex(/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/);
const line = z.string().trim().min(1).max(200).refine(s => !/[\r\n\x00-\x1f]/.test(s), 'Must be one line');
export const configSchema = z.object({
  sender: email,
  spreadsheetId: z.string().regex(/^[a-zA-Z0-9_-]{20,}$/),
  historySheet: z.string().min(1).default('Sheet1'),
  queueSheet: z.literal('Outreach Queue').default('Outreach Queue'),
  dailyLimit: z.number().int().min(1).max(10).default(10),
  timezone: z.string().refine(s => { try { new Intl.DateTimeFormat('en', { timeZone: s }); return true; } catch { return false; } }).default('Europe/Oslo'),
}).strict();
export type Config = z.infer<typeof configSchema>;
export const contactSchema = z.object({
  id: z.uuid(), organisation: line, recipient: email,
  source: z.url().refine(s => new URL(s).protocol === 'https:', 'Use the verified public HTTPS source'),
  eligibility: z.enum(['needs-review', 'reviewed']),
  subject: line,
  body: z.string().trim().min(40).max(12000).refine(s => !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s)),
  status: z.enum(['draft', 'sent', 'replied-review', 'delivery-review', 'do-not-contact']),
}).strict();
export type Contact = z.infer<typeof contactSchema>;
export const headers = ['Contact ID', 'Organisation', 'Email', 'Source URL', 'Eligibility', 'Subject', 'Body', 'Status', 'Sent at', 'Gmail thread', 'Last checked', 'Notes'];
export const historyHeaders = ['Organisation', 'Contact email', 'Reason for fit', 'Date sent', 'Status', 'Feedback / delivery', 'Next action', 'Follow-up policy', 'Gmail conversation', 'Last checked'];
export const batchSchema = z.object({
  version: z.literal(1), createdAt: z.iso.datetime(), config: configSchema,
  contacts: z.array(contactSchema).min(1).max(10),
}).strict();
export type Batch = z.infer<typeof batchSchema>;

export function digest(batch: Batch): string {
  return createHash('sha256').update(JSON.stringify(batchSchema.parse(batch))).digest('hex');
}

export function readQueue(values: string[][]): Contact[] {
  if (JSON.stringify(values[0]) !== JSON.stringify(headers)) throw Error('Queue headers differ; refusing to guess columns');
  const contacts = values.slice(1).filter(row => row.some(Boolean)).map(row => contactSchema.parse({
    id: row[0], organisation: row[1], recipient: row[2], source: row[3], eligibility: row[4], subject: row[5], body: row[6], status: row[7],
  }));
  if (new Set(contacts.map(c => c.id)).size !== contacts.length || new Set(contacts.map(c => c.recipient)).size !== contacts.length) throw Error('Duplicate queue contact ID or recipient');
  return contacts;
}

export function contactRow(c: Contact): string[] {
  return [c.id, c.organisation, c.recipient, c.source, c.eligibility, c.subject, c.body, c.status, '', '', '', ''];
}

export function historyRecipients(values: string[][]): Set<string> {
  if (JSON.stringify(values[0]) !== JSON.stringify(historyHeaders)) throw Error('History headers differ; refusing to skip duplicate checks');
  return new Set(values.slice(1).filter(row => row.some(Boolean)).map(row => email.parse(row[1])));
}

export function historicalAttemptsToday(values: string[][], day: string): number {
  historyRecipients(values);
  return values.slice(1).filter(row => row[3]?.slice(0, 10) === day).length;
}

export function assertEligible(contact: Contact): void {
  if (contact.eligibility !== 'reviewed' || contact.status !== 'draft') throw Error(`Contact ${contact.id} is not eligible for a new message`);
  if (!contact.body.includes('https://play.google.com/store/apps/details?id=com.martin.barbu')) throw Error('Message must include the direct Google Play link');
  if (!/won.t follow up|opt out|stop contacting|do not contact|let me know and I will not contact you again/i.test(contact.body)) throw Error('Message must include an opt-out instruction');
}

export function dayKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(t => parts.find(p => p.type === t)!.value).join('-');
}

export function rawMessage(sender: string, contact: Contact, messageId: string): string {
  email.parse(sender); contactSchema.parse(contact);
  if (!/^<[a-f0-9-]+@[^<>\r\n]+>$/.test(messageId)) throw Error('Invalid message ID');
  const chunks: string[] = [];
  for (const char of contact.subject) {
    if (!chunks.length || Buffer.byteLength(chunks.at(-1)! + char) > 42) chunks.push(char);
    else chunks[chunks.length - 1] += char;
  }
  const subject = chunks.map(chunk => `=?UTF-8?B?${Buffer.from(chunk).toString('base64')}?=`).join('\r\n ');
  const encodedBody = Buffer.from(contact.body.replace(/\r?\n/g, '\r\n')).toString('base64').match(/.{1,76}/g)!.join('\r\n');
  return Buffer.from([
    `From: ${sender}`, `To: ${contact.recipient}`, `Subject: ${subject}`, `Message-ID: ${messageId}`, `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', encodedBody,
  ].join('\r\n')).toString('base64url');
}
