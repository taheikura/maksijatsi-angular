import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource.js';

const endpoint = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const sessionToken = process.env.AWS_SESSION_TOKEN;

if (!endpoint || !region || !accessKeyId || !secretAccessKey || !sessionToken) {
  throw new Error('Missing required environment variables');
}

Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint,
        region,
        defaultAuthMode: 'iam',
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId,
            secretAccessKey,
            sessionToken,
          },
        }),
        clearCredentialsAndIdentityId: () => {},
      },
    },
  }
);

const client = generateClient<Schema>({
  authMode: 'iam',
});

export const handler: Schema['cleanupEmptyGames']['functionHandler'] = async (event) => {
  const { gameId } = event.arguments;

  try {
    const usersResult = await client.models.User.list({
      filter: { gameId: { eq: gameId } },
    });

    if (!usersResult.data || usersResult.data.length === 0) {
      await client.models.Game.delete({ id: gameId });
      return { deleted: true, gameId };
    }

    return { deleted: false, gameId, playerCount: usersResult.data.length };
  } catch (error) {
    console.error('Error cleaning up game:', error);
    throw error;
  }
};
