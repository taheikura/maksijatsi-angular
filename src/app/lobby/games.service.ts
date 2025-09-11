import { Injectable, inject } from '@angular/core';
import { GraphqlClientService } from '../shared/graphql-client.service';

@Injectable({
  providedIn: 'root',
})
export class GamesService {
  private readonly graphqlClient = inject(GraphqlClientService);

  findGames(filter?: unknown, limit = 10, nextToken?: string) {
    if (filter && typeof filter === 'object') {
      return this.graphqlClient.client.models['Game']['list']({
        filter: filter as Record<string, unknown>,
        limit,
        nextToken,
      });
    }

    return this.graphqlClient.client.models['Game']['list']({
      limit,
      nextToken,
    });
  }
}
