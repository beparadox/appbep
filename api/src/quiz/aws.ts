/**
 * The real QuizDeps: DynamoDB for counts and voter markers, SSM for the hashing key.
 *
 * Table layout (same table as everything else):
 *   pk QUIZ#<quiz>#<id>   sk TALLY            c0..c4 counters
 *   pk QUIZ#<quiz>#<id>   sk VOTER#<hash>     ttl (deleted after VOTER_TTL_SECONDS)
 *
 * <hash> is HMAC-SHA256(key, ip|quiz|id): it can't be turned back into an IP without the key,
 * and the same visitor gets unrelated hashes on different questions. The key is the
 * SecureString parameter named by HASH_KEY_PARAM (docs/tutorials/schportz-setup.md).
 */
import { createHmac } from 'node:crypto';
import { DynamoDBClient, TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { GetParameterCommand, ParameterNotFound, SSMClient } from '@aws-sdk/client-ssm';
import { CHOICES, VOTER_TTL_SECONDS } from './contract';
import { isQuestion } from './questions';
import type { QuizDeps } from './service';

const KEY_TTL_MS = 5 * 60 * 1000;

export interface QuizEnv {
  TABLE_NAME?: string;
  HASH_KEY_PARAM?: string;
}

export function createQuizDeps(env: QuizEnv): QuizDeps {
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const ssm = new SSMClient({});
  const table = env.TABLE_NAME ?? '';
  const pk = (quiz: string, id: string) => `QUIZ#${quiz}#${id}`;

  let cached: { key: string | null; at: number } | null = null;
  async function hashKey(): Promise<string | null> {
    if (cached && Date.now() - cached.at < KEY_TTL_MS) return cached.key;
    let key: string | null = null;
    if (env.HASH_KEY_PARAM) {
      try {
        const res = await ssm.send(
          new GetParameterCommand({ Name: env.HASH_KEY_PARAM, WithDecryption: true }),
        );
        key = res.Parameter?.Value || null;
      } catch (err) {
        if (!(err instanceof ParameterNotFound)) throw err;
      }
    }
    cached = { key, at: Date.now() };
    return key;
  }

  return {
    isQuestion,

    voterKey: async (ip, quiz, id) => {
      const key = await hashKey();
      return key ? createHmac('sha256', key).update(`${ip}|${quiz}|${id}`).digest('hex') : null;
    },

    store: {
      counts: async (quiz, id) => {
        const res = await db.send(
          new GetCommand({ TableName: table, Key: { pk: pk(quiz, id), sk: 'TALLY' } }),
        );
        return Array.from({ length: CHOICES }, (_, i) => Number(res.Item?.[`c${i}`] ?? 0));
      },

      vote: async (quiz, id, voter, choice) => {
        try {
          await db.send(
            new TransactWriteCommand({
              TransactItems: [
                {
                  Put: {
                    TableName: table,
                    Item: {
                      pk: pk(quiz, id),
                      sk: `VOTER#${voter}`,
                      ttl: Math.floor(Date.now() / 1000) + VOTER_TTL_SECONDS,
                    },
                    ConditionExpression: 'attribute_not_exists(pk)',
                  },
                },
                {
                  Update: {
                    TableName: table,
                    Key: { pk: pk(quiz, id), sk: 'TALLY' },
                    UpdateExpression: 'ADD #c :one',
                    ExpressionAttributeNames: { '#c': `c${choice}` },
                    ExpressionAttributeValues: { ':one': 1 },
                  },
                },
              ],
            }),
          );
          return true;
        } catch (err) {
          const reasons =
            err instanceof TransactionCanceledException ? err.CancellationReasons : undefined;
          if (reasons?.[0]?.Code === 'ConditionalCheckFailed') return false;
          throw err;
        }
      },
    },
  };
}
