import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

@Injectable({
  providedIn: 'root',
})
export class GamesService {
  findGames(filter?: Schema['Game']['type']['filter'], limit = 10, nextToken?: string) {
    return client.models['Game']['list']({
      filter,
      limit,
      nextToken,
    });
  }
}
