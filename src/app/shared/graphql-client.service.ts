import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

@Injectable({
  providedIn: 'root',
})
export class GraphqlClientService {
  private _client = generateClient<Schema>();

  get client() {
    return this._client;
  }

  switchToGuestMode(): void {
    this._client = generateClient<Schema>({
      authMode: 'apiKey',
    });
  }

  switchToUserMode(): void {
    this._client = generateClient<Schema>({
      authMode: 'userPool',
    });
  }
}
