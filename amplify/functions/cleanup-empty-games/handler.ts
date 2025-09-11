import type { Schema } from '../../data/resource.js';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';

Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT!,
        region: process.env.AWS_REGION!,
        defaultAuthMode: 'iam',
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            sessionToken: process.env.AWS_SESSION_TOKEN!,
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