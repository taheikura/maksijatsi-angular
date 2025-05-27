import { defineFunction } from '@aws-amplify/backend';

export const endTurn = defineFunction({
  // optionally specify a name for the Function (defaults to directory name)
  name: 'end-turn',
  // optionally specify a path to your handler (defaults to "./handler.ts")
  entry: './handler.ts'
});
