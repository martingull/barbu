import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { batchSchema, digest, type Batch } from './model.ts';

export function privateHome(path = process.env.BARBU_OUTREACH_HOME || join(homedir(), '.local/share/barbu-outreach')): string {
  const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
  const absolute = resolve(path);
  let parent = absolute;
  while (!existsSync(parent)) parent = dirname(parent);
  const actual = resolve(realpathSync(parent), relative(parent, absolute));
  for (const candidate of [absolute, actual]) {
    const rel = relative(root, candidate);
    if (!rel || (!rel.startsWith('../') && !isAbsolute(rel))) throw Error('Outreach data must be outside the public repository');
  }
  if (existsSync(absolute) && lstatSync(absolute).isSymbolicLink()) throw Error('Private data directory cannot be a symbolic link');
  mkdirSync(absolute, { recursive: true, mode: 0o700 });
  const info = lstatSync(absolute);
  if (!info.isDirectory() || (info.mode & 0o077) || (process.getuid && info.uid !== process.getuid())) throw Error('Use an owner-only private directory (mode 700); permissions were not changed');
  return absolute;
}

export function writePrivate(path: string, data: unknown): void {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw Error('Refusing symbolic-link credential or record');
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600, flush: true });
  renameSync(temporary, path);
}

export function readPrivate(path: string): unknown {
  const info = lstatSync(path);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077)) throw Error('Private file must be a regular file accessible only by its owner (chmod 600)');
  return readInputJson(path);
}

export function readInputJson(path: string): unknown {
  let data: string;
  try { data = readFileSync(path, 'utf8'); }
  catch { throw Error('Cannot read the requested private JSON file; check its path and permissions'); }
  try { return JSON.parse(data); }
  catch { throw Error('Invalid private JSON file; its contents were not logged'); }
}

export type Attempt = { recipient: string; contact_id: string; batch: string; day: string; message_id: string; state: string; gmail_id: string | null; thread_id: string | null; sent_at: string | null };
export class Ledger {
  db: DatabaseSync;
  constructor(home: string) {
    const path = join(home, 'ledger.sqlite');
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw Error('Ledger cannot be a symbolic link');
    this.db = new DatabaseSync(path);
    chmodSync(path, 0o600);
    this.db.exec(`PRAGMA busy_timeout=3000; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS approvals (hash TEXT PRIMARY KEY, approved_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS attempts (recipient TEXT PRIMARY KEY, contact_id TEXT NOT NULL, batch TEXT NOT NULL,
        day TEXT NOT NULL, message_id TEXT UNIQUE NOT NULL, state TEXT NOT NULL,
        gmail_id TEXT, thread_id TEXT, sent_at TEXT);
      CREATE TABLE IF NOT EXISTS suppression (recipient TEXT PRIMARY KEY, reason TEXT NOT NULL);`);
  }
  close() { this.db.close(); }
  approved(hash: string) { return !!this.db.prepare('SELECT hash FROM approvals WHERE hash=?').get(hash); }
  approve(batch: Batch) {
    this.db.prepare('INSERT OR IGNORE INTO approvals VALUES (?,?)').run(digest(batch), new Date().toISOString());
  }
  attempts(): Attempt[] { return this.db.prepare('SELECT * FROM attempts ORDER BY rowid').all() as Attempt[]; }
  blocked(recipient: string) {
    return !!this.db.prepare('SELECT recipient FROM attempts WHERE recipient=? UNION SELECT recipient FROM suppression WHERE recipient=?').get(recipient, recipient);
  }
  suppress(recipient: string, reason: string) { this.db.prepare('INSERT OR REPLACE INTO suppression VALUES (?,?)').run(recipient, reason); }
  reserve(c: { recipient: string; id: string }, hash: string, day: string, limit: number, sender: string, historicalCount = 0): string {
    if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw Error('Daily limit must be between 1 and 10');
    if (!Number.isInteger(historicalCount) || historicalCount < 0) throw Error('Invalid historical send count');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (!this.approved(hash)) throw Error('Batch is not approved');
      if (this.blocked(c.recipient)) throw Error('Recipient already attempted or suppressed');
      const n = this.db.prepare('SELECT count(*) AS n FROM attempts WHERE day=?').get(day) as { n: number };
      if (n.n + historicalCount >= limit) throw Error('Daily send-attempt limit reached');
      const id = `<${randomUUID()}@${sender.split('@')[1]}>`;
      this.db.prepare("INSERT INTO attempts (recipient,contact_id,batch,day,message_id,state) VALUES (?,?,?,?,?,'sending')").run(c.recipient, c.id, hash, day, id);
      this.db.exec('COMMIT');
      return id;
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  sent(recipient: string, id: string, thread: string, date: string) {
    this.db.prepare("UPDATE attempts SET state='sent',gmail_id=?,thread_id=?,sent_at=? WHERE recipient=?").run(id, thread, date, recipient);
  }
  uncertain(recipient: string) { this.db.prepare("UPDATE attempts SET state='uncertain' WHERE recipient=? AND state='sending'").run(recipient); }
}

export function saveBatch(home: string, batch: Batch): string {
  const hash = digest(batch);
  writePrivate(join(home, `${hash}.json`), batch);
  return hash;
}
export function loadBatch(home: string, hash: string): Batch {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw Error('Use the full batch SHA-256 from preview');
  const batch = batchSchema.parse(readPrivate(join(home, `${hash}.json`)));
  if (digest(batch) !== hash) throw Error('Batch content no longer matches its digest');
  return batch;
}
