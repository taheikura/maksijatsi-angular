import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

@Injectable({
  providedIn: 'root',
})
export class GamesService {
  findGames(filter?: unknown, limit = 10, nextToken?: string) {
    if (filter && typeof filter === 'object') {
      return client.models['Game']['list']({
        filter: filter as Record<string, unknown>,
        limit,
        nextToken,
      });
    }

    return client.models['Game']['list']({
      limit,
      nextToken,
    });
  }
}
