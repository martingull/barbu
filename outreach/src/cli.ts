import { parseArgs } from 'node:util';
import { z } from 'zod';
import { authorize, connect } from './google.ts';
import { configSchema, contactRow, contactSchema, dayKey, email, historicalAttemptsToday, historyRecipients, readQueue } from './model.ts';
import { Ledger, loadBatch, privateHome, readInputJson, saveBatch } from './store.ts';
import { checkBatch, newContact, prepare, sendBatch } from './workflow.ts';

const help = `Barbu outreach - no email is sent unless an approved batch is explicitly executed.
Requires Node 24+. Runtime records and Google credentials live outside this repository.

Commands (npm run outreach -- COMMAND):
  auth --client /private/path/client.json --sheet SPREADSHEET_ID --sender WORK_EMAIL
  status
  setup                         Preview adding an Outreach Queue tab; history remains untouched
  setup --apply                 Add the tab and headers after reviewing the preview
  add --file /private/path/contacts.json           Validate and preview new contacts
  add --file /private/path/contacts.json --apply   Append drafts; never approves or sends
  prepare [--ids ID1,ID2]        Print full messages and save an immutable private batch
  approve --batch SHA256         Approve the exact preview; approval expires with the 24h batch
  send --batch SHA256            Check approval and print the saved preview; no send
  send --batch SHA256 --execute  Recheck Google and send, at most 10 attempts/day
  sync                          Repair confirmed sends in Sheets and flag replies for review
  suppress --email ADDRESS --reason REASON        Block an address locally

Review each contact's eligibility and set Eligibility=reviewed in Sheets before prepare.
Never approve on someone else's behalf. New batches need explicit recipient/content approval.
No follow-up campaigns, tracking pixels, lead scraping or unattended scheduling are enabled.
See outreach/README.md for setup, permissions and failure recovery.`;

const { values, positionals } = parseArgs({ options: {
  client: { type: 'string' }, sheet: { type: 'string' }, sender: { type: 'string' }, file: { type: 'string' },
  ids: { type: 'string' }, batch: { type: 'string' }, email: { type: 'string' }, reason: { type: 'string' },
  apply: { type: 'boolean' }, execute: { type: 'boolean' }, help: { type: 'boolean' },
}, allowPositionals: true });

function required(name: 'client' | 'sheet' | 'sender' | 'file' | 'batch' | 'email' | 'reason') {
  const value = values[name];
  if (!value) throw Error(`--${name} is required`);
  return value;
}

async function main() {
  const command = positionals[0];
  if (values.help || !command || command === 'help') { console.log(help); return; }
  if (positionals.length !== 1 || !['auth', 'status', 'setup', 'add', 'prepare', 'approve', 'send', 'sync', 'suppress'].includes(command)) throw Error('Unknown command; use --help');
  const home = privateHome();
  if (command === 'auth') {
    const config = configSchema.parse({ sender: required('sender'), spreadsheetId: required('sheet') });
    await authorize(home, required('client'), config);
    return;
  }
  const api = connect(home);
  const ledger = new Ledger(home);
  try {
    if (command === 'suppress') {
      const recipient = email.parse(required('email'));
      ledger.suppress(recipient, z.string().min(1).max(500).parse(required('reason')));
      console.log('Address suppressed locally. No email sent. Mark do-not-contact in Sheets as well.');
      return;
    }
    await api.identity();
    if (command === 'setup') {
      historyRecipients(await api.history());
      console.log(JSON.stringify(await api.setup(!!values.apply), null, 2));
    } else if (command === 'status') {
      const queue = readQueue(await api.queue());
      const historyRows = await api.history();
      const history = historyRecipients(historyRows);
      const attempts = ledger.attempts();
      console.log(JSON.stringify({ sender: api.config.sender, historyContacts: history.size, queued: queue.length,
        reviewedDrafts: queue.filter(c => c.status === 'draft' && c.eligibility === 'reviewed').length,
        todayAttempts: attempts.filter(a => a.day === dayKey(new Date(), api.config.timezone)).length,
        historicalTodayAttempts: historicalAttemptsToday(historyRows, dayKey(new Date(), api.config.timezone)),
        dailyLimit: api.config.dailyLimit, uncertain: attempts.filter(a => a.state !== 'sent').map(a => a.contact_id),
      }, null, 2));
    } else if (command === 'add') {
      const inputs = z.array(contactSchema.omit({ id: true, status: true, eligibility: true })).min(1).max(100).parse(readInputJson(required('file')));
      const queue = readQueue(await api.queue());
      const seen = historyRecipients(await api.history());
      for (const c of queue) seen.add(c.recipient);
      const organisations = new Set(queue.map(c => c.organisation.toLowerCase()));
      const history = await api.history();
      for (const row of history.slice(1)) if (row[0]) organisations.add(row[0].trim().toLowerCase());
      for (const c of inputs) {
        if (seen.has(c.recipient) || ledger.blocked(c.recipient) || organisations.has(c.organisation.toLowerCase())) throw Error('Duplicate or suppressed contact; import cancelled');
        seen.add(c.recipient); organisations.add(c.organisation.toLowerCase());
      }
      const contacts = inputs.map(newContact);
      if (values.apply) await api.append(contacts.map(contactRow));
      console.log(JSON.stringify({ applied: !!values.apply, contacts }, null, 2));
    } else if (command === 'prepare') {
      const batch = await prepare(api, ledger, values.ids?.split(',').filter(Boolean) || []);
      const hash = saveBatch(home, batch);
      console.log(JSON.stringify({ batch: hash, approved: false, ...batch }, null, 2));
    } else if (command === 'approve' || command === 'send') {
      const hash = required('batch');
      const batch = loadBatch(home, hash);
      checkBatch(batch, api.config);
      if (command === 'approve') {
        ledger.approve(batch);
        console.log('Exact batch approved. Nothing sent. Use send --batch SHA256 to review, then add --execute explicitly.');
      } else if (!values.execute) console.log(JSON.stringify({ batch: hash, approved: ledger.approved(hash), ...batch }, null, 2));
      else console.log(JSON.stringify(await sendBatch(api, ledger, batch), null, 2));
    } else if (command === 'sync') {
      const queue = readQueue(await api.queue());
      const results = [];
      for (const a of ledger.attempts()) {
        if (a.state !== 'sent') { results.push({ contactId: a.contact_id, state: 'uncertain; manual Sent Mail inspection required; never resend automatically' }); continue; }
        const contact = queue.find(c => c.id === a.contact_id);
        if (!contact || !a.thread_id) throw Error('Sent contact missing from queue; manual tracker repair required');
        const status = await api.conversationStatus(a.thread_id);
        await api.record(contact, a, status);
        results.push({ contactId: contact.id, status });
      }
      console.log(JSON.stringify(results, null, 2));
    }
  } finally { ledger.close(); }
}

main().catch(error => {
  // Never print Google response bodies, tokens, consent codes or full stack traces.
  console.error(error instanceof z.ZodError ? 'Invalid input or Google response; check the documented schema. No automatic retry.' : error instanceof Error ? error.message : 'Operation failed; no automatic retry');
  process.exitCode = 1;
});
