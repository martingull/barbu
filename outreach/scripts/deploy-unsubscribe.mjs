import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { privateHome, writePrivate } from '../src/store.ts';
import { OptOutClient } from '../src/optOut.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw Error('Only --apply is supported. Use AWS_PROFILE to select the operator profile.');
const apply = args.includes('--apply');
const profile = process.env.AWS_PROFILE || 'robotnic';
const region = 'us-east-1';
const output = join(root, 'outreach/.build/unsubscribe');
mkdirSync(output, { recursive: true });
await build({ entryPoints: [join(root, 'outreach/src/unsubscribe/aws.ts')], outfile: join(output, 'handler.js'), bundle: true, platform: 'node', target: 'node22', format: 'cjs', sourcemap: false });
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw Error(`${command} failed. Inspect the AWS stack events; no automatic deployment retry. Credentials and response bodies were not logged.`);
  return result.stdout;
}
run('zip', ['-j', '-q', join(output, 'function.zip'), join(output, 'handler.js')]);
if (!apply) {
  console.log('Built private Lambda package. Preview only: create/update the two Barbu outreach CloudFormation stacks, with a private artifact bucket, retained DynamoDB suppression store, operator secret and Lambda URL. New usage-based AWS charges apply. No email, DNS, website distribution or store release changes. Use --apply to deploy.');
  process.exit(0);
}
const aws = (...args) => run('aws', ['--profile', profile, '--region', region, ...args]);
const outputs = name => Object.fromEntries(JSON.parse(aws('cloudformation', 'describe-stacks', '--stack-name', name, '--query', 'Stacks[0].Outputs', '--output', 'json')).map(row => [row.OutputKey, row.OutputValue]));
const before = new Date().toISOString();
aws('cloudformation', 'deploy', '--stack-name', 'barbu-outreach-artifacts', '--template-file', join(root, 'outreach/infra/artifacts.json'), '--no-fail-on-empty-changeset');
const { Bucket } = outputs('barbu-outreach-artifacts');
const zip = join(output, 'function.zip');
const sha256 = createHash('sha256').update(readFileSync(zip)).digest('hex');
const key = `unsubscribe/${sha256}.zip`;
aws('s3', 'cp', zip, `s3://${Bucket}/${key}`, '--only-show-errors');
aws('cloudformation', 'deploy', '--stack-name', 'barbu-outreach-unsubscribe', '--template-file', join(root, 'outreach/infra/unsubscribe.json'), '--parameter-overrides', `CodeBucket=${Bucket}`, `CodeKey=${key}`, '--capabilities', 'CAPABILITY_IAM', '--no-fail-on-empty-changeset');
const deployed = outputs('barbu-outreach-unsubscribe');
const adminKey = JSON.parse(aws('secretsmanager', 'get-secret-value', '--secret-id', deployed.SecretArn, '--output', 'json')).SecretString;
const config = { apiUrl: deployed.ApiUrl, pageUrl: 'https://siliciumveritas.com/unsubscribe.html', adminKey };
const client = new OptOutClient(config);
// A synthetic reference checks operator access without registering any real lead.
await client.request('/check', { recipientHash: createHash('sha256').update('deployment-check@example.invalid').digest('hex') });
const home = privateHome();
writePrivate(join(home, 'unsubscribe.json'), config);
writePrivate(join(home, 'unsubscribe-deployment.json'), { before, deployedAt: new Date().toISOString(), apiUrl: deployed.ApiUrl, tableName: deployed.TableName, packageSha256: sha256 });
writeFileSync(join(root, 'website/public/unsubscribe-config.json'), JSON.stringify({ apiUrl: deployed.ApiUrl }, null, 2) + '\n');
console.log(JSON.stringify({ deployed: true, apiUrl: deployed.ApiUrl, packageSha256: sha256, operatorCredential: 'Saved privately outside Git; not printed', websitePublication: 'Still required: task website:test, then task website:deploy', emailsSent: 0 }, null, 2));
