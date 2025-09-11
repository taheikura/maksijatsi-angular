import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { type Schema } from "../../data/resource";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";

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

export const handler: PostConfirmationTriggerHandler = async (event) => {
  try {
    console.log('Creating user profile for:', event.userName);
    
    const result = await client.models.User.create({
      name: event.request.userAttributes.nickname ?? event.userName,
      profileOwner: `${event.request.userAttributes.sub}::${event.userName}`,
    });
    
    console.log('User profile created:', result);
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }

  return event;
};
