import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, lstatSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { privateHome, readInputJson, readPrivate, writePrivate } from '../src/store.ts';

test('private state cannot be placed in the public repository', () => {
  assert.throws(() => privateHome(fileURLToPath(new URL('../state', import.meta.url))), /outside the public repository/);
});

test('records have owner-only permissions and reject symlinks or exposed credentials', t => {
  const home = mkdtempSync(join(tmpdir(), 'barbu-outreach-private-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  privateHome(home);
  const path = join(home, 'record.json');
  writePrivate(path, { safe: true });
  assert.equal(lstatSync(path).mode & 0o777, 0o600);
  assert.deepEqual(readPrivate(path), { safe: true });
  chmodSync(path, 0o644);
  assert.throws(() => readPrivate(path), /only by its owner/);
  const link = join(home, 'link.json');
  symlinkSync(path, link);
  assert.throws(() => writePrivate(link, { unsafe: true }), /symbolic-link/);
  assert.match(readFileSync(path, 'utf8'), /safe/);
});

test('existing non-private directories are rejected without changing permissions', t => {
  const path = mkdtempSync(join(tmpdir(), 'barbu-outreach-public-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  chmodSync(path, 0o755);
  assert.throws(() => privateHome(path), /permissions were not changed/);
  assert.equal(lstatSync(path).mode & 0o777, 0o755);
});

test('invalid private JSON never exposes its contents through parser errors', t => {
  const home = mkdtempSync(join(tmpdir(), 'barbu-outreach-invalid-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const path = join(home, 'invalid.json');
  writeFileSync(path, 'a-private-secret-not-to-print');
  assert.throws(() => readInputJson(path), { message: 'Invalid private JSON file; its contents were not logged' });
});
