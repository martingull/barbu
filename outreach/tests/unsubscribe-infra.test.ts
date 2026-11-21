import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const service = JSON.parse(readFileSync(new URL('../infra/unsubscribe.json', import.meta.url), 'utf8'));
const artifacts = JSON.parse(readFileSync(new URL('../infra/artifacts.json', import.meta.url), 'utf8'));

test('unsubscribe storage is retained and protected across deployments', () => {
  const table = service.Resources.OptOuts;
  assert.equal(table.DeletionPolicy, 'Retain');
  assert.equal(table.UpdateReplacePolicy, 'Retain');
  assert.equal(table.Properties.DeletionProtectionEnabled, true);
  assert.equal(table.Properties.PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled, true);
  assert.equal(service.Resources.OperatorSecret.DeletionPolicy, 'Retain');
  assert.equal(artifacts.Resources.Artifacts.Properties.PublicAccessBlockConfiguration.BlockPublicPolicy, true);
});

test('public API is POST-only with restricted browser origins and scoped execution permissions', () => {
  const { Resources: r } = service;
  assert.deepEqual(r.Url.Properties.Cors.AllowMethods, ['POST']);
  assert.deepEqual(r.Url.Properties.Cors.AllowOrigins, ['https://siliciumveritas.com', 'https://www.siliciumveritas.com']);
  assert.equal(r.InvokePermission.Properties.InvokedViaFunctionUrl, true);
  assert.equal(r.UrlPermission.Properties.FunctionUrlAuthType, 'NONE');
  assert.equal(r.Function.Properties.ReservedConcurrentExecutions, 2);
  const statements = r.Role.Properties.Policies[0].PolicyDocument.Statement;
  for (const statement of statements) {
    assert.notEqual(statement.Resource, '*');
    assert.equal(JSON.stringify(statement.Action).includes('gmail'), false);
    assert.equal(JSON.stringify(statement.Action).includes('Delete'), false);
  }
});
