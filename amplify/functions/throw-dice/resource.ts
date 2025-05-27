import { defineFunction } from '@aws-amplify/backend';

export const throwDice = defineFunction({
  // optionally specify a name for the Function (defaults to directory name)
  name: 'throw-dice',
  // optionally specify a path to your handler (defaults to "./handler.ts")
  entry: './handler.ts'
});
