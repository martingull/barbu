import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { sourceFingerprint } from './google-play.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const release = path.join(root, 'release/google-play');
const javaHome = process.env.JAVA_HOME || '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home';
const tool = process.env.BUNDLETOOL_JAR || '/private/tmp/bundletool-all-1.18.1.jar';
const ndkHome = process.env.NDK_HOME || path.join(process.env.HOME, 'Library/Android/sdk/ndk/26.1.10909125');
const readelf = path.join(ndkHome, 'toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-readelf');
const input = path.join(root, 'src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab');
const config = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const version = config.version;
const versionCode = config.bundle.android.versionCode;
const suffix = `v${version}-code${versionCode}`;
const bundle = path.join(release, `barbu-google-play-${suffix}.aab`);
assert(process.argv[2] && process.argv[3], 'Usage: verify-google-play.mjs PREVIOUS_AAB SOURCE_FINGERPRINT_FILE');
const previous = path.resolve(process.argv[2]);
const sourceDigest = fs.readFileSync(process.argv[3], 'utf8').trim();
assert.equal(sourceFingerprint(), sourceDigest, 'Production source changed during build. Rebuild before signing.');
const tmp = fs.mkdtempSync('/private/tmp/barbu-verify-');
const java = name => path.join(javaHome, 'bin', name);
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options });
  assert.equal(result.status, 0, `${command} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
};
const hash = value => createHash('sha256').update(value).digest('hex');
const fileHash = name => hash(fs.readFileSync(name));
const manifest = (file, xpath) => run(java('java'), ['-jar', tool, 'dump', 'manifest', `--bundle=${file}`, `--xpath=${xpath}`]).trim();
assert.equal(manifest(input, '/manifest/@android:versionCode'), String(versionCode));
assert.equal(manifest(input, '/manifest/@android:versionName'), version);
assert.equal(manifest(input, '/manifest/@package'), 'com.martin.barbu');
assert.equal(manifest(input, '/manifest/uses-sdk/@android:targetSdkVersion'), '36');
assert(!fs.existsSync(bundle), 'Refusing to overwrite an existing release bundle');
const credentials = parseEnv(fs.readFileSync(path.join(release, 'barbu-upload-keystore-password.txt'), 'utf8'));
assert(credentials.password && credentials.alias, 'Missing signing configuration');
if (!fs.existsSync(bundle)) run(java('jarsigner'), ['-keystore', path.join(release, 'barbu-upload-keystore.jks'),
  '-storepass:env', 'BARBU_UPLOAD_PASSWORD', '-keypass:env', 'BARBU_UPLOAD_PASSWORD',
  '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256', '-signedjar', bundle, input, credentials.alias],
  { env: { ...process.env, BARBU_UPLOAD_PASSWORD: credentials.password } });
const signature = run(java('jarsigner'), ['-verify', bundle]);
assert(signature.includes('jar verified.'), 'Bundle signature verification failed');
fs.writeFileSync(path.join(release, `signature-verification-${suffix}.txt`), signature);
const certificate = file => {
  const text = run(java('keytool'), ['-printcert', '-jarfile', file]);
  const fingerprint = text.match(/SHA256:\s*([A-F0-9:]+)/)?.[1];
  assert(fingerprint, 'Missing signer fingerprint');
  return fingerprint;
};
const fingerprint = certificate(bundle);
assert.equal(fingerprint, certificate(previous));
run(java('java'), ['-jar', tool, 'validate', `--bundle=${bundle}`]);
const bundleConfig = JSON.parse(run(java('java'), ['-jar', tool, 'dump', 'config', `--bundle=${bundle}`]));
assert.equal(bundleConfig.optimizations.uncompressNativeLibraries.alignment, 'PAGE_ALIGNMENT_16K');
const entries = run('unzip', ['-Z1', bundle]).trim().split('\n');
const libraries = entries.filter(entry => /^base\/lib\/[^/]+\/[^/]+\.so$/.test(entry));
assert.equal(libraries.length, 4);
const symbolsRoot = path.join(tmp, 'symbols');
fs.mkdirSync(symbolsRoot);
const nativeLibraries = [];
for (const entry of libraries) {
  const [, , abi, name] = entry.split('/');
  const debugEntry = `BUNDLE-METADATA/com.android.tools.build.debugsymbols/${abi}/${name}.dbg`;
  assert(entries.includes(debugEntry), `Missing symbols for ${abi}`);
  const libFile = path.join(tmp, `${abi}-${name}`);
  const debugDir = path.join(symbolsRoot, abi);
  fs.mkdirSync(debugDir);
  const debugFile = path.join(debugDir, `${name}.dbg`);
  fs.writeFileSync(libFile, run('unzip', ['-p', bundle, entry], { encoding: null, maxBuffer: 128 * 1024 * 1024 }));
  fs.writeFileSync(debugFile, run('unzip', ['-p', bundle, debugEntry], { encoding: null, maxBuffer: 128 * 1024 * 1024 }));
  const buildId = file => run(readelf, ['-n', file]).match(/Build ID:\s*(\w+)/)?.[1];
  const id = buildId(libFile);
  assert(id, `Missing build ID for ${abi}`);
  assert.equal(id, buildId(debugFile));
  assert(!run(readelf, ['-SW', libFile]).includes('.debug_info'), `${abi} is not stripped`);
  assert(run(readelf, ['-SW', debugFile]).includes('.debug_info'), `${abi} lacks full symbols`);
  const headers = run(readelf, ['-lW', libFile]);
  const loads = headers.split('\n').filter(line => /^\s*LOAD\s/.test(line));
  assert(loads.length > 0);
  const alignment16k = loads.every(line => Number(line.trim().split(/\s+/).at(-1)) >= 16384);
  assert(alignment16k, `${abi} LOAD alignment is below 16 KB`);
  const relro = headers.split('\n').find(line => /^\s*GNU_RELRO\s/.test(line));
  assert(relro, `${abi} missing RELRO`);
  const fields = relro.trim().split(/\s+/);
  const relroEnd16k = (Number(fields[2]) + Number(fields[5])) % 16384 === 0;
  assert(relroEnd16k, `${abi} RELRO end is not 16 KB aligned`);
  nativeLibraries.push({ abi, buildId: id, libraryBytes: fs.statSync(libFile).size,
    debugBytes: fs.statSync(debugFile).size, alignment16k, relroEnd16k, stripped: true });
}
const symbols = path.join(release, `native-debug-symbols-${suffix}.zip`);
assert(!fs.existsSync(symbols), 'Refusing to overwrite symbols');
run('zip', ['-qr', symbols, '.'], { cwd: symbolsRoot });
const mappingEntry = 'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map';
assert(entries.includes(mappingEntry));
const mapping = path.join(release, `mapping-${suffix}.txt`);
const mappingBytes = run('unzip', ['-p', bundle, mappingEntry], { encoding: null });
assert(mappingBytes.equals(fs.readFileSync('src-tauri/gen/android/app/build/outputs/mapping/universalRelease/mapping.txt')));
fs.writeFileSync(mapping, mappingBytes);
const record = {
  verifiedAt: new Date().toISOString(), bundle, sha256: fileHash(bundle), bytes: fs.statSync(bundle).size,
  package: manifest(bundle, '/manifest/@package'), versionName: version, versionCode,
  minSdk: Number(manifest(bundle, '/manifest/uses-sdk/@android:minSdkVersion')), targetSdk: 36,
  sourceCommit: run('git', ['rev-parse', 'HEAD']).trim(),
  sourceFingerprint: sourceDigest,
  sourceWorkingTree: run('git', ['status', '--short']), sourceDiffSha256: hash(run('git', ['diff', '--binary'])),
  sourceInputs: Object.fromEntries(['package-lock.json', 'Cargo.lock', 'src-tauri/tauri.conf.json',
    'src-tauri/android/MainActivity.kt', 'src-tauri/gen/android/app/build.gradle.kts', 'dist/index.html']
    .map(file => [file, fileHash(file)])),
  uploadCertificateSha256: fingerprint, signatureVerified: true, bundletoolVersion: '1.18.1',
  bundletoolValidation: true, matchingR8Mapping: true, symbolsSha256: fileHash(symbols),
  mappingSha256: fileHash(mapping), nativeLibraries,
  bundleNativeAlignment: bundleConfig.optimizations.uncompressNativeLibraries.alignment,
  checks: { automatedTests: 'See release runbook; this command verifies packaging only.',
    physicalDeviceSmoke: false, playSignedUpgradeTest: false, runtime16kTest: false },
  uploaded: false, productionPublished: false, releaseGate: 'TESTING ONLY: physical-device Play upgrade and pre-launch report pending'
};
fs.writeFileSync(path.join(release, `verification-${suffix}.json`), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
