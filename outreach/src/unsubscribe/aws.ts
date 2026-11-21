import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { createHandler, type OptOutStore } from './handler.ts';

const db = new DynamoDBClient({ maxAttempts: 1 });
const secrets = new SecretsManagerClient({ maxAttempts: 1 });
const TableName = process.env.TABLE_NAME!;
const key = (pk: string) => ({ pk: { S: pk } });
const store: OptOutStore = {
  async register(tokenHash, recipientHash) {
    await db.send(new PutItemCommand({ TableName, Item: { ...key(`token#${tokenHash}`), recipientHash: { S: recipientHash } }, ConditionExpression: 'attribute_not_exists(pk)' }));
  },
  async recipientFor(tokenHash) {
    const result = await db.send(new GetItemCommand({ TableName, Key: key(`token#${tokenHash}`), ConsistentRead: true }));
    return result.Item?.recipientHash?.S;
  },
  async blocked(recipientHash) {
    const result = await db.send(new GetItemCommand({ TableName, Key: key(`blocked#${recipientHash}`), ConsistentRead: true }));
    return !!result.Item;
  },
  async suppress(recipientHash) {
    await db.send(new UpdateItemCommand({ TableName, Key: key(`blocked#${recipientHash}`),
      UpdateExpression: 'SET optedOutAt = if_not_exists(optedOutAt, :now)', ExpressionAttributeValues: { ':now': { S: new Date().toISOString() } } }));
  },
};
let operatorSecret: string | undefined;
export const handler = createHandler(store, async () => {
  if (!operatorSecret) {
    const result = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.ADMIN_SECRET_ARN! }));
    if (!result.SecretString) throw Error('Missing operator credential');
    operatorSecret = result.SecretString;
  }
  return operatorSecret;
});
