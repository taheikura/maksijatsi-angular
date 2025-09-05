import { defineFunction } from '@aws-amplify/backend';

export const cleanupEmptyGames = defineFunction({
  name: 'cleanup-empty-games',
});