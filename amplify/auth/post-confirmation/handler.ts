import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { type Schema } from "../../data/resource";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";

Amplify.configure({
  API: {
    GraphQL: {
      endpoint: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT!,
      region: process.env.AWS_REGION!,
      defaultAuthMode: 'iam',
    },
  },
});

const client = generateClient<Schema>({
  authMode: 'iam',
});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  await client.models.User.create({
    name: event.request.userAttributes.nickname,
    profileOwner: `${event.request.userAttributes.sub}::${event.userName}`,
  });

  return event;
};
